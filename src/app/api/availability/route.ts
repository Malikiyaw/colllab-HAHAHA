import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getAvailableSlots, checkSlotAvailability } from "@/lib/availability"
import { hasPermission } from "@/lib/permissions"

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Authentication required" } }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const dentistId = searchParams.get("dentistId")
    const serviceId = searchParams.get("serviceId")
    const dateStr = searchParams.get("date")

    if (!dentistId || !serviceId || !dateStr) {
      return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "dentistId, serviceId, and date are required" } }, { status: 400 })
    }

    const date = new Date(dateStr)
    if (isNaN(date.getTime())) {
      return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Invalid date format" } }, { status: 400 })
    }

    const result = await getAvailableSlots(dentistId, serviceId, date)

    return NextResponse.json({
      slots: result.slots.map((slot) => ({
        startTime: slot.startTime.toISOString(),
        endTime: slot.endTime.toISOString(),
        available: slot.available,
      })),
      date: result.date.toISOString(),
      dentistId: result.dentistId,
      serviceId: result.serviceId,
    })
  } catch (error) {
    console.error("Get availability error:", error)
    if (error instanceof Error && error.message.includes("not found")) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: error.message } }, { status: 404 })
    }
    return NextResponse.json({ error: { code: "INTERNAL_SERVER_ERROR", message: "Failed to fetch availability" } }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Authentication required" } }, { status: 401 })
    }

    const body = await request.json()
    const { dentistId, serviceId, startTime, endTime } = body

    if (!dentistId || !serviceId || !startTime || !endTime) {
      return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "dentistId, serviceId, startTime, and endTime are required" } }, { status: 400 })
    }

    const available = await checkSlotAvailability(dentistId, serviceId, new Date(startTime), new Date(endTime))

    return NextResponse.json({ available })
  } catch (error) {
    console.error("Check slot availability error:", error)
    return NextResponse.json({ error: { code: "INTERNAL_SERVER_ERROR", message: "Failed to check availability" } }, { status: 500 })
  }
}