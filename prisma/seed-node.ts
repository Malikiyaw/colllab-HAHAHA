import { PrismaClient } from "@/generated/prisma"
import { PrismaPg } from "@prisma/adapter-pg"
import { Pool } from "pg"
import { Role } from "@/generated/prisma"
import { hashPassword } from "@/lib/password"

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)

const prisma = new PrismaClient({
  adapter,
})

async function upsertServiceCategory(name: string, description: string) {
  const existing = await prisma.serviceCategory.findFirst({ where: { name } })
  if (existing) return existing
  return prisma.serviceCategory.create({
    data: { name, description, active: true },
  })
}

async function upsertDentistSchedule(dentistId: string, dayOfWeek: number, startTime: string, endTime: string) {
  const existing = await prisma.dentistSchedule.findFirst({ where: { dentistId, dayOfWeek } })
  if (existing) {
    return prisma.dentistSchedule.update({
      where: { id: existing.id },
      data: { startTime, endTime, active: true },
    })
  }
  return prisma.dentistSchedule.create({
    data: { dentistId, dayOfWeek, startTime, endTime, active: true },
  })
}

async function upsertClinicSchedule(id: string, dayOfWeek: number, startTime: string, endTime: string) {
  const existing = await prisma.clinicSchedule.findUnique({ where: { id } })
  if (existing) {
    return prisma.clinicSchedule.update({
      where: { id },
      data: { startTime, endTime, active: true },
    })
  }
  return prisma.clinicSchedule.create({
    data: { id, dayOfWeek, startTime, endTime, active: true },
  })
}

