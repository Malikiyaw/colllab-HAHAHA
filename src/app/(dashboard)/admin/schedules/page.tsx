"use client"

import { useState, useEffect } from "react"
import { Plus, Search, Edit, Trash2, Loader2, Calendar, Clock, Copy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AdminLayout } from "../layout"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const days = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
]

export default function SchedulesPage() {
  const [dentistSchedules, setDentistSchedules] = useState<any[]>([])
  const [clinicSchedules, setClinicSchedules] = useState<any[]>([])
  const [dentists, setDentists] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState<any | null>(null)
  const [activeTab, setActiveTab] = useState("dentist")
  const [formData, setFormData] = useState({
    dentistId: "",
    dayOfWeek: 1,
    startTime: "09:00",
    endTime: "17:00",
    active: true,
  })
  const [submitting, setSubmitting] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    try {
      const [schedRes, dentRes] = await Promise.all([
        fetch("/api/admin/schedules"),
        fetch("/api/dentists"),
      ])
      const schedData = await schedRes.json()
      const dentData = await dentRes.json()
      setDentistSchedules(schedData.dentistSchedules)
      setClinicSchedules(schedData.clinicSchedules)
      setDentists(dentData)
    } catch (error) {
      console.error("Failed to fetch schedules:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const url = editingSchedule ? `/api/admin/schedules/${editingSchedule.id}` : "/api/admin/schedules"
      const method = editingSchedule ? "PATCH" : "POST"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })
      if (!res.ok) throw new Error("Failed to save")
      setDialogOpen(false)
      setEditingSchedule(null)
      resetForm()
      fetchData()
    } catch (error) {
      console.error("Failed to save schedule:", error)
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (schedule: any, type: "dentist" | "clinic") => {
    setEditingSchedule({ ...schedule, type })
    setFormData({
      dentistId: schedule.dentistId || "",
      dayOfWeek: schedule.dayOfWeek,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      active: schedule.active,
    })
    setActiveTab(type)
    setDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this schedule?")) return
    try {
      await fetch(`/api/admin/schedules/${id}`, { method: "DELETE" })
      fetchData()
    } catch (error) {
      console.error("Failed to delete schedule:", error)
    }
  }

  const handleCopy = async () => {
    if (!confirm("Copy clinic schedule to all dentists?")) return
    try {
      for (const dentist of dentists) {
        for (const sched of clinicSchedules) {
          await fetch("/api/admin/schedules", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              dentistId: dentist.id,
              dayOfWeek: sched.dayOfWeek,
              startTime: sched.startTime,
              endTime: sched.endTime,
              active: sched.active,
            }),
          })
        }
      }
      fetchData()
    } catch (error) {
      console.error("Failed to copy schedules:", error)
    }
  }

  const resetForm = () => {
    setFormData({ dentistId: "", dayOfWeek: 1, startTime: "09:00", endTime: "17:00", active: true })
  }

  const handleNew = (type: "dentist" | "clinic") => {
    resetForm()
    setEditingSchedule(null)
    setActiveTab(type)
    setDialogOpen(true)
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-page-title">Schedules</h1>
            <p className="text-meta">Manage clinic and dentist working hours</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => handleNew("clinic")}>
              <Plus className="h-4 w-4 mr-2" />
              Clinic Hours
            </Button>
            <Button onClick={() => handleNew("dentist")} variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Dentist Hours
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList>
            <TabsTrigger value="clinic">Clinic Hours</TabsTrigger>
            <TabsTrigger value="dentist">Dentist Schedules</TabsTrigger>
          </TabsList>

          <TabsContent value="clinic">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Clinic Operating Hours</CardTitle>
                <Button variant="outline" size="sm" onClick={handleCopy}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy to All Dentists
                </Button>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-accent" /></div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Day</TableHead>
                          <TableHead>Start Time</TableHead>
                          <TableHead>End Time</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {days.map(day => {
                          const sched = clinicSchedules.find((s: any) => s.dayOfWeek === day.value)
                          return (
                            <TableRow key={day.value}>
                              <TableCell className="font-medium">{day.label}</TableCell>
                              <TableCell>{sched?.startTime || "—"}</TableCell>
                              <TableCell>{sched?.endTime || "—"}</TableCell>
                              <TableCell>
                                <Badge variant={sched?.active ? "success" : "secondary"}>
                                  {sched?.active ? "Open" : "Closed"}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-2">
                                  {sched && (
                                    <Button variant="ghost" size="icon" onClick={() => handleEdit(sched, "clinic")}>
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                  )}
                                  {sched && (
                                    <Button variant="ghost" size="icon" onClick={() => handleDelete(sched.id)}>
                                      <Trash2 className="h-4 w-4 text-red-600" />
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="dentist">
            <Card>
              <CardHeader>
                <CardTitle>Dentist Weekly Schedules</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-accent" /></div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Dentist</TableHead>
                          {days.map(d => <TableHead key={d.value}>{d.label}</TableHead>)}
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {dentists.map((dentist) => (
                          <TableRow key={dentist.id}>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <div className="h-2 w-2 rounded-full" style={{ backgroundColor: dentist.color }} />
                                {dentist.user.name}
                              </div>
                            </TableCell>
                            {days.map(day => {
                              const sched = dentist.schedules?.find((s: any) => s.dayOfWeek === day.value)
                              return (
                                <TableCell key={day.value}>
                                  {sched && sched.active ? (
                                    <span className="text-sm">{sched.startTime}–{sched.endTime}</span>
                                  ) : (
                                    <span className="text-zinc-400 text-sm">Closed</span>
                                  )}
                                </TableCell>
                              )
                            })}
                            <TableCell className="text-right">
                              <Button variant="outline" size="sm" onClick={() => handleNew("dentist")}>
                                <Plus className="h-4 w-4 mr-2" />
                                Add
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingSchedule ? "Edit Schedule" : "New Schedule"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-4 grid grid-cols-2 gap-4">
                {activeTab === "dentist" && (
                  <div className="space-y-1.5">
                    <Label>Dentist</Label>
                    <Select value={formData.dentistId} onValueChange={v => setFormData(f => ({ ...f, dentistId: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select dentist" /></SelectTrigger>
                      <SelectContent>
                        {dentists.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.user.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label>Day</Label>
                  <Select value={formData.dayOfWeek.toString()} onValueChange={v => setFormData(f => ({ ...f, dayOfWeek: parseInt(v) }))}>
                    <SelectTrigger><SelectValue placeholder="Select day" /></SelectTrigger>
                    <SelectContent>
                      {days.map(d => <SelectItem key={d.value} value={d.value.toString()}>{d.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Start Time</Label>
                  <Input type="time" value={formData.startTime} onChange={e => setFormData(f => ({ ...f, startTime: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>End Time</Label>
                  <Input type="time" value={formData.endTime} onChange={e => setFormData(f => ({ ...f, endTime: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>&nbsp;</Label>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="sched-active" checked={formData.active} onChange={e => setFormData(f => ({ ...f, active: e.target.checked }))} className="h-4 w-4 rounded border-zinc-300 text-accent focus:ring-accent" />
                    <Label htmlFor="sched-active" className="cursor-pointer">Active</Label>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); setEditingSchedule(null); resetForm() }}>Cancel</Button>
                <Button type="submit" disabled={submitting}>{submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  )
}