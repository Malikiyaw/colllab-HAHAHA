import { prisma } from "@/lib/prisma"
import { headers } from "next/headers"
import { Prisma } from "@/generated/prisma"

interface AuditLogInput {
  userId?: string
  action: string
  entity: string
  entityId?: string
  metadata?: Record<string, unknown>
}

export async function createAuditLog(input: AuditLogInput): Promise<void> {
  try {
    const headersList = await headers()
    const ipAddress = headersList.get("x-forwarded-for") || headersList.get("x-real-ip") || "unknown"
    const userAgent = headersList.get("user-agent") || "unknown"

    await prisma.auditLog.create({
      data: {
        userId: input.userId,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId,
        metadata: input.metadata as Prisma.InputJsonValue,
        ipAddress,
        userAgent,
      },
    })
  } catch (error) {
    console.error("Failed to create audit log:", error)
  }
}

export const AuditActions = {
  AUTH_LOGIN: "auth.login",
  AUTH_LOGOUT: "auth.logout",
  AUTH_REGISTER: "auth.register",
  APPOINTMENT_CREATE: "appointment.create",
  APPOINTMENT_CANCEL: "appointment.cancel",
  APPOINTMENT_CONFIRM: "appointment.confirm",
  APPOINTMENT_CHECKIN: "appointment.checkin",
  APPOINTMENT_START: "appointment.start",
  APPOINTMENT_COMPLETE: "appointment.complete",
  APPOINTMENT_RESCHEDULE: "appointment.reschedule",
  PATIENT_CREATE: "patient.create",
  PATIENT_UPDATE: "patient.update",
  DENTIST_CREATE: "dentist.create",
  DENTIST_UPDATE: "dentist.update",
  SERVICE_CREATE: "service.create",
  SERVICE_UPDATE: "service.update",
  SCHEDULE_UPDATE: "schedule.update",
  BLOCKEDTIME_CREATE: "blockedtime.create",
  BLOCKEDTIME_DELETE: "blockedtime.delete",
  SETTINGS_UPDATE: "settings.update",
  WAITLIST_JOIN: "waitlist.join",
  WAITLIST_NOTIFY: "waitlist.notify",
  WAITLIST_CONVERT: "waitlist.convert",
} as const