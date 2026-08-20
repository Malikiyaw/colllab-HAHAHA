"use client"

import { useState, useEffect } from "react"
import { format, addMinutes, isSameDay, startOfDay, endOfDay } from "date-fns"
import { ChevronLeft, ChevronRight, Loader2, Calendar, Clock, FileText, CheckCircle, PlayCircle, AlertCircle, Stethoscope } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import DentistLayout from "../layout"
import { useSession } from "next-auth/react"

const statusConfig: Record<string, { label: string; variant: "default" | "primary" | "destructive" | "warning" | "info" | "secondary" | "outline" | "success" }> = {
  PENDING: { label: "Pending", variant: "warning" },
  CONFIRMED: { label: "Confirmed", variant: "primary" },
  CHECKED_IN: { label: "Checked In", variant: "info" },
  IN_PROGRESS: { label: "In Progress", variant: "info" },
  COMPLETED: { label: "Completed", variant: "default" },
  CANCELLED: { label: "Cancelled", variant: "destructive" },
  NO_SHOW: { label: "No Show", variant: "destructive" },
  RESCHEDULED: { label: "Rescheduled", variant: "info" },
}

const validActions: Record<string, string[]> = {
  PENDING: [],
  CONFIRMED: [],
  CHECKED_IN: ["start"],
  IN_PROGRESS: ["complete"],
  COMPLETED: [],
  CANCELLED: [],
  NO_SHOW: [],
  RESCHEDULED: [],
}

