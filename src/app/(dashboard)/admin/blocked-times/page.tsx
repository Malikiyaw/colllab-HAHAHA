"use client"

import { useState, useEffect } from "react"
import { Plus, Search, Edit, Trash2, Loader2, Calendar, X, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AdminLayout } from "../layout"
import { format, startOfWeek, addDays, addWeeks, subWeeks, isSameDay } from "date-fns"

export default function BlockedTimesPage() {
  const [blockedTimes, setBlockedTimes] = useState<any[]>([])
  const [dentists, setDentists] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [viewDate, setViewDate] = useState(new Date())
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingBlock, setEditingBlock] = useState<any | null>(null)
  const [formData, setFormData] = useState({
    dentistId: "",
    clinicWide: false,
    startTime: "",
    endTime: "",
    reason: "",
  })
  const [submitting, setSubmitting] = useState(false)

  const weekStart = startOfWeek(viewDate, { weekStartsOn: 1 })
  const weekEnd = addDays(weekStart, 6)

  const fetchData = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        start: weekStart.toISOString(),
        end: weekEnd.toISOString(),
      })
      const [blocksRes, dentRes] = await Promise.all([
        fetch(`/api/admin/blocked-times?${params}`),
        fetch("/api/dentists"),
      ])
      const blocksData = await blocksRes.json()
      const dentData = await dentRes.json()
      setBlockedTimes(blocksData)
      setDentists(dentData)
    } catch (error) {
      console.error("Failed to fetch blocked times:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [viewDate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const url = editingBlock ? `/api/admin/blocked-times/${editingBlock.id}` : "/api/admin/blocked-times"
      const method = editingBlock ? "PATCH" : "POST"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          startTime: formData.startTime,
          endTime: formData.endTime,
        }),
      })
      if (!res.ok) throw new Error("Failed to save")
      setDialogOpen(false)
      setEditingBlock(null)
      resetForm()
      fetchData()
    } catch (error) {
      console.error("Failed to save blocked time:", error)
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (block: any) => {
    setEditingBlock(block)
    setFormData({
      dentistId: block.dentistId || "",
      clinicWide: block.clinicWide,
      startTime: block.startTime,
      endTime: block.endTime,
      reason: block.reason || "",
    })
    setDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this blocked time?")) return
    try {
      await fetch(`/api/admin/blocked-times/${id}`, { method: "DELETE" })
      fetchData()
    } catch (error) {
      console.error("Failed to delete blocked time:", error)
    }
  }

  const resetForm = () => {
    const now = new Date()
    setFormData({
      dentistId: "",
      clinicWide: false,
      startTime: now.toISOString().slice(0, 16),
      endTime: new Date(now.getTime() + 60 * 60 * 1000).toISOString().slice(0, 16),
      reason: "",
    })
  }

  const handleNew = () => {
    resetForm()
    setEditingBlock(null)
    setDialogOpen(true)
  }

  const getBlocksForDay = (date: Date) => {
    return blockedTimes.filter((block) => {
      const blockStart = new Date(block.startTime)
      return isSameDay(blockStart, date)
    })
  }

  const getBlocksForDentist = (dentistId: string, date: Date) => {
    return blockedTimes.filter((block) => {
      if (block.dentistId !== dentistId) return false
      const blockStart = new Date(block.startTime)
      return isSameDay(blockStart, date)
    })
  }

  const getClinicWideBlocks = (date: Date) => {
    return blockedTimes.filter((block) => {
      if (!block.clinicWide) return false
      const blockStart = new Date(block.startTime)
      return isSameDay(blockStart, date)
    })
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-page-title">Blocked Time</h1>
            <p className="text-meta">Manage clinic-wide and dentist-specific blocked time slots</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setViewDate(subWeeks(viewDate, 1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium w-40 text-center">
                {format(weekStart, "MMM d")} – {format(weekEnd, "MMM d, yyyy")}
              </span>
              <Button variant="outline" size="sm" onClick={() => setViewDate(addWeeks(viewDate, 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <Button onClick={handleNew}>
              <Plus className="h-4 w-4 mr-2" />
              Block Time
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-40">Time</TableHead>
                    <TableHead>Clinic-Wide</TableHead>
                    {dentists.map((d) => (
                      <TableHead key={d.id} className="max-w-32">
                        {d.user.name}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: 24 }, (_, hour) => {
                    return (
                      <TableRow key={hour}>
                        <TableCell className="font-mono text-sm text-zinc-500">
                          {hour.toString().padStart(2, "0")}:00
                        </TableCell>
                        <TableCell>
                          {getClinicWideBlocks(weekStart)
                            .filter((b) => new Date(b.startTime).getHours() === hour)
                            .map((block) => (
                              <Badge key={block.id} variant="destructive" className="mb-1 w-full text-xs">
                                {block.reason || "Blocked"}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="ml-1 p-0"
                                  onClick={() => handleDelete(block.id)}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </Badge>
                            ))}
                        </TableCell>
                        {dentists.map((dentist) => (
                          <TableCell key={dentist.id}>
                            {getBlocksForDentist(dentist.id, weekStart)
                              .filter((b) => new Date(b.startTime).getHours() === hour)
                              .map((block) => (
                                <Badge key={block.id} variant="warning" className="mb-1 w-full text-xs">
                                  {block.reason || "Blocked"}
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="ml-1 p-0"
                                    onClick={() => handleDelete(block.id)}
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </Badge>
                              ))}
                          </TableCell>
                        ))}
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingBlock ? "Edit Blocked Time" : "New Blocked Time"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-4">
                <div className="space-y-1.5">
                  <Label>Type</Label>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="type"
                        value="clinic"
                        checked={formData.clinicWide}
                        onChange={() => setFormData((f) => ({ ...f, clinicWide: true, dentistId: "" }))}
                        className="h-4 w-4 text-accent"
                      />
                      <span>Clinic-Wide</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="type"
                        value="dentist"
                        checked={!formData.clinicWide}
                        onChange={() => setFormData((f) => ({ ...f, clinicWide: false }))}
                        className="h-4 w-4 text-accent"
                      />
                      <span>Dentist-Specific</span>
                    </label>
                  </div>
                </div>
                {!formData.clinicWide && (
                  <div className="space-y-1.5">
                    <Label>Dentist</Label>
                    <Select value={formData.dentistId} onValueChange={(v) => setFormData((f) => ({ ...f, dentistId: v }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select dentist" />
                      </SelectTrigger>
                      <SelectContent>
                        {dentists.map((d: any) => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.user.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Start Date & Time</Label>
                    <Input
                      type="datetime-local"
                      value={formData.startTime}
                      onChange={(e) => setFormData((f) => ({ ...f, startTime: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>End Date & Time</Label>
                    <Input
                      type="datetime-local"
                      value={formData.endTime}
                      onChange={(e) => setFormData((f) => ({ ...f, endTime: e.target.value }))}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Reason</Label>
                  <Input
                    value={formData.reason}
                    onChange={(e) => setFormData((f) => ({ ...f, reason: e.target.value }))}
                    placeholder="Optional reason"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setDialogOpen(false)
                    setEditingBlock(null)
                    resetForm()
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  )
}