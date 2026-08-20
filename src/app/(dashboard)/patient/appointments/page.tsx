"use client"

import { useState, useEffect } from "react"
import { format, isPast, addMinutes } from "date-fns"
import Link from "next/link"
import { Loader2, Calendar, Clock, XCircle, CheckCircle, ArrowRight, AlertCircle, Bell, Clock as ClockIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import PatientLayout from "../layout"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"

const statusConfig: Record<string, { label: string; variant: "default" | "success" | "destructive" | "warning" | "info" | "secondary" }> = {
  PENDING: { label: "Pending", variant: "warning" },
  CONFIRMED: { label: "Confirmed", variant: "success" },
  CHECKED_IN: { label: "Checked In", variant: "info" },
  IN_PROGRESS: { label: "In Progress", variant: "info" },
  COMPLETED: { label: "Completed", variant: "default" },
  CANCELLED: { label: "Cancelled", variant: "destructive" },
  NO_SHOW: { label: "No Show", variant: "destructive" },
  RESCHEDULED: { label: "Rescheduled", variant: "info" },
}

export default function PatientAppointmentsPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [appointments, setAppointments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [cancelReason, setCancelReason] = useState("")

  useEffect(() => {
    fetchAppointments()
  }, [])

  const fetchAppointments = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/appointments")
      const data = await res.json()
      setAppointments(data.appointments)
    } catch (error) {
      console.error("Failed to fetch appointments:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = async (id: string) => {
    setCancellingId(id)
    setCancelDialogOpen(true)
  }

  const confirmCancel = async () => {
    if (!cancellingId || !cancelReason.trim()) return
    try {
      const res = await fetch(`/api/appointments/${cancellingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel", reason: cancelReason }),
      })
      if (!res.ok) throw new Error("Failed to cancel")
      setCancelDialogOpen(false)
      setCancellingId(null)
      setCancelReason("")
      fetchAppointments()
    } catch (error) {
      console.error("Cancel failed:", error)
    }
  }

  const handleReschedule = (appointment: any) => {
    const params = new URLSearchParams({
      serviceId: appointment.serviceId,
      dentistId: appointment.dentistId,
      date: format(new Date(appointment.startTime), "yyyy-MM-dd"),
    })
    router.push(`/dashboard/patient/booking?${params}`)
  }

  const canCancel = (apt: any) => {
    const now = new Date()
    const startTime = new Date(apt.startTime)
    return ["PENDING", "CONFIRMED"].includes(apt.status) && startTime > now
  }

  const canReschedule = (apt: any) => {
    const now = new Date()
    const startTime = new Date(apt.startTime)
    return ["PENDING", "CONFIRMED"].includes(apt.status) && startTime > now
  }

  const isUpcoming = (apt: any) => {
    return new Date(apt.startTime) > new Date() && !["CANCELLED", "NO_SHOW", "COMPLETED", "RESCHEDULED"].includes(apt.status)
  }

  if (!session) return null

  const upcoming = appointments.filter(isUpcoming)
  const past = appointments.filter(a => !isUpcoming(a))

  return (
    <PatientLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-page-title">My Appointments</h1>
          <p className="text-meta">Manage your upcoming and past appointments</p>
        </div>

        {upcoming.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-section">Upcoming ({upcoming.length})</h2>
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date & Time</TableHead>
                      <TableHead>Service</TableHead>
                      <TableHead>Dentist</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {upcoming.map((apt) => (
                      <TableRow key={apt.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{format(new Date(apt.startTime), "MMM d, yyyy")}</p>
                            <p className="text-sm text-zinc-500">
                              {format(new Date(apt.startTime), "h:mm a")} – {format(addMinutes(new Date(apt.startTime), apt.service.durationMinutes), "h:mm a")}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: apt.service.color }} />
                            <span>{apt.service.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>Dr. {apt.dentist.user.name}</TableCell>
                        <TableCell>
                          <Badge variant={statusConfig[apt.status]?.variant || "default"}>
                            {statusConfig[apt.status]?.label || apt.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {canReschedule(apt) && (
                              <Button variant="outline" size="sm" onClick={() => handleReschedule(apt)}>
                                <ArrowRight className="h-4 w-4 mr-2" />
                                Reschedule
                              </Button>
                            )}
                            {canCancel(apt) && (
                              <Button variant="outline" size="sm" onClick={() => handleCancel(apt.id)}>
                                <XCircle className="h-4 w-4 mr-2" />
                                Cancel
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </section>
        )}

        {past.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-section">History ({past.length})</h2>
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date & Time</TableHead>
                      <TableHead>Service</TableHead>
                      <TableHead>Dentist</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {past.map((apt) => (
                      <TableRow key={apt.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{format(new Date(apt.startTime), "MMM d, yyyy")}</p>
                            <p className="text-sm text-zinc-500">
                              {format(new Date(apt.startTime), "h:mm a")} – {format(addMinutes(new Date(apt.startTime), apt.service.durationMinutes), "h:mm a")}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: apt.service.color }} />
                            <span>{apt.service.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>Dr. {apt.dentist.user.name}</TableCell>
                        <TableCell>
                          <Badge variant={statusConfig[apt.status]?.variant || "default"}>
                            {statusConfig[apt.status]?.label || apt.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {apt.notes && (
                            <Button variant="ghost" size="sm">
                              View Notes
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </section>
        )}

        {appointments.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <Calendar className="h-12 w-12 mx-auto text-zinc-300 dark:text-zinc-700 mb-4" />
              <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-2">No appointments yet</h3>
              <p className="text-zinc-500 dark:text-zinc-400 mb-6">Book your first appointment to get started</p>
              <Button asChild>
                <Link href="/dashboard/patient/booking">Book Appointment</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cancel Appointment</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); confirmCancel() }}>
              <div className="space-y-4 py-4">
                <p className="text-sm text-zinc-600 dark:text-zinc-400">Please provide a reason for cancellation</p>
                <div className="space-y-1.5">
                  <Label>Reason</Label>
                  <Textarea value={cancelReason} onChange={e => setCancelReason(e.target.value)} placeholder="Reason for cancellation" rows={3} required />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => { setCancelDialogOpen(false); setCancellingId(null); setCancelReason("") }}>Cancel</Button>
                <Button type="submit" variant="destructive">Confirm Cancellation</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </PatientLayout>
  )
}