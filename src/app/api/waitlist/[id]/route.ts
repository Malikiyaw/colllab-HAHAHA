import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { hasPermission } from "@/lib/permissions"
import { createNotification } from "@/lib/notifications"
import { format } from "date-fns"
import { z } from "zod"

const notifySchema = z.object({
  appointmentId: z.string(),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Authentication required" } }, { status: 401 })
    }

    if (!hasPermission(session.user.role, "waitlist:notify")) {
      return NextResponse.json({ error: { code: "FORBIDDEN", message: "Insufficient permissions" } }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const { appointmentId } = notifySchema.parse(body)

    const waitlist = await prisma.waitlist.findUnique({
      where: { id },
      include: { patient: { include: { user: true } }, service: true, dentist: { include: { user: true } } },
    })

    if (!waitlist) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Waitlist entry not found" } }, { status: 404 })
    }

    if (waitlist.status !== "WAITING") {
      return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Waitlist entry is not waiting" } }, { status: 400 })
    }

    const appointment = await prisma.appointment.findUnique({ where: { id: appointmentId } })
    if (!appointment) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Appointment not found" } }, { status: 404 })
    }

    await prisma.waitlist.update({
      where: { id },
      data: { status: "NOTIFIED" },
    })

    await createNotification({
      userId: waitlist.patient.userId,
      type: "EMAIL",
      subject: `Slot Available - ${waitlist.service.name}`,
      body: `A slot for ${waitlist.service.name} with ${waitlist.dentist?.user.name || "a dentist"} has become available on ${format(appointment.startTime, "MMM d")} at ${format(appointment.startTime, "h:mm a")}. Please book within the next 2 hours to secure this slot.`,
      scheduledFor: new Date(),
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: error.issues[0].message } }, { status: 400 })
    }
    console.error("Notify waitlist error:", error)
    return NextResponse.json({ error: { code: "INTERNAL_SERVER_ERROR", message: "Failed to notify waitlist" } }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Authentication required" } }, { status: 401 })
    }

    if (!hasPermission(session.user.role, "waitlist:delete")) {
      return NextResponse.json({ error: { code: "FORBIDDEN", message: "Insufficient permissions" } }, { status: 403 })
    }

    const { id } = await params
    await prisma.waitlist.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete waitlist error:", error)
    return NextResponse.json({ error: { code: "INTERNAL_SERVER_ERROR", message: "Failed to delete waitlist" } }, { status: 500 })
  }
}