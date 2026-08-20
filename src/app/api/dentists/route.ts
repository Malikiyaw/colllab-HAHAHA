import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const serviceId = searchParams.get("serviceId")
    const active = searchParams.get("active")

    const where: Record<string, unknown> = {}
    if (active !== null) where.active = active === "true"

    const dentists = await prisma.dentist.findMany({
      where,
      include: {
        user: true,
        services: {
          where: serviceId ? { serviceId, active: true } : { active: true },
          include: { service: true },
        },
      },
      orderBy: { user: { name: "asc" } },
    })

    return NextResponse.json(dentists)
  } catch (error) {
    console.error("Get public dentists error:", error)
    return NextResponse.json({ error: { code: "INTERNAL_SERVER_ERROR", message: "Failed to fetch dentists" } }, { status: 500 })
  }
}