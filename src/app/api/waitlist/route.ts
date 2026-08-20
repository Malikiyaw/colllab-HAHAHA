import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { hasPermission } from "@/lib/permissions"
import { z } from "zod"
import { createNotification } from "@/lib/notifications"
import { format, formatDistanceToNow } from "date-fns"

const waitlistSchema = z.object({
  serviceId: z.string(),
  dentistId: z.string().optional(),
  preferredDate: z.string().datetime().optional(),
})

const notifySchema = z.object({
  appointmentId: z.string(),
})

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Authentication required" } }, { status: 401 })
    }

    if (!hasPermission(session.user.role, "waitlist:read")) {
      return NextResponse.json({ error: { code: "FORBIDDEN", message: "Insufficient permissions" } }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const serviceId = searchParams.get("serviceId")
    const dentistId = searchParams.get("dentistId")
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "20")

    const where: Record<string, unknown> = {}
    if (status) where.status = status
    if (serviceId) where.serviceId = serviceId
    if (dentistId) where.dentistId = dentistId

    if (session.user.role === "PATIENT") {
      const patient = await prisma.patient.findUnique({ where: { userId: session.user.id } })
      if (patient) where.patientId = patient.id
    }

    const [waitlist, total] = await Promise.all([
      prisma.waitlist.findMany({
        where,
        include: {
          patient: { include: { user: true } },
          service: true,
          dentist: { include: { user: true } },
        },
        orderBy: { createdAt: "asc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.waitlist.count({ where }),
    ])

    return NextResponse.json({ waitlist, total, page, limit, totalPages: Math.ceil(total / limit) })
  } catch (error) {
    console.error("Get waitlist error:", error)
    return NextResponse.json({ error: { code: "INTERNAL_SERVER_ERROR", message: "Failed to fetch waitlist" } }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Authentication required" } }, { status: 401 })
    }

    if (!hasPermission(session.user.role, "waitlist:create")) {
      return NextResponse.json({ error: { code: "FORBIDDEN", message: "Insufficient permissions" } }, { status: 403 })
    }

    const body = await request.json()
    const data = waitlistSchema.parse(body)

    let patientId: string
    if (session.user.role === "PATIENT") {
      const patient = await prisma.patient.findUnique({ where: { userId: session.user.id } })
      if (!patient) {
        return NextResponse.json({ error: { code: "NOT_FOUND", message: "Patient profile not found" } }, { status: 404 })
      }
      patientId = patient.id
    } else {
      const { patientId: providedPatientId } = body
      if (!providedPatientId) {
        return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "patientId is required for staff" } }, { status: 400 })
      }
      patientId = providedPatientId
    }

    const existing = await prisma.waitlist.findFirst({
      where: {
        patientId,
        serviceId: data.serviceId,
        dentistId: data.dentistId || null,
        status: "WAITING",
      },
    })

    if (existing) {
      return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Already on waitlist for this service" } }, { status: 400 })
    }

    const waitlist = await prisma.waitlist.create({
      data: {
        patientId,
        serviceId: data.serviceId,
        dentistId: data.dentistId,
        preferredDate: data.preferredDate ? new Date(data.preferredDate) : null,
        status: "WAITING",
      },
      include: { patient: { include: { user: true } }, service: true, dentist: { include: { user: true } } },
    })

    return NextResponse.json(waitlist, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: error.issues[0].message } }, { status: 400 })
    }
    console.error("Create waitlist error:", error)
    return NextResponse.json({ error: { code: "INTERNAL_SERVER_ERROR", message: "Failed to join waitlist" } }, { status: 500 })
  }
}