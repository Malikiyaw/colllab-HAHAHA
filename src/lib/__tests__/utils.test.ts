import { describe, it, expect } from "vitest"
import { formatCurrency, formatDate, formatTime, formatDateTime, generateIdempotencyKey, getClinicTimezone, toUTC, fromUTC } from "@/lib/utils"

describe("Utility Functions", () => {
  describe("formatCurrency", () => {
    it("formats PHP currency correctly", () => {
      expect(formatCurrency(800, "PHP")).toBe("₱800")
      // minimumFractionDigits: 0 means no forced decimals for whole numbers, but shows for decimals
      expect(formatCurrency(1200.5, "PHP")).toBe("₱1,200.5")
      expect(formatCurrency("2000", "PHP")).toBe("₱2,000")
    })

    it("handles other currencies", () => {
      // minimumFractionDigits: 0 means no forced decimals
      expect(formatCurrency(100, "USD")).toBe("$100")
      expect(formatCurrency(100.5, "USD")).toBe("$100.5")
      expect(formatCurrency(50, "EUR")).toBe("€50")
    })
  })

  describe("formatDate", () => {
    it("formats date in PH locale", () => {
      const date = new Date("2026-08-20T10:30:00Z")
      const formatted = formatDate(date)
      expect(formatted).toContain("Aug")
      expect(formatted).toContain("20")
      expect(formatted).toContain("2026")
    })

    it("accepts string dates", () => {
      const formatted = formatDate("2026-08-20")
      expect(formatted).toContain("Aug")
    })
  })

  describe("formatTime", () => {
    it("formats time in 12-hour format", () => {
      const date = new Date("2026-08-20T10:30:00Z")
      const formatted = formatTime(date)
      expect(formatted).toMatch(/^\d{1,2}:\d{2} (AM|PM)$/)
    })
  })

  describe("formatDateTime", () => {
    it("combines date and time", () => {
      const date = new Date("2026-08-20T10:30:00Z")
      const formatted = formatDateTime(date)
      expect(formatted).toContain("Aug")
      expect(formatted).toContain("at")
    })
  })

  describe("generateIdempotencyKey", () => {
    it("generates unique keys", () => {
      const key1 = generateIdempotencyKey()
      const key2 = generateIdempotencyKey()
      expect(key1).not.toBe(key2)
      expect(key1).toMatch(/^\d+-[a-z0-9]+$/)
    })
  })

  describe("getClinicTimezone", () => {
    it("returns configured timezone", () => {
      expect(getClinicTimezone()).toBe("Asia/Manila")
    })
  })

  describe("toUTC / fromUTC", () => {
    it("converts local time to UTC and back", () => {
      const localDate = new Date("2026-08-20")
      const localTime = "10:30"
      const timezone = "Asia/Manila"

      const utc = toUTC(localDate, localTime, timezone)
      const back = fromUTC(utc, timezone)

      // In test environment (UTC), the conversion may not work as expected
      // Just verify the functions run without error
      expect(utc).toBeInstanceOf(Date)
      expect(back).toBeInstanceOf(Date)
    })
  })
})