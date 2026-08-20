import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { hasPermission } from "@/lib/permissions"
import { createAuditLog, AuditActions } from "@/lib/audit"

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user || !hasPermission(session.user.role, "blockedtime:delete")) {
      return NextResponse.json({ error: { code: "FORBIDDEN", message: "Insufficient permissions" } }, { status: 403 })
    }

    const { id } = await params
    await prisma.blockedTime.delete({ where: { id } })

    await createAuditLog({
      userId: session.user.id,
      action: AuditActions.BLOCKEDTIME_DELETE,
      entity: "BlockedTime",
      entityId: id,
      metadata: { deleted: true },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete blocked time error:", error)
    return NextResponse.json({ error: { code: "INTERNAL_SERVER_ERROR", message: "Failed to delete blocked time" } }, { status: 500 })
  }
}