import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number | string, currency = "PHP"): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num)
}

export function formatDate(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === "string" ? new Date(date) : date
  return d.toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    ...options,
  })
}

export function formatTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  return d.toLocaleTimeString("en-PH", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  })
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  return `${formatDate(d)} at ${formatTime(d)}`
}

export function generateIdempotencyKey(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`
}

export function getClinicTimezone(): string {
  return process.env.NEXT_PUBLIC_CLINIC_TIMEZONE || "Asia/Manila"
}

export function toUTC(date: Date, time: string, timezone: string): Date {
  const [hours, minutes] = time.split(":").map(Number)
  const local = new Date(date)
  local.setHours(hours, minutes, 0, 0)
  return new Date(local.toLocaleString("en-US", { timeZone: timezone }))
}

export function fromUTC(date: Date, timezone: string): Date {
  return new Date(date.toLocaleString("en-US", { timeZone: timezone }))
}