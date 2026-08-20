import { prisma } from "@/lib/prisma"
import { NotificationType, NotificationStatus } from "@/generated/prisma"

interface CreateNotificationInput {
  userId: string
  type: NotificationType
  subject?: string
  body: string
  scheduledFor?: Date
}

export async function createNotification(input: CreateNotificationInput) {
  return prisma.notification.create({
    data: input,
  })
}

export async function getPendingNotifications(limit = 100) {
  const now = new Date()
  return prisma.notification.findMany({
    where: {
      status: NotificationStatus.PENDING,
      OR: [
        { scheduledFor: null },
        { scheduledFor: { lte: now } },
      ],
    },
    take: limit,
    orderBy: { createdAt: "asc" },
    include: { user: true },
  })
}

export async function markNotificationSent(id: string) {
  return prisma.notification.update({
    where: { id },
    data: { status: NotificationStatus.SENT, sentAt: new Date() },
  })
}

export async function markNotificationFailed(id: string) {
  return prisma.notification.update({
    where: { id },
    data: { status: NotificationStatus.FAILED },
  })
}

export async function getUserNotifications(userId: string, unreadOnly = false) {
  return prisma.notification.findMany({
    where: {
      userId,
      ...(unreadOnly ? { status: NotificationStatus.PENDING } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  })
}

export async function markAsRead(id: string) {
  return prisma.notification.update({
    where: { id },
    data: { status: NotificationStatus.SENT, sentAt: new Date() },
  })
}