export default function DentistSchedulePage() {
  const { data: session } = useSession()
  const [appointments, setAppointments] = useState<any[]>([])
  const [selectedAppointment, setSelectedAppointment] = useState<any | null>(null)
  const [clinicalNotes, setClinicalNotes] = useState("")
  const [loading, setLoading] = useState(true)
  const [viewDate, setViewDate] = useState(new Date())
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogAction, setDialogAction] = useState<"start" | "complete" | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchAppointments()
  }, [viewDate])

  const fetchAppointments = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        startDate: startOfDay(viewDate).toISOString(),
        endDate: endOfDay(viewDate).toISOString(),
      })
      const res = await fetch(`/api/appointments?${params}`)
      const data = await res.json()
      setAppointments(data.appointments)
    } catch (error) {
      console.error("Failed to fetch appointments:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleAction = async (type: "start" | "complete", appointment: any) => {
    if (type === "complete") {
      setSelectedAppointment(appointment)
      setClinicalNotes("")
      setDialogAction(type)
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
      fetchAppointments()
    } catch (error) {
      console.error("Action failed:", error)
    } finally {
      setSubmitting(false)
    }
  }

  const confirmComplete = async () => {
    if (!selectedAppointment) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/appointments/${selectedAppointment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "complete", note: clinicalNotes }),
      })
      if (!res.ok) throw new Error("Failed")
      setDialogOpen(false)
      setSelectedAppointment(null)
      setClinicalNotes("")
      setDialogAction(null)
      fetchAppointments()
    } catch (error) {
      console.error("Complete failed:", error)
    } finally {
      setSubmitting(false)
    }
  }

  const confirmAction = async () => {
    if (!selectedAppointment || !dialogAction) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/appointments/${selectedAppointment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: dialogAction, note: clinicalNotes }),
      })
      if (!res.ok) throw new Error("Failed")
      setDialogOpen(false)
      setDialogAction(null)
      setSelectedAppointment(null)
      setClinicalNotes("")
      fetchAppointments()
    } catch (error) {
      console.error("Action failed:", error)
    } finally {
      setSubmitting(false)
    }
  }

  const today = new Date()
  const weekStart = startOfWeek(viewDate, { weekStartsOn: 1 })
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  const todaysAppointments = appointments.filter(apt => isSameDay(new Date(apt.startTime), viewDate))
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())

  return (
    <DentistLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-page-title">Today's Schedule</h1>
            <p className="text-meta">{format(viewDate, "EEEE, MMMM d, yyyy")}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setViewDate(subDays(viewDate, 1))}><ChevronLeft className="h-4 w-4" /></Button>
            <Button variant="outline" size="sm" onClick={() => setViewDate(addDays(viewDate, 1))}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Appointments</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-accent" /></div>
                ) : todaysAppointments.length === 0 ? (
                  <div className="text-center py-8 text-zinc-500">
                    <Calendar className="h-12 w-12 mx-auto text-zinc-300 dark:text-zinc-700 mb-4" />
                    <p>No appointments scheduled for today</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Time</TableHead>
                        <TableHead>Patient</TableHead>
                        <TableHead>Service</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {todaysAppointments.map((apt) => (
                        <TableRow key={apt.id}>
                          <TableCell>
                            <div className="font-mono text-sm">{format(new Date(apt.startTime), "h:mm a")}</div>
                            <div className="text-xs text-zinc-500">{format(addMinutes(new Date(apt.startTime), apt.service.durationMinutes), "h:mm a")}</div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{apt.patient.user.name}</div>
                            <div className="text-sm text-zinc-500">{apt.patient.user.phone || "No phone"}</div>
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
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              {validActions[apt.status]?.map((action) => {
                                const config = action === "start" ? { label: "Start", variant: "primary" as const } : { label: "Complete", variant: "primary" as const }
                                return (
                                  <Button
                                    key={action}
                                    variant={config.variant}
                                    size="sm"
                                    onClick={() => handleAction(action as "start" | "complete", apt)}
                                    disabled={submitting}
                                  >
                                    {action === "start" ? <PlayCircle className="h-4 w-4 mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                                    {config.label}
                                  </Button>
                                )
                              })}
                              <Button variant="ghost" size="sm" onClick={() => { setSelectedAppointment(apt); setDialogAction(null); setDialogOpen(true) }}>
                                <FileText className="h-4 w-4 mr-2" />
                                Notes
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Patient Details</CardTitle>
              </CardHeader>
              <CardContent>
                {selectedAppointment ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: selectedAppointment.service.color }} />
                      <div>
                        <p className="font-medium">{selectedAppointment.patient.user.name}</p>
                        <p className="text-sm text-zinc-500">{selectedAppointment.service.name} · Dr. {selectedAppointment.dentist.user.name}</p>
                      </div>
                    </div>
                    <Separator />
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div><span className="text-zinc-500">DOB:</span> {selectedAppointment.patient.dateOfBirth ? format(new Date(selectedAppointment.patient.dateOfBirth), "MMM d, yyyy") : "—"}</div>
                      <div><span className="text-zinc-500">Phone:</span> {selectedAppointment.patient.user.phone || "—"}</div>
                      <div><span className="text-zinc-500">Emergency:</span> {selectedAppointment.patient.emergencyContactName || "—"}</div>
                    </div>
                    {selectedAppointment.patient.medicalNotes && (
                      <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md">
                        <p className="text-sm font-medium text-amber-800 dark:text-amber-400">Medical Notes:</p>
                        <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">{selectedAppointment.patient.medicalNotes}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-zinc-500">
                    <Stethoscope className="h-12 w-12 mx-auto text-zinc-300 dark:text-zinc-700 mb-4" />
                    <p>Select an appointment to view patient details</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Clinical Notes</CardTitle>
              </CardHeader>
              <CardContent>
                {selectedAppointment ? (
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label>Notes</Label>
                      <Textarea value={clinicalNotes} onChange={e => setClinicalNotes(e.target.value)} placeholder="Enter clinical notes..." rows={6} />
                    </div>
                    <div className="flex justify-end">
                      <Button onClick={() => { setDialogAction("complete"); setDialogOpen(true) }} disabled={submitting}>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Complete Appointment
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-zinc-500">
                    <FileText className="h-12 w-12 mx-auto text-zinc-300 dark:text-zinc-700 mb-4" />
                    <p>Select an appointment to add clinical notes</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{dialogAction === "start" ? "Start Appointment" : "Complete Appointment"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); confirmAction() }}>
              <div className="space-y-4 py-4">
                {dialogAction === "complete" && (
                  <div className="space-y-1.5">
                    <Label>Clinical Notes</Label>
                    <Textarea value={clinicalNotes} onChange={e => setClinicalNotes(e.target.value)} placeholder="Enter clinical notes..." rows={4} />
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); setDialogAction(null); setSelectedAppointment(null); setClinicalNotes("") }}>Cancel</Button>
                <Button type="submit" variant={dialogAction === "complete" ? "default" : "default"} disabled={submitting}>
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : (dialogAction === "start" ? "Start Appointment" : "Complete Appointment")}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DentistLayout>
  )
}

function addDays(date: Date, days: number) {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

function startOfWeek(date: Date, options?: { weekStartsOn: number }) {
  const day = date.getDay()
  const diff = (day < (options?.weekStartsOn || 1) ? 7 : 0) + day - (options?.weekStartsOn || 1)
  const result = new Date(date)
  result.setDate(date.getDate() - diff)
  result.setHours(0, 0, 0, 0)
  return result
}

function subDays(date: Date, days: number) {
  const result = new Date(date)
  result.setDate(result.getDate() - days)
  return result
}