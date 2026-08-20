import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { hasPermission } from "@/lib/permissions"
import { registerJobHandlers, scheduleAppointmentReminders, cancelAppointmentReminders, processWaitlistNotifications, sendDailyScheduleEmails, getJobQueue } from "@/lib/jobs"
import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user || !hasPermission(session.user.role, "settings:update")) {
      return NextResponse.json({ error: { code: "FORBIDDEN", message: "Insufficient permissions" } }, { status: 403 })
    }

    const body = await request.json()
    const { action } = body

    switch (action) {
      case "register-jobs": {
        await registerJobHandlers()
        return NextResponse.json({ success: true, message: "Job handlers registered" })
      }
      case "schedule-reminders": {
        const { appointmentId } = body
        if (!appointmentId) {
          return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "appointmentId required" } }, { status: 400 })
        }
        await scheduleAppointmentReminders(appointmentId)
        return NextResponse.json({ success: true, message: "Reminders scheduled" })
      }
      case "cancel-reminders": {
        const { appointmentId } = body
        if (!appointmentId) {
          return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "appointmentId required" } }, { status: 400 })
        }
        await cancelAppointmentReminders(appointmentId)
        return NextResponse.json({ success: true, message: "Reminders cancelled" })
      }
      case "process-waitlist": {
        const boss = await getJobQueue()
        await boss.send("process-waitlist", {})
        return NextResponse.json({ success: true, message: "Waitlist processing triggered" })
      }
      case "send-daily-schedules": {
        const boss = await getJobQueue()
        await boss.send("send-daily-schedule", {})
        return NextResponse.json({ success: true, message: "Daily schedules triggered" })
      }
      case "test-email": {
        const { to } = body
        if (!to) {
          return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "to email required" } }, { status: 400 })
        }
        const { sendEmail, emailTemplates } = await import("@/lib/email")
        const { format } = await import("date-fns")
        const template = emailTemplates.appointmentReminder({
          patientName: "Test Patient",
          serviceName: "Dental Cleaning",
          dentistName: "Dr. Santos",
          date: format(new Date(), "MMM d, yyyy"),
          time: format(new Date(), "h:mm a"),
          hoursUntil: 1,
        })
        await sendEmail({ to, ...template })
        return NextResponse.json({ success: true, message: "Test email sent" })
      }
      default:
        return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Invalid action" } }, { status: 400 })
    }
  } catch (error) {
    console.error("Jobs API error:", error)
    return NextResponse.json({ error: { code: "INTERNAL_SERVER_ERROR", message: "Failed to process job action" } }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user || !hasPermission(session.user.role, "settings:read")) {
      return NextResponse.json({ error: { code: "FORBIDDEN", message: "Insufficient permissions" } }, { status: 403 })
    }

    const boss = await getJobQueue()
    const queues = await boss.getQueues()

    return NextResponse.json({ queues })
  } catch (error) {
    console.error("Get jobs error:", error)
    return NextResponse.json({ error: { code: "INTERNAL_SERVER_ERROR", message: "Failed to fetch job status" } }, { status: 500 })
  }
}