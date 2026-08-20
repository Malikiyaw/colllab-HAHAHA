import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const active = searchParams.get("active")

    const where: Record<string, unknown> = {}
    if (active !== null) where.active = active === "true"

    const services = await prisma.service.findMany({
      where,
      include: {
        category: true,
        dentists: {
          where: { active: true },
          include: { dentist: { include: { user: true } } },
        },
      },
      orderBy: { name: "asc" },
    })

    return NextResponse.json(services)
  } catch (error) {
    console.error("Get public services error:", error)
    return NextResponse.json({ error: { code: "INTERNAL_SERVER_ERROR", message: "Failed to fetch services" } }, { status: 500 })
  }
}