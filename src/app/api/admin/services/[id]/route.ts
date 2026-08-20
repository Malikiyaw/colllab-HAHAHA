import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { z } from "zod"
import { hasPermission } from "@/lib/permissions"
import { createAuditLog, AuditActions } from "@/lib/audit"

const serviceUpdateSchema = z.object({
  categoryId: z.string().optional().nullable(),
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  durationMinutes: z.number().int().positive().optional(),
  price: z.number().nonnegative().optional().nullable(),
  bufferBeforeMinutes: z.number().int().nonnegative().optional(),
  bufferAfterMinutes: z.number().int().nonnegative().optional(),
  active: z.boolean().optional(),
  color: z.string().optional().nullable(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user || !hasPermission(session.user.role, "service:read")) {
      return NextResponse.json({ error: { code: "FORBIDDEN", message: "Insufficient permissions" } }, { status: 403 })
    }

    const { id } = await params
    const service = await prisma.service.findUnique({
      where: { id },
      include: { category: true, dentists: { include: { dentist: { include: { user: true } } } } },
    })

    if (!service) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Service not found" } }, { status: 404 })
    }

    return NextResponse.json(service)
  } catch (error) {
    console.error("Get service error:", error)
    return NextResponse.json({ error: { code: "INTERNAL_SERVER_ERROR", message: "Failed to fetch service" } }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user || !hasPermission(session.user.role, "service:update")) {
      return NextResponse.json({ error: { code: "FORBIDDEN", message: "Insufficient permissions" } }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const data = serviceUpdateSchema.parse(body)

    const service = await prisma.service.update({
      where: { id },
      data,
    })

    await createAuditLog({
      userId: session.user.id,
      action: AuditActions.SERVICE_UPDATE,
      entity: "Service",
      entityId: id,
      metadata: data,
    })

    return NextResponse.json(service)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: error.issues[0].message } }, { status: 400 })
    }
    console.error("Update service error:", error)
    return NextResponse.json({ error: { code: "INTERNAL_SERVER_ERROR", message: "Failed to update service" } }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user || !hasPermission(session.user.role, "service:delete")) {
      return NextResponse.json({ error: { code: "FORBIDDEN", message: "Insufficient permissions" } }, { status: 403 })
    }

    const { id } = await params
    await prisma.service.delete({ where: { id } })

    await createAuditLog({
      userId: session.user.id,
      action: AuditActions.SERVICE_UPDATE,
      entity: "Service",
      entityId: id,
      metadata: { deleted: true },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete service error:", error)
    return NextResponse.json({ error: { code: "INTERNAL_SERVER_ERROR", message: "Failed to delete service" } }, { status: 500 })
  }
}