import { Role } from "@/generated/prisma"

type Permission =
  | "appointment:create"
  | "appointment:read"
  | "appointment:update"
  | "appointment:delete"
  | "appointment:confirm"
  | "appointment:checkin"
  | "appointment:complete"
  | "appointment:cancel"
  | "appointment:reschedule"
  | "appointment:view-all"
  | "patient:create"
  | "patient:read"
  | "patient:update"
  | "patient:delete"
  | "patient:view-all"
  | "dentist:create"
  | "dentist:read"
  | "dentist:update"
  | "dentist:delete"
  | "service:create"
  | "service:read"
  | "service:update"
  | "service:delete"
  | "schedule:create"
  | "schedule:read"
  | "schedule:update"
  | "schedule:delete"
  | "blockedtime:create"
  | "blockedtime:read"
  | "blockedtime:update"
  | "blockedtime:delete"
  | "staff:create"
  | "staff:read"
  | "staff:update"
  | "staff:delete"
  | "waitlist:create"
  | "waitlist:read"
  | "waitlist:update"
  | "waitlist:delete"
  | "waitlist:notify"
  | "auditlog:read"
  | "settings:read"
  | "settings:update"

const rolePermissions: Record<Role, Permission[]> = {
  PATIENT: [
    "appointment:create",
    "appointment:read",
    "appointment:cancel",
    "appointment:reschedule",
    "patient:read",
    "patient:update",
    "waitlist:create",
    "waitlist:read",
  ],
  RECEPTIONIST: [
    "appointment:create",
    "appointment:read",
    "appointment:update",
    "appointment:confirm",
    "appointment:checkin",
    "appointment:cancel",
    "appointment:reschedule",
    "appointment:view-all",
    "patient:create",
    "patient:read",
    "patient:update",
    "patient:view-all",
    "waitlist:create",
    "waitlist:read",
    "waitlist:update",
    "waitlist:notify",
    "service:read",
    "dentist:read",
    "schedule:read",
    "blockedtime:read",
  ],
  DENTIST: [
    "appointment:read",
    "appointment:update",
    "appointment:complete",
    "patient:read",
    "service:read",
    "schedule:read",
  ],
  ADMIN: [
    "appointment:create",
    "appointment:read",
    "appointment:update",
    "appointment:delete",
    "appointment:confirm",
    "appointment:checkin",
    "appointment:complete",
    "appointment:cancel",
    "appointment:reschedule",
    "appointment:view-all",
    "patient:create",
    "patient:read",
    "patient:update",
    "patient:delete",
    "patient:view-all",
    "dentist:create",
    "dentist:read",
    "dentist:update",
    "dentist:delete",
    "service:create",
    "service:read",
    "service:update",
    "service:delete",
    "schedule:create",
    "schedule:read",
    "schedule:update",
    "schedule:delete",
    "blockedtime:create",
    "blockedtime:read",
    "blockedtime:update",
    "blockedtime:delete",
    "staff:create",
    "staff:read",
    "staff:update",
    "staff:delete",
    "waitlist:create",
    "waitlist:read",
    "waitlist:update",
    "waitlist:delete",
    "waitlist:notify",
    "auditlog:read",
    "settings:read",
    "settings:update",
  ],
  SUPER_ADMIN: [
    "appointment:create",
    "appointment:read",
    "appointment:update",
    "appointment:delete",
    "appointment:confirm",
    "appointment:checkin",
    "appointment:complete",
    "appointment:cancel",
    "appointment:reschedule",
    "appointment:view-all",
    "patient:create",
    "patient:read",
    "patient:update",
    "patient:delete",
    "patient:view-all",
    "dentist:create",
    "dentist:read",
    "dentist:update",
    "dentist:delete",
    "service:create",
    "service:read",
    "service:update",
    "service:delete",
    "schedule:create",
    "schedule:read",
    "schedule:update",
    "schedule:delete",
    "blockedtime:create",
    "blockedtime:read",
    "blockedtime:update",
    "blockedtime:delete",
    "staff:create",
    "staff:read",
    "staff:update",
    "staff:delete",
    "waitlist:create",
    "waitlist:read",
    "waitlist:update",
    "waitlist:delete",
    "waitlist:notify",
    "auditlog:read",
    "settings:read",
    "settings:update",
  ],
}

export function getPermissions(role: Role): Permission[] {
  return rolePermissions[role] || []
}

export function hasPermission(role: Role, permission: Permission): boolean {
  return getPermissions(role).includes(permission)
}

export function requirePermission(role: Role, permission: Permission): void {
  if (!hasPermission(role, permission)) {
    throw new Error(`Forbidden: Missing permission ${permission}`)
  }
}

export function canAccessPatient(role: Role, userId: string, patientUserId: string): boolean {
  if (role === "ADMIN" || role === "SUPER_ADMIN") return true
  if (role === "RECEPTIONIST") return true
  if (role === "DENTIST") return true
  if (role === "PATIENT") return userId === patientUserId
  return false
}

export function canAccessAppointment(
  role: Role,
  userId: string,
  appointment: { patientId: string; dentistId: string }
): boolean {
  if (role === "ADMIN" || role === "SUPER_ADMIN") return true
  if (role === "RECEPTIONIST") return true
  if (role === "DENTIST") return appointment.dentistId === userId
  if (role === "PATIENT") return appointment.patientId === userId
  return false
}