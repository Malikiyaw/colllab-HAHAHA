import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { z } from "zod"
import { hasPermission } from "@/lib/permissions"

const categorySchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  active: z.boolean().default(true),
})

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user || !hasPermission(session.user.role, "service:read")) {
      return NextResponse.json({ error: { code: "FORBIDDEN", message: "Insufficient permissions" } }, { status: 403 })
    }

    const categories = await prisma.serviceCategory.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
    })

    return NextResponse.json(categories)
  } catch (error) {
    console.error("Get categories error:", error)
    return NextResponse.json({ error: { code: "INTERNAL_SERVER_ERROR", message: "Failed to fetch categories" } }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user || !hasPermission(session.user.role, "service:create")) {
      return NextResponse.json({ error: { code: "FORBIDDEN", message: "Insufficient permissions" } }, { status: 403 })
    }

    const body = await request.json()
    const data = categorySchema.parse(body)

    const category = await prisma.serviceCategory.create({ data })

    return NextResponse.json(category, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: error.issues[0].message } }, { status: 400 })
    }
    console.error("Create category error:", error)
    return NextResponse.json({ error: { code: "INTERNAL_SERVER_ERROR", message: "Failed to create category" } }, { status: 500 })
  }
}