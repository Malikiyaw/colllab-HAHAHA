"use client"

import { useState, useEffect } from "react"
import { Plus, Search, Edit, Trash2, Loader2, Calendar, Clock, UserPlus } from "lucide-react"
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

export default function DentistsPage() {
  const [dentists, setDentists] = useState<any[]>([])
  const [services, setServices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingDentist, setEditingDentist] = useState<any | null>(null)
  const [activeTab, setActiveTab] = useState("dentists")
  const [formData, setFormData] = useState({
    email: "",
    name: "",
    password: "",
    specialization: "",
    licenseNumber: "",
    bio: "",
    active: true,
    color: "#EA580C",
    serviceIds: [] as string[],
  })
  const [submitting, setSubmitting] = useState(false)
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false)
  const [scheduleDentist, setScheduleDentist] = useState<any | null>(null)
  const [scheduleForm, setScheduleForm] = useState({
    dayOfWeek: 1,
    startTime: "09:00",
    endTime: "17:00",
    active: true,
  })

  const fetchDentists = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: "20" })
      if (search) params.append("search", search)
      const res = await fetch(`/api/admin/dentists?${params}`)
      const data = await res.json()
      setDentists(data.dentists)
      setTotalPages(data.totalPages)
    } catch (error) {
      console.error("Failed to fetch dentists:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchServices = async () => {
    try {
      const res = await fetch("/api/services")
      const data = await res.json()
      setServices(data.filter((s: any) => s.active))
    } catch (error) {
      console.error("Failed to fetch services:", error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const url = editingDentist ? `/api/admin/dentists/${editingDentist.id}` : "/api/admin/dentists"
      const method = editingDentist ? "PATCH" : "POST"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })
      if (!res.ok) throw new Error("Failed to save")
      setDialogOpen(false)
      setEditingDentist(null)
      resetForm()
      fetchDentists()
    } catch (error) {
      console.error("Failed to save dentist:", error)
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (dentist: any) => {
    setEditingDentist(dentist)
    setFormData({
      email: dentist.user.email,
      name: dentist.user.name,
      password: "",
      specialization: dentist.specialization || "",
      licenseNumber: dentist.licenseNumber || "",
      bio: dentist.bio || "",
      active: dentist.active,
      color: dentist.color || "#EA580C",
      serviceIds: dentist.services?.map((s: any) => s.serviceId) || [],
    })
    setDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this dentist?")) return
    try {
      await fetch(`/api/admin/dentists/${id}`, { method: "DELETE" })
      fetchDentists()
    } catch (error) {
      console.error("Failed to delete dentist:", error)
    }
  }

  const resetForm = () => {
    setFormData({
      email: "",
      name: "",
      password: "",
      specialization: "",
      licenseNumber: "",
      bio: "",
      active: true,
      color: "#EA580C",
      serviceIds: [],
    })
  }

  const handleNew = () => {
    resetForm()
    setEditingDentist(null)
    setDialogOpen(true)
  }

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!scheduleDentist) return
    try {
      await fetch("/api/admin/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dentistId: scheduleDentist.id, ...scheduleForm }),
      })
      setScheduleDialogOpen(false)
      fetchDentists()
    } catch (error) {
      console.error("Failed to save schedule:", error)
    }
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-page-title">Dentists</h1>
            <p className="text-meta">Manage dentist profiles and schedules</p>
          </div>
          <Button onClick={handleNew}>
            <UserPlus className="h-4 w-4 mr-2" />
            Add Dentist
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList>
            <TabsTrigger value="dentists">Dentists</TabsTrigger>
            <TabsTrigger value="schedules">Schedules</TabsTrigger>
          </TabsList>

          <TabsContent value="dentists">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                    <Input
                      placeholder="Search dentists..."
                      value={search}
                      onChange={(e) => { setSearch(e.target.value); setPage(1); fetchDentists() }}
                      className="pl-10"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-accent" /></div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Dentist</TableHead>
                            <TableHead>Specialization</TableHead>
                            <TableHead>License</TableHead>
                            <TableHead>Services</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {dentists.map((dentist) => (
                            <TableRow key={dentist.id}>
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <div className="h-2 w-2 rounded-full" style={{ backgroundColor: dentist.color }} />
                                  <div>
                                    <p className="font-medium">{dentist.user.name}</p>
                                    <p className="text-sm text-zinc-500">{dentist.user.email}</p>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>{dentist.specialization || "—"}</TableCell>
                              <TableCell>{dentist.licenseNumber || "—"}</TableCell>
                              <TableCell>
                                <div className="flex flex-wrap gap-1">
                                  {dentist.services?.map((s: any) => (
                                    <Badge key={s.service.id} variant="secondary" className="text-xs">
                                      {s.service.name}
                                    </Badge>
                                  ))}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant={dentist.active ? "success" : "secondary"}>
                                  {dentist.active ? "Active" : "Inactive"}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <Button variant="ghost" size="icon" onClick={() => handleEdit(dentist)}>
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" onClick={() => handleDelete(dentist.id)}>
                                    <Trash2 className="h-4 w-4 text-red-600" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between mt-4">
                        <p className="text-sm text-zinc-500">Page {page} of {totalPages}</p>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
                          <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next</Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{editingDentist ? "Edit Dentist" : "New Dentist"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                  <div className="space-y-4 py-4">
                    <Tabs defaultValue="profile" className="space-y-4">
                      <TabsList>
                        <TabsTrigger value="profile">Profile</TabsTrigger>
                        <TabsTrigger value="services">Services</TabsTrigger>
                      </TabsList>
                      <TabsContent value="profile" className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <Label>Email</Label>
                            <Input type="email" value={formData.email} onChange={e => setFormData(f => ({ ...f, email: e.target.value }))} required disabled={!!editingDentist} />
                          </div>
                          <div className="space-y-1.5">
                            <Label>Name</Label>
                            <Input value={formData.name} onChange={e => setFormData(f => ({ ...f, name: e.target.value }))} required />
                          </div>
                        </div>
                        {!editingDentist && (
                          <div className="space-y-1.5">
                            <Label>Password</Label>
                            <Input type="password" value={formData.password} onChange={e => setFormData(f => ({ ...f, password: e.target.value }))} required />
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <Label>Specialization</Label>
                            <Input value={formData.specialization} onChange={e => setFormData(f => ({ ...f, specialization: e.target.value }))} />
                          </div>
                          <div className="space-y-1.5">
                            <Label>License Number</Label>
                            <Input value={formData.licenseNumber} onChange={e => setFormData(f => ({ ...f, licenseNumber: e.target.value }))} />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <Label>Bio</Label>
                          <textarea className="input-base min-h-[80px]" value={formData.bio} onChange={e => setFormData(f => ({ ...f, bio: e.target.value }))} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <Label>Color</Label>
                            <Input type="color" value={formData.color} onChange={e => setFormData(f => ({ ...f, color: e.target.value }))} className="h-10 w-20" />
                          </div>
                          <div className="space-y-1.5">
                            <Label>&nbsp;</Label>
                            <div className="flex items-center gap-2">
                              <input type="checkbox" id="active" checked={formData.active} onChange={e => setFormData(f => ({ ...f, active: e.target.checked }))} className="h-4 w-4 rounded border-zinc-300 text-accent focus:ring-accent" />
                              <Label htmlFor="active" className="cursor-pointer">Active</Label>
                            </div>
                          </div>
                        </div>
                      </TabsContent>
                      <TabsContent value="services" className="space-y-4">
                        <div className="space-y-1.5">
                          <Label>Assigned Services</Label>
                          <div className="space-y-2 max-h-60 overflow-y-auto border border-zinc-200 dark:border-zinc-700 rounded-md p-3">
                            {services.map((s: any) => (
                              <label key={s.id} className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={formData.serviceIds.includes(s.id)}
                                  onChange={(e) =>
                                    setFormData((f) => ({
                                      ...f,
                                      serviceIds: e.target.checked
                                        ? [...f.serviceIds, s.id]
                                        : f.serviceIds.filter((id: string) => id !== s.id),
                                    }))
                                  }
                                  className="h-4 w-4 rounded border-zinc-300 text-accent focus:ring-accent"
                                />
                                <span className="text-sm">{s.name} ({s.durationMinutes} min, ₱{s.price})</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); setEditingDentist(null); resetForm() }}>Cancel</Button>
                    <Button type="submit" disabled={submitting}>{submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </TabsContent>

          <TabsContent value="schedules">
            <Card>
              <CardHeader>
                <CardTitle>Weekly Schedules</CardTitle>
              </CardHeader>
              <CardContent>
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
                          <TableCell className="font-medium">{dentist.user.name}</TableCell>
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
                            <Button variant="outline" size="sm" onClick={() => { setScheduleDentist(dentist); setScheduleDialogOpen(true) }}>
                              <Clock className="h-4 w-4 mr-2" />
                              Edit
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edit Weekly Schedule for {scheduleDentist?.user.name}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleScheduleSubmit}>
                  <div className="space-y-4 py-4 grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>Day</Label>
                      <Select value={scheduleForm.dayOfWeek.toString()} onValueChange={v => setScheduleForm(f => ({ ...f, dayOfWeek: parseInt(v) }))}>
                        <SelectTrigger><SelectValue placeholder="Select day" /></SelectTrigger>
                        <SelectContent>
                          {days.map(d => <SelectItem key={d.value} value={d.value.toString()}>{d.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Start Time</Label>
                      <Input type="time" value={scheduleForm.startTime} onChange={e => setScheduleForm(f => ({ ...f, startTime: e.target.value }))} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>End Time</Label>
                      <Input type="time" value={scheduleForm.endTime} onChange={e => setScheduleForm(f => ({ ...f, endTime: e.target.value }))} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>&nbsp;</Label>
                      <div className="flex items-center gap-2">
                        <input type="checkbox" id="sched-active" checked={scheduleForm.active} onChange={e => setScheduleForm(f => ({ ...f, active: e.target.checked }))} className="h-4 w-4 rounded border-zinc-300 text-accent focus:ring-accent" />
                        <Label htmlFor="sched-active" className="cursor-pointer">Active</Label>
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setScheduleDialogOpen(false)}>Cancel</Button>
                    <Button type="submit">Save Schedule</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  )
}