import { prisma } from "@/lib/prisma"
import { generateIdempotencyKey } from "@/lib/utils"
import { createAuditLog, AuditActions } from "@/lib/audit"
import { AppointmentStatus } from "@/generated/prisma"

interface BookingInput {
  patientId: string
  dentistId: string
  serviceId: string
  startTime: Date
  endTime: Date
  notes?: string
  idempotencyKey?: string
}

interface BookingResult {
  appointment: {
    id: string
    patientId: string
    dentistId: string
    serviceId: string
    startTime: Date
    endTime: Date
    status: AppointmentStatus
    idempotencyKey: string
  }
  created: boolean
}

export async function createBooking(input: BookingInput, userId: string): Promise<BookingResult> {
  const idempotencyKey = input.idempotencyKey || generateIdempotencyKey()

  const existing = await prisma.appointment.findUnique({
    where: { idempotencyKey },
  })

  if (existing) {
    return { appointment: existing, created: false }
  }

  const result = await prisma.$transaction(
    async (tx) => {
      const lockKey = `${input.dentistId}:${input.startTime.toISOString().split("T")[0]}`
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`

      const conflict = await tx.appointment.findFirst({
        where: {
          dentistId: input.dentistId,
          status: { notIn: ["CANCELLED", "NO_SHOW", "RESCHEDULED"] },
          startTime: { lt: input.endTime },
          endTime: { gt: input.startTime },
        },
      })

      if (conflict) {
        throw new Error("APPOINTMENT_SLOT_UNAVAILABLE")
      }

      const appointment = await tx.appointment.create({
        data: {
          patientId: input.patientId,
          dentistId: input.dentistId,
          serviceId: input.serviceId,
          startTime: input.startTime,
          endTime: input.endTime,
          notes: input.notes,
          status: "PENDING",
          idempotencyKey,
        },
      })

      await tx.appointmentStatusHistory.create({
        data: {
          appointmentId: appointment.id,
          fromStatus: null,
          toStatus: "PENDING",
          changedById: userId,
        },
      })

      return appointment
    },
    { isolationLevel: "Serializable" }
  )

  await createAuditLog({
    userId,
    action: AuditActions.APPOINTMENT_CREATE,
    entity: "Appointment",
    entityId: result.id,
    metadata: {
      patientId: input.patientId,
      dentistId: input.dentistId,
      serviceId: input.serviceId,
      startTime: input.startTime,
      endTime: input.endTime,
    },
  })

  return { appointment: result, created: true }
}

interface CancelBookingInput {
  appointmentId: string
  reason: string
  cancelledById: string
}

export async function cancelBooking(input: CancelBookingInput) {
  const appointment = await prisma.appointment.findUnique({
    where: { id: input.appointmentId },
  })

  if (!appointment) {
    throw new Error("APPOINTMENT_NOT_FOUND")
  }

  if (appointment.status === "CANCELLED" || appointment.status === "NO_SHOW" || appointment.status === "RESCHEDULED") {
    throw new Error("APPOINTMENT_ALREADY_CANCELLED")
  }

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.appointment.update({
      where: { id: input.appointmentId },
      data: {
        status: "CANCELLED",
        cancellationReason: input.reason,
        cancelledById: input.cancelledById,
        cancelledAt: new Date(),
      },
    })

    await tx.appointmentStatusHistory.create({
      data: {
        appointmentId: input.appointmentId,
        fromStatus: appointment.status,
        toStatus: "CANCELLED",
        changedById: input.cancelledById,
        note: input.reason,
      },
    })

    return updated
  })

  await createAuditLog({
    userId: input.cancelledById,
    action: AuditActions.APPOINTMENT_CANCEL,
    entity: "Appointment",
    entityId: input.appointmentId,
    metadata: { reason: input.reason },
  })

  return result
}

interface TransitionStatusInput {
  appointmentId: string
  fromStatus: AppointmentStatus
  toStatus: AppointmentStatus
  changedById: string
  note?: string
}

const validTransitions: Record<AppointmentStatus, AppointmentStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED", "RESCHEDULED"],
  CONFIRMED: ["CHECKED_IN", "CANCELLED", "NO_SHOW", "RESCHEDULED"],
  CHECKED_IN: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
  NO_SHOW: [],
  RESCHEDULED: [],
}

export async function transitionAppointmentStatus(input: TransitionStatusInput) {
  const { appointmentId, fromStatus, toStatus, changedById, note } = input

  if (!validTransitions[fromStatus].includes(toStatus)) {
    throw new Error("APPOINTMENT_INVALID_TRANSITION")
  }

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
  })

  if (!appointment) {
    throw new Error("APPOINTMENT_NOT_FOUND")
  }

  if (appointment.status !== fromStatus) {
    throw new Error("APPOINTMENT_INVALID_TRANSITION")
  }

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.appointment.update({
      where: { id: appointmentId },
      data: { status: toStatus },
    })

    await tx.appointmentStatusHistory.create({
      data: {
        appointmentId,
        fromStatus,
        toStatus,
        changedById,
        note,
      },
    })

    return updated
  })

  await createAuditLog({
    userId: changedById,
    action: `appointment.${toStatus.toLowerCase()}`,
    entity: "Appointment",
    entityId: appointmentId,
    metadata: { fromStatus, toStatus, note },
  })

  return result
}

export async function rescheduleAppointment(
  appointmentId: string,
  newStartTime: Date,
  newEndTime: Date,
  newDentistId: string,
  changedById: string
) {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { service: true },
  })

  if (!appointment) {
    throw new Error("APPOINTMENT_NOT_FOUND")
  }

  if (appointment.status === "COMPLETED" || appointment.status === "CANCELLED" || appointment.status === "NO_SHOW") {
    throw new Error("APPOINTMENT_ALREADY_CANCELLED")
  }

  const available = await prisma.$transaction(async (tx) => {
    const lockKey = `${newDentistId}:${newStartTime.toISOString().split("T")[0]}`
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`

    const conflict = await tx.appointment.findFirst({
      where: {
        dentistId: newDentistId,
        status: { notIn: ["CANCELLED", "NO_SHOW", "RESCHEDULED"] },
        startTime: { lt: newEndTime },
        endTime: { gt: newStartTime },
      },
    })

    if (conflict) {
      throw new Error("APPOINTMENT_SLOT_UNAVAILABLE")
    }

    return true
  })

  const newAppointment = await prisma.$transaction(async (tx) => {
    const newAppt = await tx.appointment.create({
      data: {
        patientId: appointment.patientId,
        dentistId: newDentistId,
        serviceId: appointment.serviceId,
        startTime: newStartTime,
        endTime: newEndTime,
        notes: appointment.notes,
        status: "PENDING",
        idempotencyKey: generateIdempotencyKey(),
        rescheduledFromId: appointmentId,
      },
    })

    await tx.appointment.update({
      where: { id: appointmentId },
      data: {
        status: "RESCHEDULED",
        rescheduledToId: newAppt.id,
      },
    })

    await tx.appointmentStatusHistory.create({
      data: {
        appointmentId: appointmentId,
        fromStatus: appointment.status,
        toStatus: "RESCHEDULED",
        changedById,
        note: `Rescheduled to ${newAppt.id}`,
      },
    })

    await tx.appointmentStatusHistory.create({
      data: {
        appointmentId: newAppt.id,
        fromStatus: null,
        toStatus: "PENDING",
        changedById,
        note: `Rescheduled from ${appointmentId}`,
      },
    })

    return newAppt
  })

  await createAuditLog({
    userId: changedById,
    action: AuditActions.APPOINTMENT_RESCHEDULE,
    entity: "Appointment",
    entityId: appointmentId,
    metadata: { newAppointmentId: newAppointment.id, newStartTime, newEndTime, newDentistId },
  })

  return newAppointment
}