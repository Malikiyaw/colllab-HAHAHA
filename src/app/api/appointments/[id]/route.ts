import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { cancelBooking, transitionAppointmentStatus, rescheduleAppointment } from "@/lib/booking"
import { hasPermission, canAccessAppointment } from "@/lib/permissions"
import { AppointmentStatus } from "@/generated/prisma"
import { z } from "zod"

const cancelSchema = z.object({
  reason: z.string().min(1, "Cancellation reason is required"),
})

const rescheduleSchema = z.object({
  newStartTime: z.string().datetime(),
  newEndTime: z.string().datetime(),
  newDentistId: z.string(),
})

const transitionSchema = z.object({
  toStatus: z.nativeEnum(AppointmentStatus),
  note: z.string().optional(),
})

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

async function checkAccess(session: any, appointment: any) {
  if (session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN") return true
  if (session.user.role === "RECEPTIONIST") return true
  if (session.user.role === "DENTIST") return appointment.dentistId === session.user.id
  if (session.user.role === "PATIENT") return appointment.patientId === session.user.id
  return false
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Authentication required" } }, { status: 401 })
    }

    const { id } = await params
    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        patient: { include: { user: true } },
        dentist: { include: { user: true } },
        service: true,
        statusHistory: { orderBy: { createdAt: "asc" } },
      },
    })

    if (!appointment) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Appointment not found" } }, { status: 404 })
    }

    if (!await checkAccess(session, appointment)) {
      return NextResponse.json({ error: { code: "FORBIDDEN", message: "Insufficient permissions" } }, { status: 403 })
    }

    return NextResponse.json(appointment)
  } catch (error) {
    console.error("Get appointment error:", error)
    return NextResponse.json({ error: { code: "INTERNAL_SERVER_ERROR", message: "Failed to fetch appointment" } }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Authentication required" } }, { status: 401 })
    }

    const { id } = await params
    const appointment = await prisma.appointment.findUnique({ where: { id } })
    if (!appointment) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Appointment not found" } }, { status: 404 })
    }

    if (!await checkAccess(session, appointment)) {
      return NextResponse.json({ error: { code: "FORBIDDEN", message: "Insufficient permissions" } }, { status: 403 })
    }

    const body = await request.json()
    const { action, ...data } = body

    switch (action) {
      case "cancel": {
        if (!hasPermission(session.user.role, "appointment:cancel")) {
          return NextResponse.json({ error: { code: "FORBIDDEN", message: "Insufficient permissions" } }, { status: 403 })
        }
        const { reason } = cancelSchema.parse(data)
        await cancelBooking({ appointmentId: id, reason, cancelledById: session.user.id })
        break
      }
      case "confirm": {
        if (!hasPermission(session.user.role, "appointment:confirm")) {
          return NextResponse.json({ error: { code: "FORBIDDEN", message: "Insufficient permissions" } }, { status: 403 })
        }
        await transitionAppointmentStatus({
          appointmentId: id,
          fromStatus: appointment.status,
          toStatus: "CONFIRMED",
          changedById: session.user.id,
        })
        break
      }
      case "check-in": {
        if (!hasPermission(session.user.role, "appointment:checkin")) {
          return NextResponse.json({ error: { code: "FORBIDDEN", message: "Insufficient permissions" } }, { status: 403 })
        }
        await transitionAppointmentStatus({
          appointmentId: id,
          fromStatus: appointment.status,
          toStatus: "CHECKED_IN",
          changedById: session.user.id,
        })
        break
      }
      case "start": {
        if (!hasPermission(session.user.role, "appointment:complete")) {
          return NextResponse.json({ error: { code: "FORBIDDEN", message: "Insufficient permissions" } }, { status: 403 })
        }
        await transitionAppointmentStatus({
          appointmentId: id,
          fromStatus: appointment.status,
          toStatus: "IN_PROGRESS",
          changedById: session.user.id,
        })
        break
      }
      case "complete": {
        if (!hasPermission(session.user.role, "appointment:complete")) {
          return NextResponse.json({ error: { code: "FORBIDDEN", message: "Insufficient permissions" } }, { status: 403 })
        }
        const { note } = transitionSchema.parse(data)
        await transitionAppointmentStatus({
          appointmentId: id,
          fromStatus: appointment.status,
          toStatus: "COMPLETED",
          changedById: session.user.id,
          note,
        })
        break
      }
      case "no-show": {
        if (!hasPermission(session.user.role, "appointment:cancel")) {
          return NextResponse.json({ error: { code: "FORBIDDEN", message: "Insufficient permissions" } }, { status: 403 })
        }
        await transitionAppointmentStatus({
          appointmentId: id,
          fromStatus: appointment.status,
          toStatus: "NO_SHOW",
          changedById: session.user.id,
        })
        break
      }
      case "reschedule": {
        if (!hasPermission(session.user.role, "appointment:reschedule")) {
          return NextResponse.json({ error: { code: "FORBIDDEN", message: "Insufficient permissions" } }, { status: 403 })
        }
        const { newStartTime, newEndTime, newDentistId } = rescheduleSchema.parse(data)
        await rescheduleAppointment(id, new Date(newStartTime), new Date(newEndTime), newDentistId, session.user.id)
        break
      }
      case "status": {
        if (!hasPermission(session.user.role, "appointment:update")) {
          return NextResponse.json({ error: { code: "FORBIDDEN", message: "Insufficient permissions" } }, { status: 403 })
        }
        const { toStatus, note } = transitionSchema.parse(data)
        if (!validTransitions[appointment.status].includes(toStatus)) {
          return NextResponse.json({ error: { code: "APPOINTMENT_INVALID_TRANSITION", message: `Cannot transition from ${appointment.status} to ${toStatus}` } }, { status: 400 })
        }
        await transitionAppointmentStatus({
          appointmentId: id,
          fromStatus: appointment.status,
          toStatus,
          changedById: session.user.id,
          note,
        })
        break
      }
      default:
        return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Invalid action" } }, { status: 400 })
    }

    const updated = await prisma.appointment.findUnique({
      where: { id },
      include: { patient: { include: { user: true } }, dentist: { include: { user: true } }, service: true },
    })

    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: error.issues[0].message } }, { status: 400 })
    }
    if (error instanceof Error) {
      if (error.message === "APPOINTMENT_SLOT_UNAVAILABLE") {
        return NextResponse.json({ error: { code: "APPOINTMENT_SLOT_UNAVAILABLE", message: "The selected time is no longer available" } }, { status: 409 })
      }
      if (error.message === "APPOINTMENT_INVALID_TRANSITION") {
        return NextResponse.json({ error: { code: "APPOINTMENT_INVALID_TRANSITION", message: error.message } }, { status: 400 })
      }
      if (error.message === "APPOINTMENT_NOT_FOUND") {
        return NextResponse.json({ error: { code: "NOT_FOUND", message: "Appointment not found" } }, { status: 404 })
      }
      if (error.message === "APPOINTMENT_ALREADY_CANCELLED") {
        return NextResponse.json({ error: { code: "APPOINTMENT_ALREADY_CANCELLED", message: "Appointment is already cancelled" } }, { status: 400 })
      }
    }
    console.error("Update appointment error:", error)
    return NextResponse.json({ error: { code: "INTERNAL_SERVER_ERROR", message: "Failed to update appointment" } }, { status: 500 })
  }
}