async function main() {
  try {
    console.log("Seeding database...")

    const passwordHash = await hashPassword("password123")

    // Create admin user
    const adminUser = await prisma.user.upsert({
      where: { email: "admin@dentalclinic.local" },
      update: {},
      create: {
        email: "admin@dentalclinic.local",
        name: "Admin User",
        passwordHash,
        role: Role.SUPER_ADMIN,
        active: true,
      },
    })
    console.log("Created admin user:", adminUser.email)

    // Create receptionist
    const receptionistUser = await prisma.user.upsert({
      where: { email: "reception@dentalclinic.local" },
      update: {},
      create: {
        email: "reception@dentalclinic.local",
        name: "Receptionist User",
        passwordHash,
        role: Role.RECEPTIONIST,
        active: true,
      },
    })
    await prisma.staff.upsert({
      where: { userId: receptionistUser.id },
      update: {},
      create: {
        userId: receptionistUser.id,
        position: "Front Desk",
        active: true,
      },
    })
    console.log("Created receptionist:", receptionistUser.email)

    // Create dentist
    const dentistUser = await prisma.user.upsert({
      where: { email: "dentist@dentalclinic.local" },
      update: {},
      create: {
        email: "dentist@dentalclinic.local",
        name: "Dr. Santos",
        passwordHash,
        role: Role.DENTIST,
        active: true,
      },
    })
    const dentist = await prisma.dentist.upsert({
      where: { userId: dentistUser.id },
      update: {},
      create: {
        userId: dentistUser.id,
        specialization: "General Dentistry",
        licenseNumber: "DENT-001",
        bio: "General dentist with 10 years experience",
        active: true,
        color: "#EA580C",
      },
    })
    console.log("Created dentist:", dentistUser.email)

    // Create second dentist
    const dentistUser2 = await prisma.user.upsert({
      where: { email: "dentist2@dentalclinic.local" },
      update: {},
      create: {
        email: "dentist2@dentalclinic.local",
        name: "Dr. Reyes",
        passwordHash,
        role: Role.DENTIST,
        active: true,
      },
    })
    const dentist2 = await prisma.dentist.upsert({
      where: { userId: dentistUser2.id },
      update: {},
      create: {
        userId: dentistUser2.id,
        specialization: "Orthodontics",
        licenseNumber: "DENT-002",
        bio: "Orthodontist with 8 years experience",
        active: true,
        color: "#2563EB",
      },
    })
    console.log("Created dentist:", dentistUser2.email)

    // Create patient
    const patientUser = await prisma.user.upsert({
      where: { email: "patient@dentalclinic.local" },
      update: {},
      create: {
        email: "patient@dentalclinic.local",
        name: "Maria Santos",
        passwordHash,
        role: Role.PATIENT,
        active: true,
      },
    })
    await prisma.patient.upsert({
      where: { userId: patientUser.id },
      update: {},
      create: {
        userId: patientUser.id,
        dateOfBirth: new Date("1990-05-15"),
        address: "123 Main St, Manila",
        emergencyContactName: "Juan Santos",
        emergencyContactPhone: "+63 912 345 6789",
        medicalNotes: "No known allergies",
      },
    })
    console.log("Created patient:", patientUser.email)

    // Create service categories
    const preventiveCategory = await upsertServiceCategory("Preventive", "Preventive dental care")
    const restorativeCategory = await upsertServiceCategory("Restorative", "Restorative dental procedures")
    const surgicalCategory = await upsertServiceCategory("Surgical", "Surgical dental procedures")

    // Create services
    const cleaning = await prisma.service.upsert({
      where: { id: "cleaning" },
      update: {},
      create: {
        id: "cleaning",
        categoryId: preventiveCategory.id,
        name: "Dental Cleaning",
        description: "Routine prophylaxis cleaning",
        durationMinutes: 30,
        price: 800,
        bufferBeforeMinutes: 5,
        bufferAfterMinutes: 5,
        active: true,
        color: "#16A34A",
      },
    })

    const filling = await prisma.service.upsert({
      where: { id: "filling" },
      update: {},
      create: {
        id: "filling",
        categoryId: restorativeCategory.id,
        name: "Composite Filling",
        description: "Tooth-colored composite filling",
        durationMinutes: 45,
        price: 1200,
        bufferBeforeMinutes: 5,
        bufferAfterMinutes: 5,
        active: true,
        color: "#D97706",
      },
    })

    const consultation = await prisma.service.upsert({
      where: { id: "consultation" },
      update: {},
      create: {
        id: "consultation",
        categoryId: preventiveCategory.id,
        name: "Consultation",
        description: "General dental consultation",
        durationMinutes: 30,
        price: 500,
        bufferBeforeMinutes: 5,
        bufferAfterMinutes: 5,
        active: true,
        color: "#2563EB",
      },
    })

    const extraction = await prisma.service.upsert({
      where: { id: "extraction" },
      update: {},
      create: {
        id: "extraction",
        categoryId: surgicalCategory.id,
        name: "Simple Extraction",
        description: "Simple tooth extraction",
        durationMinutes: 60,
        price: 2000,
        bufferBeforeMinutes: 10,
        bufferAfterMinutes: 10,
        active: true,
        color: "#DC2626",
      },
    })
    console.log("Created services")

    // Assign services to dentists
    await prisma.dentistService.upsert({
      where: { dentistId_serviceId: { dentistId: dentist.id, serviceId: cleaning.id } },
      update: {},
      create: { dentistId: dentist.id, serviceId: cleaning.id, active: true },
    })
    await prisma.dentistService.upsert({
      where: { dentistId_serviceId: { dentistId: dentist.id, serviceId: filling.id } },
      update: {},
      create: { dentistId: dentist.id, serviceId: filling.id, active: true },
    })
    await prisma.dentistService.upsert({
      where: { dentistId_serviceId: { dentistId: dentist.id, serviceId: consultation.id } },
      update: {},
      create: { dentistId: dentist.id, serviceId: consultation.id, active: true },
    })
    await prisma.dentistService.upsert({
      where: { dentistId_serviceId: { dentistId: dentist.id, serviceId: extraction.id } },
      update: {},
      create: { dentistId: dentist.id, serviceId: extraction.id, active: true },
    })
    await prisma.dentistService.upsert({
      where: { dentistId_serviceId: { dentistId: dentist2.id, serviceId: cleaning.id } },
      update: {},
      create: { dentistId: dentist2.id, serviceId: cleaning.id, active: true },
    })
    await prisma.dentistService.upsert({
      where: { dentistId_serviceId: { dentistId: dentist2.id, serviceId: consultation.id } },
      update: {},
      create: { dentistId: dentist2.id, serviceId: consultation.id, active: true },
    })
    console.log("Assigned services to dentists")

    // Create dentist schedules
    const days = [1, 2, 3, 4, 5, 6]
    for (const day of days) {
      const startTime = day === 6 ? "09:00" : "09:00"
      const endTime = day === 6 ? "15:00" : "17:00"
      await upsertDentistSchedule(dentist.id, day, startTime, endTime)
      await upsertDentistSchedule(dentist2.id, day, startTime, endTime)
    }
    console.log("Created dentist schedules")

    // Create clinic schedules
    for (const day of days) {
      const startTime = day === 6 ? "09:00" : "09:00"
      const endTime = day === 6 ? "15:00" : "18:00"
      await upsertClinicSchedule(`clinic-${day}`, day, startTime, endTime)
    }
    console.log("Created clinic schedules")

    // Create settings
    await prisma.setting.upsert({
      where: { key: "clinic_name" },
      update: {},
      create: { key: "clinic_name", value: "Dental Clinic" },
    })
    await prisma.setting.upsert({
      where: { key: "timezone" },
      update: {},
      create: { key: "timezone", value: "Asia/Manila" },
    })
    await prisma.setting.upsert({
      where: { key: "currency" },
      update: {},
      create: { key: "currency", value: "PHP" },
    })
    await prisma.setting.upsert({
      where: { key: "reminder_hours" },
      update: {},
      create: { key: "reminder_hours", value: [24, 1] },
    })
    await prisma.setting.upsert({
      where: { key: "waitlist_notify_window_hours" },
      update: {},
      create: { key: "waitlist_notify_window_hours", value: 2 },
    })
    await prisma.setting.upsert({
      where: { key: "grace_period_minutes" },
      update: {},
      create: { key: "grace_period_minutes", value: 15 },
    })
    console.log("Created settings")

    console.log("Seeding completed!")
  } catch (error) {
    console.error("Seed error:", error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
    await pool.end()
  }
}

main()