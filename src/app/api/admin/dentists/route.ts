import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { z } from "zod"
import { hasPermission } from "@/lib/permissions"
import { createAuditLog, AuditActions } from "@/lib/audit"
import { hashPassword } from "@/lib/password"
import { Role } from "@/generated/prisma"

const dentistSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  password: z.string().min(8).optional(),
  specialization: z.string().optional(),
  licenseNumber: z.string().optional(),
  bio: z.string().optional(),
  active: z.boolean().default(true),
  color: z.string().optional(),
  serviceIds: z.array(z.string()).optional(),
})

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user || !hasPermission(session.user.role, "dentist:read")) {
      return NextResponse.json({ error: { code: "FORBIDDEN", message: "Insufficient permissions" } }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "20")
    const active = searchParams.get("active")
    const search = searchParams.get("search")

    const where: Record<string, unknown> = {}
    if (active !== null) where.active = active === "true"
    if (search) {
      where.OR = [
        { user: { name: { contains: search, mode: "insensitive" } } },
        { user: { email: { contains: search, mode: "insensitive" } } },
        { specialization: { contains: search, mode: "insensitive" } },
      ]
    }

    const [dentists, total] = await Promise.all([
      prisma.dentist.findMany({
        where,
        include: { user: true, services: { include: { service: true } }, schedules: true },
        orderBy: { user: { name: "asc" } },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.dentist.count({ where }),
    ])

    return NextResponse.json({ dentists, total, page, limit, totalPages: Math.ceil(total / limit) })
  } catch (error) {
    console.error("Get dentists error:", error)
    return NextResponse.json({ error: { code: "INTERNAL_SERVER_ERROR", message: "Failed to fetch dentists" } }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user || !hasPermission(session.user.role, "dentist:create")) {
      return NextResponse.json({ error: { code: "FORBIDDEN", message: "Insufficient permissions" } }, { status: 403 })
    }

    const body = await request.json()
    const { email, name, password, specialization, licenseNumber, bio, active, color, serviceIds } = dentistSchema.parse(body)

    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) {
      return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Email already registered" } }, { status: 400 })
    }

    const passwordHash = password ? await hashPassword(password) : await hashPassword("password123")

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { email, name, passwordHash, role: Role.DENTIST, active },
      })

      const dentist = await tx.dentist.create({
        data: {
          userId: user.id,
          specialization,
          licenseNumber,
          bio,
          active,
          color,
        },
      })

      if (serviceIds && serviceIds.length > 0) {
        await tx.dentistService.createMany({
          data: serviceIds.map((serviceId) => ({ dentistId: dentist.id, serviceId, active: true })),
          skipDuplicates: true,
        })
      }

      return dentist
    })

    await createAuditLog({
      userId: session.user.id,
      action: AuditActions.DENTIST_CREATE,
      entity: "Dentist",
      entityId: result.id,
      metadata: { email, name, specialization, licenseNumber },
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: error.issues[0].message } }, { status: 400 })
    }
    console.error("Create dentist error:", error)
    return NextResponse.json({ error: { code: "INTERNAL_SERVER_ERROR", message: "Failed to create dentist" } }, { status: 500 })
  }
}