import { describe, it, expect } from "vitest"
import { hasPermission, getPermissions, requirePermission, canAccessPatient, canAccessAppointment } from "@/lib/permissions"
import { Role } from "@/generated/prisma"

describe("Permissions", () => {
  describe("getPermissions", () => {
    it("returns correct permissions for PATIENT", () => {
      const perms = getPermissions("PATIENT" as Role)
      expect(perms).toContain("appointment:create")
      expect(perms).toContain("appointment:read")
      expect(perms).toContain("appointment:cancel")
      expect(perms).toContain("patient:read")
      expect(perms).toContain("patient:update")
      expect(perms).not.toContain("appointment:view-all")
      expect(perms).not.toContain("dentist:create")
    })

    it("returns correct permissions for RECEPTIONIST", () => {
      const perms = getPermissions("RECEPTIONIST" as Role)
      expect(perms).toContain("appointment:create")
      expect(perms).toContain("appointment:confirm")
      expect(perms).toContain("appointment:checkin")
      expect(perms).toContain("appointment:view-all")
      expect(perms).toContain("patient:create")
      expect(perms).toContain("patient:view-all")
      expect(perms).not.toContain("dentist:create")
    })

    it("returns correct permissions for DENTIST", () => {
      const perms = getPermissions("DENTIST" as Role)
      expect(perms).toContain("appointment:read")
      expect(perms).toContain("appointment:complete")
      expect(perms).toContain("patient:read")
      expect(perms).not.toContain("appointment:create")
      expect(perms).not.toContain("appointment:confirm")
    })

    it("returns correct permissions for ADMIN", () => {
      const perms = getPermissions("ADMIN" as Role)
      expect(perms).toContain("appointment:delete")
      expect(perms).toContain("dentist:create")
      expect(perms).toContain("service:create")
      expect(perms).toContain("auditlog:read")
      expect(perms).toContain("settings:update")
    })
  })

  describe("hasPermission", () => {
    it("returns true for allowed permission", () => {
      expect(hasPermission("PATIENT" as Role, "appointment:read")).toBe(true)
      expect(hasPermission("RECEPTIONIST" as Role, "appointment:confirm")).toBe(true)
      expect(hasPermission("ADMIN" as Role, "dentist:create")).toBe(true)
    })

    it("returns false for disallowed permission", () => {
      expect(hasPermission("PATIENT" as Role, "appointment:view-all")).toBe(false)
      expect(hasPermission("DENTIST" as Role, "appointment:create")).toBe(false)
      expect(hasPermission("RECEPTIONIST" as Role, "dentist:create")).toBe(false)
    })
  })

  describe("requirePermission", () => {
    it("does not throw for allowed permission", () => {
      expect(() => requirePermission("ADMIN" as Role, "dentist:create")).not.toThrow()
    })

    it("throws for disallowed permission", () => {
      expect(() => requirePermission("PATIENT" as Role, "dentist:create")).toThrow("Forbidden")
    })
  })

  describe("canAccessPatient", () => {
    it("allows admin to access any patient", () => {
      expect(canAccessPatient("ADMIN" as Role, "user-1", "user-2")).toBe(true)
      expect(canAccessPatient("SUPER_ADMIN" as Role, "user-1", "user-2")).toBe(true)
    })

    it("allows receptionist to access any patient", () => {
      expect(canAccessPatient("RECEPTIONIST" as Role, "user-1", "user-2")).toBe(true)
    })

    it("allows dentist to access any patient", () => {
      expect(canAccessPatient("DENTIST" as Role, "user-1", "user-2")).toBe(true)
    })

    it("allows patient to access only own data", () => {
      expect(canAccessPatient("PATIENT" as Role, "user-1", "user-1")).toBe(true)
      expect(canAccessPatient("PATIENT" as Role, "user-1", "user-2")).toBe(false)
    })
  })

  describe("canAccessAppointment", () => {
    it("allows admin to access any appointment", () => {
      const apt = { patientId: "p1", dentistId: "d1" }
      expect(canAccessAppointment("ADMIN" as Role, "user-1", apt)).toBe(true)
      expect(canAccessAppointment("SUPER_ADMIN" as Role, "user-1", apt)).toBe(true)
    })

    it("allows receptionist to access any appointment", () => {
      const apt = { patientId: "p1", dentistId: "d1" }
      expect(canAccessAppointment("RECEPTIONIST" as Role, "user-1", apt)).toBe(true)
    })

    it("allows dentist to access only own appointments", () => {
      const apt = { patientId: "p1", dentistId: "d1" }
      expect(canAccessAppointment("DENTIST" as Role, "d1", apt)).toBe(true)
      expect(canAccessAppointment("DENTIST" as Role, "d2", apt)).toBe(false)
    })

    it("allows patient to access only own appointments", () => {
      const apt = { patientId: "p1", dentistId: "d1" }
      expect(canAccessAppointment("PATIENT" as Role, "p1", apt)).toBe(true)
      expect(canAccessAppointment("PATIENT" as Role, "p2", apt)).toBe(false)
    })
  })
})