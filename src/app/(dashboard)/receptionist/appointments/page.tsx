"use client"

import { useState, useEffect } from "react"
import { format, addMinutes, addDays, startOfWeek, addWeeks, subWeeks, startOfDay, endOfDay } from "date-fns"
import { useRouter } from "next/navigation"
import { ChevronLeft, ChevronRight, Loader2, Calendar, Clock, Search, UserPlus, Plus, Filter, X, Check, AlertCircle, Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import ReceptionistLayout from "../layout"
import { useSession } from "next-auth/react"

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

const actionConfig: Record<string, { label: string; variant: "default" | "outline" | "destructive" | "primary" | "ghost" }> = {
  confirm: { label: "Confirm", variant: "primary" },
  checkin: { label: "Check-In", variant: "default" },
  start: { label: "Start", variant: "default" },
  complete: { label: "Complete", variant: "default" },
  cancel: { label: "Cancel", variant: "destructive" },
  noshow: { label: "No-Show", variant: "destructive" },
}

const validActions: Record<string, string[]> = {
  PENDING: ["confirm", "cancel"],
  CONFIRMED: ["checkin", "cancel", "noshow"],
  CHECKED_IN: ["start", "cancel"],
  IN_PROGRESS: ["complete", "cancel"],
  COMPLETED: [],
  CANCELLED: [],
  NO_SHOW: [],
  RESCHEDULED: [],
}

export default function ReceptionistAppointmentsPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [appointments, setAppointments] = useState<any[]>([])
  const [dentists, setDentists] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [viewDate, setViewDate] = useState(new Date())
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [dentistFilter, setDentistFilter] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogAction, setDialogAction] = useState<{ type: string; appointment: any } | null>(null)
  const [cancelReason, setCancelReason] = useState("")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchData()
  }, [viewDate])

  const fetchData = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        startDate: startOfDay(viewDate).toISOString(),
        endDate: endOfDay(viewDate).toISOString(),
      })
      const [aptsRes, dentsRes] = await Promise.all([
        fetch(`/api/appointments?${params}`),
        fetch("/api/dentists"),
      ])
      const aptsData = await aptsRes.json()
      const dentsData = await dentsRes.json()
      setAppointments(aptsData.appointments)
      setDentists(dentsData)
    } catch (error) {
      console.error("Failed to fetch data:", error)
    } finally {
      setLoading(false)
    }
  }

  const filteredAppointments = appointments.filter((apt) => {
    if (search) {
      const searchLower = search.toLowerCase()
      const patientName = apt.patient?.user?.name?.toLowerCase() || ""
      const serviceName = apt.service?.name?.toLowerCase() || ""
      if (!patientName.includes(searchLower) && !serviceName.includes(searchLower)) return false
    }
    if (statusFilter && apt.status !== statusFilter) return false
    if (dentistFilter && apt.dentistId !== dentistFilter) return false
    return true
  })

  const handleAction = async (type: string, appointment: any) => {
    if (type === "cancel" || type === "noshow") {
      setDialogAction({ type, appointment })
      setCancelReason("")
      setDialogOpen(true)
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch(`/api/appointments/${appointment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: type }),
      })
      if (!res.ok) throw new Error("Failed")
      fetchData()
    } catch (error) {
      console.error("Action failed:", error)
    } finally {
      setSubmitting(false)
    }
  }

  const confirmDialog = async () => {
    if (!dialogAction) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/appointments/${dialogAction.appointment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: dialogAction.type, reason: cancelReason }),
      })
      if (!res.ok) throw new Error("Failed")
      setDialogOpen(false)
      setDialogAction(null)
      setCancelReason("")
      fetchData()
    } catch (error) {
      console.error("Action failed:", error)
    } finally {
      setSubmitting(false)
    }
  }

  const handleWalkIn = () => {
    router.push("/dashboard/receptionist/walk-in")
  }

  const today = new Date()
  const weekStart = startOfWeek(viewDate, { weekStartsOn: 1 })
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  return (
    <ReceptionistLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-page-title">Appointments</h1>
            <p className="text-meta">{format(viewDate, "EEEE, MMMM d, yyyy")}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setViewDate(subWeeks(viewDate, 1))}><ChevronLeft className="h-4 w-4" /></Button>
              <Button variant="outline" size="sm" onClick={() => setViewDate(addWeeks(viewDate, 1))}><ChevronRight className="h-4 w-4" /></Button>
            </div>
            <Button onClick={handleWalkIn}><Plus className="h-4 w-4 mr-2" /> Walk-In</Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                <Input
                  placeholder="Search patient or service..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All</SelectItem>
                    {Object.keys(statusConfig).map((s) => <SelectItem key={s} value={s}>{statusConfig[s].label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={dentistFilter} onValueChange={setDentistFilter}>
                  <SelectTrigger className="w-48"><SelectValue placeholder="Dentist" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Dentists</SelectItem>
                    {dentists.map((d: any) => <SelectItem key={d.id} value={d.id}>Dr. {d.user.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-accent" /></div>
            ) : filteredAppointments.length === 0 ? (
              <div className="text-center py-8 text-zinc-500">No appointments for this day</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Time</TableHead>
                      <TableHead>Patient</TableHead>
                      <TableHead>Service</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Dentist</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAppointments.map((apt) => (
                      <TableRow key={apt.id}>
                        <TableCell>
                          <div className="font-mono text-sm">{format(new Date(apt.startTime), "h:mm a")}</div>
                          <div className="text-xs text-zinc-500">{format(addMinutes(new Date(apt.startTime), apt.service.durationMinutes), "h:mm a")}</div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{apt.patient.user.name}</div>
                          <div className="text-sm text-zinc-500">{apt.patient.user.email}</div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: apt.service.color }} />
                            <span>{apt.service.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusConfig[apt.status]?.variant || "default"}>
                            {statusConfig[apt.status]?.label || apt.status}
                          </Badge>
                        </TableCell>
                        <TableCell>Dr. {apt.dentist.user.name}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {validActions[apt.status]?.map((action) => {
                              const config = actionConfig[action]
                              return (
                                <Button
                                  key={action}
                                  variant={config.variant}
                                  size="sm"
                                  onClick={() => handleAction(action, apt)}
                                  disabled={submitting}
                                >
                                  {config.label}
                                </Button>
                              )
                            })}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{dialogAction?.type === "cancel" ? "Cancel Appointment" : "Mark No-Show"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); confirmDialog() }}>
              <div className="space-y-4 py-4">
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  {dialogAction?.type === "cancel"
                    ? "Please provide a reason for cancellation"
                    : "Confirm marking as no-show"}
                </p>
                <div className="space-y-1.5">
                  <Label>Reason</Label>
                  <Textarea value={cancelReason} onChange={e => setCancelReason(e.target.value)} placeholder="Reason" rows={3} required />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); setDialogAction(null); setCancelReason("") }}>Cancel</Button>
                <Button type="submit" variant={dialogAction?.type === "cancel" ? "destructive" : "default"} disabled={submitting}>
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : (dialogAction?.type === "cancel" ? "Confirm Cancellation" : "Mark No-Show")}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </ReceptionistLayout>
  )
}