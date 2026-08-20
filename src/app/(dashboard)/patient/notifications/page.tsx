"use client"

import { useState, useEffect } from "react"
import { format, formatDistanceToNow } from "date-fns"
import { Bell, Check, Mail, Loader2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import PatientLayout from "../layout"
import { useSession } from "next-auth/react"

const typeIcons: Record<string, React.ReactNode> = {
  EMAIL: <Mail className="h-4 w-4" />,
  SMS: <Bell className="h-4 w-4" />,
  PUSH: <Bell className="h-4 w-4" />,
}

export default function NotificationsPage() {
  const { data: session } = useSession()
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    fetchNotifications()
  }, [])

  const fetchNotifications = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/notifications?limit=50")
      const data = await res.json()
      setNotifications(data)
      setUnreadCount(data.filter((n: any) => n.status === "PENDING").length)
    } catch (error) {
      console.error("Failed to fetch notifications:", error)
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (ids: string[]) => {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationIds: ids, markAsRead: true }),
      })
      setNotifications(prev => prev.map(n => ids.includes(n.id) ? { ...n, status: "SENT" } : n))
      setUnreadCount(prev => Math.max(0, prev - ids.length))
    } catch (error) {
      console.error("Failed to mark as read:", error)
    }
  }

  const markAllAsRead = () => {
    const unreadIds = notifications.filter(n => n.status === "PENDING").map(n => n.id)
    if (unreadIds.length > 0) markAsRead(unreadIds)
  }

  if (!session) return null

  return (
    <PatientLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-page-title">Notifications</h1>
            <p className="text-meta">Your appointment reminders and updates</p>
          </div>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllAsRead}>
              <Check className="h-4 w-4 mr-2" />
              Mark all as read
            </Button>
          )}
        </div>

        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-accent" /></div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-12">
                <Bell className="h-12 w-12 mx-auto text-zinc-300 dark:text-zinc-700 mb-4" />
                <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-2">No notifications</h3>
                <p className="text-zinc-500 dark:text-zinc-400">You're all caught up!</p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-200 dark:divide-zinc-700">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 flex items-start gap-4 transition-colors ${notification.status === "PENDING" ? "bg-zinc-50 dark:bg-zinc-900" : ""}`}
                  >
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                      {typeIcons[notification.type] || <Bell className="h-5 w-5 text-orange-600" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className={`font-medium ${notification.status === "PENDING" ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-600 dark:text-zinc-400"}`}>
                            {notification.subject}
                          </p>
                          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2">
                            {notification.body}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-xs text-zinc-400 whitespace-nowrap">
                            {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                          </span>
                          {notification.status === "PENDING" && (
                            <Badge variant="primary" className="text-xs">New</Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="secondary" className="text-xs capitalize">
                          {notification.type.toLowerCase()}
                        </Badge>
                        {notification.status === "PENDING" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => markAsRead([notification.id])}
                            className="h-7 px-2 py-1"
                          >
                            <Check className="h-3 w-3 mr-1" />
                            Mark read
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PatientLayout>
  )
}