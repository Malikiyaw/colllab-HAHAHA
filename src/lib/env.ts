import { z } from "zod"

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  AUTH_SECRET: z.string().min(32),
  AUTH_URL: z.string().url(),
  NEXTAUTH_URL: z.string().url().default("http://localhost:3000"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  SMTP_HOST: z.string().default("localhost"),
  SMTP_PORT: z.coerce.number().default(1025),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  EMAIL_FROM: z.string().email().default("noreply@dentalclinic.local"),
  NEXT_PUBLIC_CLINIC_NAME: z.string().default("Dental Clinic"),
  NEXT_PUBLIC_CLINIC_TIMEZONE: z.string().default("Asia/Manila"),
  NEXT_PUBLIC_DEFAULT_CURRENCY: z.string().default("PHP"),
})

export const env = envSchema.parse(process.env)