import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { hashPassword } from "@/lib/password"
import { z } from "zod"
import { createAuditLog, AuditActions } from "@/lib/audit"

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, password } = registerSchema.parse(body)

    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) {
      return NextResponse.json(
        { error: { code: "AUTH_EMAIL_ALREADY_EXISTS", message: "Email already registered" } },
        { status: 400 }
      )
    }

    const passwordHash = await hashPassword(password)

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: "PATIENT",
      },
    })

    await prisma.patient.create({
      data: { userId: user.id },
    })

    await createAuditLog({
      userId: user.id,
      action: AuditActions.AUTH_REGISTER,
      entity: "User",
      entityId: user.id,
      metadata: { email, role: "PATIENT" },
    })

    return NextResponse.json({ id: user.id, name: user.name, email: user.email }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: error.issues[0].message } },
        { status: 400 }
      )
    }
    console.error("Registration error:", error)
    return NextResponse.json(
      { error: { code: "INTERNAL_SERVER_ERROR", message: "Registration failed" } },
      { status: 500 }
    )
  }
}