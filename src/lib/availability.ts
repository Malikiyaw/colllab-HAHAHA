import { prisma } from "@/lib/prisma"
import { format, startOfDay, endOfDay, addMinutes, isBefore, isAfter } from "date-fns"
import { getClinicTimezone } from "@/lib/utils"

export interface TimeSlot {
  startTime: Date
  endTime: Date
  available: boolean
}

export interface AvailabilityResult {
  slots: TimeSlot[]
  date: Date
  dentistId: string
  serviceId: string
}

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number)
  return hours * 60 + minutes
}

function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`
}

export async function getAvailableSlots(
  dentistId: string,
  serviceId: string,
  date: Date
): Promise<AvailabilityResult> {
  const timezone = getClinicTimezone()
  const dayOfWeek = date.getDay()

  const [dentist, service, clinicSchedule, holiday, blockedTimes, dentistSchedule, existingAppointments] = await Promise.all([
    prisma.dentist.findUnique({ where: { id: dentistId } }),
    prisma.service.findUnique({ where: { id: serviceId } }),
    prisma.clinicSchedule.findFirst({ where: { dayOfWeek } }),
    prisma.holiday.findFirst({ where: { date: startOfDay(date) } }),
    prisma.blockedTime.findMany({
      where: {
        OR: [{ dentistId }, { clinicWide: true }],
        startTime: { lt: endOfDay(date) },
        endTime: { gt: startOfDay(date) },
      },
    }),
    prisma.dentistSchedule.findFirst({ where: { dentistId, dayOfWeek } }),
    prisma.appointment.findMany({
      where: {
        dentistId,
        status: { notIn: ["CANCELLED", "NO_SHOW", "RESCHEDULED"] },
        startTime: { lt: endOfDay(date) },
        endTime: { gt: startOfDay(date) },
      },
    }),
  ])

  if (!dentist || !dentist.active) {
    throw new Error("Dentist not found or inactive")
  }
  if (!service || !service.active) {
    throw new Error("Service not found or inactive")
  }
  if (holiday?.allDay) {
    return { slots: [], date, dentistId, serviceId }
  }

  const clinicStart = clinicSchedule?.active ? timeToMinutes(clinicSchedule.startTime) : 9 * 60
  const clinicEnd = clinicSchedule?.active ? timeToMinutes(clinicSchedule.endTime) : 18 * 60

  const dentistStart = dentistSchedule?.active ? timeToMinutes(dentistSchedule.startTime) : clinicStart
  const dentistEnd = dentistSchedule?.active ? timeToMinutes(dentistSchedule.endTime) : clinicEnd

  const dayStart = Math.max(clinicStart, dentistStart)
  const dayEnd = Math.min(clinicEnd, dentistEnd)

  if (dayStart >= dayEnd) {
    return { slots: [], date, dentistId, serviceId }
  }

  const duration = service.durationMinutes + service.bufferBeforeMinutes + service.bufferAfterMinutes
  const interval = 15
  const slots: TimeSlot[] = []

  let current = dayStart
  while (current + duration <= dayEnd) {
    const slotStart = new Date(date)
    slotStart.setHours(Math.floor(current / 60), current % 60, 0, 0)

    const slotEnd = addMinutes(slotStart, duration)

    const isBlocked = blockedSome(blockedTimes, slotStart, slotEnd)
    const hasConflict = existingAppointments.some((apt) =>
      isBefore(slotStart, apt.endTime) && isAfter(slotEnd, apt.startTime)
    )

    slots.push({
      startTime: slotStart,
      endTime: slotEnd,
      available: !isBlocked && !hasConflict,
    })

    current += interval
  }

  return { slots, date, dentistId, serviceId }
}

function blockedSome(blockedTimes: Array<{ startTime: Date; endTime: Date }>, start: Date, end: Date): boolean {
  return blockedSomeRange(blockedTimes, start, end)
}

function blockedSomeRange(
  blockedTimes: Array<{ startTime: Date; endTime: Date }>,
  start: Date,
  end: Date
): boolean {
  return blockedTimes.some((blocked) =>
    isBefore(start, blocked.endTime) && isAfter(end, blocked.startTime)
  )
}

export async function checkSlotAvailability(
  dentistId: string,
  serviceId: string,
  startTime: Date,
  endTime: Date
): Promise<boolean> {
  const [blockedTimes, existingAppointments] = await Promise.all([
    prisma.blockedTime.findMany({
      where: {
        OR: [{ dentistId }, { clinicWide: true }],
        startTime: { lt: endTime },
        endTime: { gt: startTime },
      },
    }),
    prisma.appointment.findFirst({
      where: {
        dentistId,
        status: { notIn: ["CANCELLED", "NO_SHOW", "RESCHEDULED"] },
        startTime: { lt: endTime },
        endTime: { gt: startTime },
      },
    }),
  ])

  if (blockedSomeRange(blockedTimes, startTime, endTime)) {
    return false
  }

  return !existingAppointments
}