import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { z } from "zod"
import { hasPermission } from "@/lib/permissions"
import { createAuditLog, AuditActions } from "@/lib/audit"

const serviceSchema = z.object({
  categoryId: z.string().optional(),
  name: z.string().min(1),
  description: z.string().optional(),
  durationMinutes: z.number().int().positive(),
  price: z.number().nonnegative().optional(),
  bufferBeforeMinutes: z.number().int().nonnegative().default(0),
  bufferAfterMinutes: z.number().int().nonnegative().default(0),
  active: z.boolean().default(true),
  color: z.string().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user || !hasPermission(session.user.role, "service:read")) {
      return NextResponse.json({ error: { code: "FORBIDDEN", message: "Insufficient permissions" } }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "20")
    const active = searchParams.get("active")
    const categoryId = searchParams.get("categoryId")
    const search = searchParams.get("search")

    const where: Record<string, unknown> = {}
    if (active !== null) where.active = active === "true"
    if (categoryId) where.categoryId = categoryId
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ]
    }

    const [services, total] = await Promise.all([
      prisma.service.findMany({
        where,
        include: { category: true, dentists: { include: { dentist: { include: { user: true } } } } },
        orderBy: { name: "asc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.service.count({ where }),
    ])

    return NextResponse.json({ services, total, page, limit, totalPages: Math.ceil(total / limit) })
  } catch (error) {
    console.error("Get services error:", error)
    return NextResponse.json({ error: { code: "INTERNAL_SERVER_ERROR", message: "Failed to fetch services" } }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user || !hasPermission(session.user.role, "service:create")) {
      return NextResponse.json({ error: { code: "FORBIDDEN", message: "Insufficient permissions" } }, { status: 403 })
    }

    const body = await request.json()
    const data = serviceSchema.parse(body)

    const service = await prisma.service.create({ data })

    await createAuditLog({
      userId: session.user.id,
      action: AuditActions.SERVICE_CREATE,
      entity: "Service",
      entityId: service.id,
      metadata: data,
    })

    return NextResponse.json(service, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: error.issues[0].message } }, { status: 400 })
    }
    console.error("Create service error:", error)
    return NextResponse.json({ error: { code: "INTERNAL_SERVER_ERROR", message: "Failed to create service" } }, { status: 500 })
  }
}