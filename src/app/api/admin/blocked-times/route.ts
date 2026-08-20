import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { z } from "zod"
import { hasPermission } from "@/lib/permissions"
import { createAuditLog, AuditActions } from "@/lib/audit"

const blockedTimeSchema = z.object({
  dentistId: z.string().optional(),
  clinicWide: z.boolean().default(false),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  reason: z.string().optional(),
}).refine((data) => new Date(data.startTime) < new Date(data.endTime), { message: "Start time must be before end time", path: ["startTime"] })

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user || !hasPermission(session.user.role, "blockedtime:read")) {
      return NextResponse.json({ error: { code: "FORBIDDEN", message: "Insufficient permissions" } }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const dentistId = searchParams.get("dentistId")
    const start = searchParams.get("start")
    const end = searchParams.get("end")
    const clinicWide = searchParams.get("clinicWide")

    const where: Record<string, unknown> = {}
    if (dentistId) where.dentistId = dentistId
    if (clinicWide !== null) where.clinicWide = clinicWide === "true"
    if (start && end) {
      where.startTime = { lt: new Date(end) }
      where.endTime = { gt: new Date(start) }
    }

    const blockedTimes = await prisma.blockedTime.findMany({
      where,
      include: { dentist: { include: { user: true } } },
      orderBy: { startTime: "asc" },
    })

    return NextResponse.json(blockedTimes)
  } catch (error) {
    console.error("Get blocked times error:", error)
    return NextResponse.json({ error: { code: "INTERNAL_SERVER_ERROR", message: "Failed to fetch blocked times" } }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user || !hasPermission(session.user.role, "blockedtime:create")) {
      return NextResponse.json({ error: { code: "FORBIDDEN", message: "Insufficient permissions" } }, { status: 403 })
    }

    const body = await request.json()
    const data = blockedTimeSchema.parse(body)

    const blockedTime = await prisma.blockedTime.create({
      data: { ...data, startTime: new Date(data.startTime), endTime: new Date(data.endTime) },
      include: { dentist: { include: { user: true } } },
    })

    await createAuditLog({
      userId: session.user.id,
      action: AuditActions.BLOCKEDTIME_CREATE,
      entity: "BlockedTime",
      entityId: blockedTime.id,
      metadata: data,
    })

    return NextResponse.json(blockedTime, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: error.issues[0].message } }, { status: 400 })
    }
    console.error("Create blocked time error:", error)
    return NextResponse.json({ error: { code: "INTERNAL_SERVER_ERROR", message: "Failed to create blocked time" } }, { status: 500 })
  }
}