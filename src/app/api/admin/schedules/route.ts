import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { z } from "zod"
import { hasPermission } from "@/lib/permissions"
import { createAuditLog, AuditActions } from "@/lib/audit"

const scheduleSchema = z.object({
  dentistId: z.string().optional(),
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  active: z.boolean().default(true),
}).refine((data) => data.startTime < data.endTime, { message: "Start time must be before end time", path: ["startTime"] })

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user || !hasPermission(session.user.role, "schedule:read")) {
      return NextResponse.json({ error: { code: "FORBIDDEN", message: "Insufficient permissions" } }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const dentistId = searchParams.get("dentistId")
    const dayOfWeek = searchParams.get("dayOfWeek")

    const where: Record<string, unknown> = {}
    if (dentistId) where.dentistId = dentistId
    if (dayOfWeek !== null) where.dayOfWeek = parseInt(dayOfWeek)

    const [dentistSchedules, clinicSchedules] = await Promise.all([
      prisma.dentistSchedule.findMany({
        where,
        include: { dentist: { include: { user: true } } },
        orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
      }),
      prisma.clinicSchedule.findMany({
        where: dayOfWeek !== null ? { dayOfWeek: parseInt(dayOfWeek) } : {},
        orderBy: { dayOfWeek: "asc" },
      }),
    ])

    return NextResponse.json({ dentistSchedules, clinicSchedules })
  } catch (error) {
    console.error("Get schedules error:", error)
    return NextResponse.json({ error: { code: "INTERNAL_SERVER_ERROR", message: "Failed to fetch schedules" } }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user || !hasPermission(session.user.role, "schedule:create")) {
      return NextResponse.json({ error: { code: "FORBIDDEN", message: "Insufficient permissions" } }, { status: 403 })
    }

    const body = await request.json()
    const data = scheduleSchema.parse(body)

    let schedule
    if (data.dentistId) {
      schedule = await prisma.dentistSchedule.upsert({
        where: { dentistId_dayOfWeek: { dentistId: data.dentistId, dayOfWeek: data.dayOfWeek } },
        update: { startTime: data.startTime, endTime: data.endTime, active: data.active },
        create: { dentistId: data.dentistId, dayOfWeek: data.dayOfWeek, startTime: data.startTime, endTime: data.endTime, active: data.active },
        include: { dentist: { include: { user: true } } },
      })
    } else {
      schedule = await prisma.clinicSchedule.upsert({
        where: { id: `clinic-${data.dayOfWeek}` },
        update: { startTime: data.startTime, endTime: data.endTime, active: data.active },
        create: { id: `clinic-${data.dayOfWeek}`, dayOfWeek: data.dayOfWeek, startTime: data.startTime, endTime: data.endTime, active: data.active },
      })
    }

    await createAuditLog({
      userId: session.user.id,
      action: AuditActions.SCHEDULE_UPDATE,
      entity: data.dentistId ? "DentistSchedule" : "ClinicSchedule",
      entityId: data.dentistId ? `${data.dentistId}-${data.dayOfWeek}` : `clinic-${data.dayOfWeek}`,
      metadata: data,
    })

    return NextResponse.json(schedule, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: error.issues[0].message } }, { status: 400 })
    }
    console.error("Create schedule error:", error)
    return NextResponse.json({ error: { code: "INTERNAL_SERVER_ERROR", message: "Failed to create schedule" } }, { status: 500 })
  }
}