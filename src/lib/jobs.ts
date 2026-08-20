import { PgBoss } from "pg-boss"
import { prisma } from "@/lib/prisma"
import { sendEmail, emailTemplates } from "@/lib/email"
import { createNotification } from "@/lib/notifications"
import { format } from "date-fns"

let boss: PgBoss | null = null

export async function getJobQueue(): Promise<PgBoss> {
  if (!boss) {
    boss = new PgBoss(process.env.DATABASE_URL!)
    await boss.start()
  }
  return boss
}

export async function scheduleAppointmentReminders(appointmentId: string) {
  const boss = await getJobQueue()
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { patient: { include: { user: true } }, dentist: { include: { user: true } }, service: true },
  })

  if (!appointment) return

  const reminderHours = [24, 1]
  const startTime = new Date(appointment.startTime)

  for (const hours of reminderHours) {
    const sendAt = new Date(startTime.getTime() - hours * 60 * 60 * 1000)
    if (sendAt > new Date()) {
      const cronExpr = `${sendAt.getMinutes()} ${sendAt.getHours()} ${sendAt.getDate()} ${sendAt.getMonth() + 1} *`
      await boss.schedule(
        cronExpr,
        "send-appointment-reminder",
        { appointmentId, hoursUntil: hours },
        { retryLimit: 3, retryDelay: 60000 }
      )
    }
  }
}

export async function cancelAppointmentReminders(appointmentId: string) {
  const boss = await getJobQueue()
  // Note: pg-boss cancel API varies by version, skipping for now
  console.log("Cancel reminders for:", appointmentId)
}

export async function processWaitlistNotifications() {
  const boss = await getJobQueue()
  await boss.schedule("*/5 * * * *", "process-waitlist", {})
}

export async function sendDailyScheduleEmails() {
  const boss = await getJobQueue()
  await boss.schedule("0 6 * * *", "send-daily-schedule", {})
}

export async function registerJobHandlers() {
  const boss = await getJobQueue()

  boss.work("send-appointment-reminder", async (job: any) => {
    const { appointmentId, hoursUntil } = job.data as { appointmentId: string; hoursUntil: number }
    await sendAppointmentReminder(appointmentId, hoursUntil)
  })

  boss.work("process-waitlist", async () => {
    await processWaitlist()
  })

  boss.work("send-daily-schedule", async () => {
    await sendDailySchedule()
  })

  console.log("Job handlers registered")
}

async function sendAppointmentReminder(appointmentId: string, hoursUntil: number) {
  try {
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { patient: { include: { user: true } }, dentist: { include: { user: true } }, service: true },
    })

    if (!appointment || appointment.status === "CANCELLED" || appointment.status === "NO_SHOW") {
      return
    }

    const template = emailTemplates.appointmentReminder({
      patientName: appointment.patient.user.name,
      serviceName: appointment.service.name,
      dentistName: appointment.dentist.user.name,
      date: format(appointment.startTime, "MMM d, yyyy"),
      time: format(appointment.startTime, "h:mm a"),
      hoursUntil,
    })

    await sendEmail({
      to: appointment.patient.user.email,
      ...template,
    })

    await createNotification({
      userId: appointment.patient.userId,
      type: "EMAIL",
      subject: template.subject,
      body: template.text,
    })

    console.log(`Sent ${hoursUntil}h reminder for appointment ${appointmentId}`)
  } catch (error) {
    console.error(`Failed to send reminder for ${appointmentId}:`, error)
    throw error
  }
}

async function processWaitlist() {
  try {
    const waitingEntries = await prisma.waitlist.findMany({
      where: { status: "WAITING" },
      include: { patient: { include: { user: true } }, service: true, dentist: { include: { user: true } } },
      orderBy: { createdAt: "asc" },
    })

    for (const entry of waitingEntries) {
      const availableSlots = await findAvailableSlotsForWaitlist(entry)
      if (availableSlots.length > 0) {
        const slot = availableSlots[0]
        await prisma.waitlist.update({
          where: { id: entry.id },
          data: { status: "NOTIFIED" },
        })

        const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000)

        const template = emailTemplates.waitlistAvailable({
          patientName: entry.patient.user.name,
          serviceName: entry.service.name,
          dentistName: entry.dentist?.user.name || "a dentist",
          date: format(slot.startTime, "MMM d, yyyy"),
          time: format(slot.startTime, "h:mm a"),
          expiresAt: format(expiresAt, "MMM d, yyyy h:mm a"),
        })

        await sendEmail({
          to: entry.patient.user.email,
          ...template,
        })

        await createNotification({
          userId: entry.patient.userId,
          type: "EMAIL",
          subject: template.subject,
          body: template.text,
        })

        console.log(`Notified waitlist entry ${entry.id} for slot ${slot.startTime}`)
      }
    }
  } catch (error) {
    console.error("Failed to process waitlist:", error)
  }
}

async function findAvailableSlotsForWaitlist(entry: any) {
  const { getAvailableSlots } = await import("@/lib/availability")
  const today = new Date()
  const slots: any[] = []

  for (let i = 0; i < 14; i++) {
    const date = new Date(today)
    date.setDate(date.getDate() + i)

    if (entry.preferredDate && new Date(entry.preferredDate).toDateString() !== date.toDateString()) {
      continue
    }

    const result = await getAvailableSlots(
      entry.dentistId || (await getFirstAvailableDentist(entry.serviceId)),
      entry.serviceId,
      date
    )

    for (const slot of result.slots) {
      if (slot.available) {
        slots.push(slot)
        if (slots.length >= 1) return slots
      }
    }
  }

  return slots
}

async function getFirstAvailableDentist(serviceId: string) {
  const dentistService = await prisma.dentistService.findFirst({
    where: { serviceId, active: true },
    include: { dentist: true },
  })
  return dentistService?.dentistId || ""
}

async function sendDailySchedule() {
  try {
    const today = new Date()
    const startOfDay = new Date(today.setHours(0, 0, 0, 0))
    const endOfDay = new Date(today.setHours(23, 59, 59, 999))

    const appointments = await prisma.appointment.findMany({
      where: {
        startTime: { gte: startOfDay, lte: endOfDay },
        status: { in: ["CONFIRMED", "CHECKED_IN"] },
      },
      include: { dentist: { include: { user: true } }, patient: { include: { user: true } }, service: true },
    })

    const dentists = await prisma.dentist.findMany({
      where: { active: true },
      include: { user: true },
    })

    for (const dentist of dentists) {
      const dentistAppointments = appointments.filter(a => a.dentistId === dentist.id)
      if (dentistAppointments.length === 0) continue

      const schedule = dentistAppointments.map(a => ({
        time: `${format(a.startTime, "h:mm a")} - ${format(a.endTime, "h:mm a")}`,
        patient: a.patient.user.name,
        service: a.service.name,
      }))

      await createNotification({
        userId: dentist.userId,
        type: "EMAIL",
        subject: `Today's Schedule - ${format(new Date(), "MMM d, yyyy")}`,
        body: `You have ${schedule.length} appointments today:\n\n${schedule.map(s => `${s.time} - ${s.patient} (${s.service})`).join("\n")}`,
      })
    }

    console.log("Daily schedules sent")
  } catch (error) {
    console.error("Failed to send daily schedules:", error)
  }
}

export async function shutdownJobQueue() {
  if (boss) {
    await boss.stop()
    boss = null
  }
}