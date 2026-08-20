import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { z } from "zod"
import { hasPermission } from "@/lib/permissions"
import { createAuditLog, AuditActions } from "@/lib/audit"
import { hashPassword } from "@/lib/password"

const dentistUpdateSchema = z.object({
  name: z.string().min(2).optional(),
  specialization: z.string().optional().nullable(),
  licenseNumber: z.string().optional().nullable(),
  bio: z.string().optional().nullable(),
  active: z.boolean().optional(),
  color: z.string().optional().nullable(),
  serviceIds: z.array(z.string()).optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user || !hasPermission(session.user.role, "dentist:read")) {
      return NextResponse.json({ error: { code: "FORBIDDEN", message: "Insufficient permissions" } }, { status: 403 })
    }

    const { id } = await params
    const dentist = await prisma.dentist.findUnique({
      where: { id },
      include: { user: true, services: { include: { service: true } }, schedules: true, blockedTimes: true },
    })

    if (!dentist) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Dentist not found" } }, { status: 404 })
    }

    return NextResponse.json(dentist)
  } catch (error) {
    console.error("Get dentist error:", error)
    return NextResponse.json({ error: { code: "INTERNAL_SERVER_ERROR", message: "Failed to fetch dentist" } }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user || !hasPermission(session.user.role, "dentist:update")) {
      return NextResponse.json({ error: { code: "FORBIDDEN", message: "Insufficient permissions" } }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const { serviceIds, ...data } = dentistUpdateSchema.parse(body)

    const result = await prisma.$transaction(async (tx) => {
      const dentist = await tx.dentist.update({
        where: { id },
        data,
      })

      if (serviceIds) {
        await tx.dentistService.deleteMany({ where: { dentistId: id } })
        if (serviceIds.length > 0) {
          await tx.dentistService.createMany({
            data: serviceIds.map((serviceId) => ({ dentistId: id, serviceId, active: true })),
            skipDuplicates: true,
          })
        }
      }

      return dentist
    })

    await createAuditLog({
      userId: session.user.id,
      action: AuditActions.DENTIST_UPDATE,
      entity: "Dentist",
      entityId: id,
      metadata: { ...data, serviceIds },
    })

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: error.issues[0].message } }, { status: 400 })
    }
    console.error("Update dentist error:", error)
    return NextResponse.json({ error: { code: "INTERNAL_SERVER_ERROR", message: "Failed to update dentist" } }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user || !hasPermission(session.user.role, "dentist:delete")) {
      return NextResponse.json({ error: { code: "FORBIDDEN", message: "Insufficient permissions" } }, { status: 403 })
    }

    const { id } = await params
    const dentist = await prisma.dentist.findUnique({ where: { id }, include: { user: true } })
    if (!dentist) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Dentist not found" } }, { status: 404 })
    }

    await prisma.$transaction(async (tx) => {
      await tx.dentist.delete({ where: { id } })
      await tx.user.delete({ where: { id: dentist.userId } })
    })

    await createAuditLog({
      userId: session.user.id,
      action: AuditActions.DENTIST_UPDATE,
      entity: "Dentist",
      entityId: id,
      metadata: { deleted: true },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete dentist error:", error)
    return NextResponse.json({ error: { code: "INTERNAL_SERVER_ERROR", message: "Failed to delete dentist" } }, { status: 500 })
  }
}