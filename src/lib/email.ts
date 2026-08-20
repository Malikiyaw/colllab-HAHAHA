import nodemailer from "nodemailer"
import { env } from "@/lib/env"

let transporter: nodemailer.Transporter | null = null

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: env.SMTP_USER && env.SMTP_PASSWORD ? {
        user: env.SMTP_USER,
        pass: env.SMTP_PASSWORD,
      } : undefined,
    })
  }
  return transporter
}

interface EmailOptions {
  to: string
  subject: string
  text: string
  html?: string
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    const transport = getTransporter()
    await transport.sendMail({
      from: env.EMAIL_FROM,
      ...options,
    })
    return true
  } catch (error) {
    console.error("Failed to send email:", error)
    return false
  }
}

export const emailTemplates = {
  appointmentBooked: (data: {
    patientName: string
    serviceName: string
    dentistName: string
    date: string
    time: string
  }) => ({
    subject: `Appointment Confirmed - ${data.serviceName}`,
    text: `Dear ${data.patientName},\n\nYour appointment for ${data.serviceName} with ${data.dentistName} has been booked for ${data.date} at ${data.time}.\n\nThank you for choosing our clinic.`,
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #EA580C;">Appointment Confirmed</h2>
        <p>Dear ${data.patientName},</p>
        <p>Your appointment has been booked successfully:</p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr><td style="padding: 8px; border-bottom: 1px solid #D4D4D8;"><strong>Service</strong></td><td style="padding: 8px; border-bottom: 1px solid #D4D4D8;">${data.serviceName}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #D4D4D8;"><strong>Dentist</strong></td><td style="padding: 8px; border-bottom: 1px solid #D4D4D8;">${data.dentistName}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #D4D4D8;"><strong>Date</strong></td><td style="padding: 8px; border-bottom: 1px solid #D4D4D8;">${data.date}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #D4D4D8;"><strong>Time</strong></td><td style="padding: 8px; border-bottom: 1px solid #D4D4D8;">${data.time}</td></tr>
        </table>
        <p>Thank you for choosing our clinic.</p>
      </div>
    `,
  }),

  appointmentCancelled: (data: {
    patientName: string
    serviceName: string
    dentistName: string
    date: string
    time: string
    reason?: string
  }) => ({
    subject: `Appointment Cancelled - ${data.serviceName}`,
    text: `Dear ${data.patientName},\n\nYour appointment for ${data.serviceName} with ${data.dentistName} on ${data.date} at ${data.time} has been cancelled.${data.reason ? ` Reason: ${data.reason}` : ""}\n\nYou can book a new appointment at any time.`,
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #DC2626;">Appointment Cancelled</h2>
        <p>Dear ${data.patientName},</p>
        <p>Your appointment has been cancelled:</p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr><td style="padding: 8px; border-bottom: 1px solid #D4D4D8;"><strong>Service</strong></td><td style="padding: 8px; border-bottom: 1px solid #D4D4D8;">${data.serviceName}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #D4D4D8;"><strong>Dentist</strong></td><td style="padding: 8px; border-bottom: 1px solid #D4D4D8;">${data.dentistName}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #D4D4D8;"><strong>Date</strong></td><td style="padding: 8px; border-bottom: 1px solid #D4D4D8;">${data.date}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #D4D4D8;"><strong>Time</strong></td><td style="padding: 8px; border-bottom: 1px solid #D4D4D8;">${data.time}</td></tr>
        </table>
        ${data.reason ? `<p><strong>Reason:</strong> ${data.reason}</p>` : ""}
        <p>You can book a new appointment at any time.</p>
      </div>
    `,
  }),

  appointmentReminder: (data: {
    patientName: string
    serviceName: string
    dentistName: string
    date: string
    time: string
    hoursUntil: number
  }) => ({
    subject: `Reminder: Appointment in ${data.hoursUntil} hour(s)`,
    text: `Dear ${data.patientName},\n\nThis is a reminder that you have an appointment for ${data.serviceName} with ${data.dentistName} in ${data.hoursUntil} hour(s) on ${data.date} at ${data.time}.\n\nPlease arrive 10 minutes before your scheduled time.`,
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563EB;">Appointment Reminder</h2>
        <p>Dear ${data.patientName},</p>
        <p>This is a reminder that you have an appointment in <strong>${data.hoursUntil} hour(s)</strong>:</p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr><td style="padding: 8px; border-bottom: 1px solid #D4D4D8;"><strong>Service</strong></td><td style="padding: 8px; border-bottom: 1px solid #D4D4D8;">${data.serviceName}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #D4D4D8;"><strong>Dentist</strong></td><td style="padding: 8px; border-bottom: 1px solid #D4D4D8;">${data.dentistName}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #D4D4D8;"><strong>Date</strong></td><td style="padding: 8px; border-bottom: 1px solid #D4D4D8;">${data.date}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #D4D4D8;"><strong>Time</strong></td><td style="padding: 8px; border-bottom: 1px solid #D4D4D8;">${data.time}</td></tr>
        </table>
        <p>Please arrive 10 minutes before your scheduled time.</p>
      </div>
    `,
  }),

  waitlistAvailable: (data: {
    patientName: string
    serviceName: string
    dentistName: string
    date: string
    time: string
    expiresAt: string
  }) => ({
    subject: `Slot Available - ${data.serviceName}`,
    text: `Dear ${data.patientName},\n\nA slot for ${data.serviceName} with ${data.dentistName} has become available on ${data.date} at ${data.time}.\n\nPlease book within the next 2 hours at ${env.NEXTAUTH_URL}/booking to secure this slot.\n\nThis offer expires at ${data.expiresAt}.`,
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #16A34A;">Slot Available</h2>
        <p>Dear ${data.patientName},</p>
        <p>A slot you were waiting for has become available:</p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr><td style="padding: 8px; border-bottom: 1px solid #D4D4D8;"><strong>Service</strong></td><td style="padding: 8px; border-bottom: 1px solid #D4D4D8;">${data.serviceName}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #D4D4D8;"><strong>Dentist</strong></td><td style="padding: 8px; border-bottom: 1px solid #D4D4D8;">${data.dentistName}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #D4D4D8;"><strong>Date</strong></td><td style="padding: 8px; border-bottom: 1px solid #D4D4D8;">${data.date}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #D4D4D8;"><strong>Time</strong></td><td style="padding: 8px; border-bottom: 1px solid #D4D4D8;">${data.time}</td></tr>
        </table>
        <p>Please book within the next 2 hours to secure this slot.</p>
        <p><strong>Offer expires:</strong> ${data.expiresAt}</p>
        <p><a href="${env.NEXTAUTH_URL}/booking" style="color: #EA580C;">Book Now</a></p>
      </div>
    `,
  }),
}