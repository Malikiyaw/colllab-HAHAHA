import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { hasPermission } from "@/lib/permissions"

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Authentication required" } }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const unreadOnly = searchParams.get("unread") === "true"
    const limit = parseInt(searchParams.get("limit") || "50")

    const where: Record<string, unknown> = { userId: session.user.id }
    if (unreadOnly) where.status = "PENDING"

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
    })

    return NextResponse.json(notifications)
  } catch (error) {
    console.error("Get notifications error:", error)
    return NextResponse.json({ error: { code: "INTERNAL_SERVER_ERROR", message: "Failed to fetch notifications" } }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Authentication required" } }, { status: 401 })
    }

    const body = await request.json()
    const { notificationIds, markAsRead } = body

    if (!notificationIds || !Array.isArray(notificationIds)) {
      return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "notificationIds array required" } }, { status: 400 })
    }

    if (markAsRead) {
      await prisma.notification.updateMany({
        where: { id: { in: notificationIds }, userId: session.user.id },
        data: { status: "SENT", sentAt: new Date() },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Update notifications error:", error)
    return NextResponse.json({ error: { code: "INTERNAL_SERVER_ERROR", message: "Failed to update notifications" } }, { status: 500 })
  }
}