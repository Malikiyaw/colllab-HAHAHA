import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { createBooking, cancelBooking, transitionAppointmentStatus, rescheduleAppointment } from "@/lib/booking"
import { hasPermission, canAccessAppointment } from "@/lib/permissions"
import { AppointmentStatus } from "@/generated/prisma"
import { z } from "zod"
import { Prisma } from "@/generated/prisma"

const createAppointmentSchema = z.object({
  serviceId: z.string(),
  dentistId: z.string(),
  date: z.string(),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  patientId: z.string().optional(),
  notes: z.string().optional(),
  idempotencyKey: z.string().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Authentication required" } }, { status: 401 })
    }

    if (!hasPermission(session.user.role, "appointment:read")) {
      return NextResponse.json({ error: { code: "FORBIDDEN", message: "Insufficient permissions" } }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "20")
    const status = searchParams.get("status")
    const dentistId = searchParams.get("dentistId")
    const patientId = searchParams.get("patientId")
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

    const where: Prisma.AppointmentWhereInput = {}

    if (status) where.status = status as AppointmentStatus
    if (dentistId) where.dentistId = dentistId
    if (patientId) where.patientId = patientId
    if (startDate || endDate) {
      where.startTime = {} as Record<string, Date>
      if (startDate) where.startTime.gte = new Date(startDate)
      if (endDate) where.startTime.lte = new Date(endDate)
    }

    if (session.user.role === "PATIENT") {
      const patient = await prisma.patient.findUnique({ where: { userId: session.user.id } })
      if (patient) where.patientId = patient.id
    } else if (session.user.role === "DENTIST") {
      const dentist = await prisma.dentist.findUnique({ where: { userId: session.user.id } })
      if (dentist) where.dentistId = dentist.id
    }

    const [appointments, total] = await Promise.all([
      prisma.appointment.findMany({
        where,
        include: {
          patient: { include: { user: true } },
          dentist: { include: { user: true } },
          service: true,
        },
        orderBy: { startTime: "asc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.appointment.count({ where }),
    ])

    return NextResponse.json({ appointments, total, page, limit, totalPages: Math.ceil(total / limit) })
  } catch (error) {
    console.error("Get appointments error:", error)
    return NextResponse.json({ error: { code: "INTERNAL_SERVER_ERROR", message: "Failed to fetch appointments" } }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Authentication required" } }, { status: 401 })
    }

    if (!hasPermission(session.user.role, "appointment:create")) {
      return NextResponse.json({ error: { code: "FORBIDDEN", message: "Insufficient permissions" } }, { status: 403 })
    }

    const body = await request.json()
    const data = createAppointmentSchema.parse(body)

    let patientId = data.patientId
    if (!patientId && session.user.role === "PATIENT") {
      const patient = await prisma.patient.findUnique({ where: { userId: session.user.id } })
      if (!patient) {
        return NextResponse.json({ error: { code: "NOT_FOUND", message: "Patient profile not found" } }, { status: 404 })
      }
      patientId = patient.id
    }

    if (!patientId) {
      return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "patientId is required" } }, { status: 400 })
    }

    const startTime = new Date(`${data.date}T${data.startTime}`)
    const service = await prisma.service.findUnique({ where: { id: data.serviceId } })
    if (!service) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Service not found" } }, { status: 404 })
    }
    const endTime = new Date(startTime.getTime() + service.durationMinutes * 60 * 1000)

    const result = await createBooking(
      {
        patientId,
        dentistId: data.dentistId,
        serviceId: data.serviceId,
        startTime,
        endTime,
        notes: data.notes,
        idempotencyKey: data.idempotencyKey,
      },
      session.user.id
    )

    const appointment = await prisma.appointment.findUnique({
      where: { id: result.appointment.id },
      include: { patient: { include: { user: true } }, dentist: { include: { user: true } }, service: true },
    })

    return NextResponse.json({ appointment: result.appointment, created: result.created }, { status: result.created ? 201 : 200 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: error.issues[0].message } }, { status: 400 })
    }
    if (error instanceof Error) {
      if (error.message === "APPOINTMENT_SLOT_UNAVAILABLE") {
        return NextResponse.json({ error: { code: "APPOINTMENT_SLOT_UNAVAILABLE", message: "The selected time is no longer available" } }, { status: 409 })
      }
      if (error.message === "APPOINTMENT_INVALID_TRANSITION") {
        return NextResponse.json({ error: { code: "APPOINTMENT_INVALID_TRANSITION", message: "Invalid appointment state transition" } }, { status: 400 })
      }
    }
    console.error("Create appointment error:", error)
    return NextResponse.json({ error: { code: "INTERNAL_SERVER_ERROR", message: "Failed to create appointment" } }, { status: 500 })
  }
}