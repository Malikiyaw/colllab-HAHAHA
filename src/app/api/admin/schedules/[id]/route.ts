import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { z } from "zod"
import { hasPermission } from "@/lib/permissions"
import { createAuditLog, AuditActions } from "@/lib/audit"

const scheduleUpdateSchema = z.object({
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
  active: z.boolean().optional(),
}).refine((data) => {
  if (data.startTime && data.endTime) return data.startTime < data.endTime
  return true
}, { message: "Start time must be before end time", path: ["startTime"] })

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user || !hasPermission(session.user.role, "schedule:update")) {
      return NextResponse.json({ error: { code: "FORBIDDEN", message: "Insufficient permissions" } }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const data = scheduleUpdateSchema.parse(body)

    let schedule
    if (id.startsWith("clinic-")) {
      schedule = await prisma.clinicSchedule.update({ where: { id }, data })
    } else {
      schedule = await prisma.dentistSchedule.update({ where: { id }, data, include: { dentist: { include: { user: true } } } })
    }

    await createAuditLog({
      userId: session.user.id,
      action: AuditActions.SCHEDULE_UPDATE,
      entity: id.startsWith("clinic-") ? "ClinicSchedule" : "DentistSchedule",
      entityId: id,
      metadata: data,
    })

    return NextResponse.json(schedule)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: error.issues[0].message } }, { status: 400 })
    }
    console.error("Update schedule error:", error)
    return NextResponse.json({ error: { code: "INTERNAL_SERVER_ERROR", message: "Failed to update schedule" } }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user || !hasPermission(session.user.role, "schedule:delete")) {
      return NextResponse.json({ error: { code: "FORBIDDEN", message: "Insufficient permissions" } }, { status: 403 })
    }

    const { id } = await params

    if (id.startsWith("clinic-")) {
      await prisma.clinicSchedule.delete({ where: { id } })
    } else {
      await prisma.dentistSchedule.delete({ where: { id } })
    }

    await createAuditLog({
      userId: session.user.id,
      action: AuditActions.SCHEDULE_UPDATE,
      entity: id.startsWith("clinic-") ? "ClinicSchedule" : "DentistSchedule",
      entityId: id,
      metadata: { deleted: true },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete schedule error:", error)
    return NextResponse.json({ error: { code: "INTERNAL_SERVER_ERROR", message: "Failed to delete schedule" } }, { status: 500 })
  }
}