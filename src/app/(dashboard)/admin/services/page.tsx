"use client"

import { useState } from "react"
import Link from "next/link"
import { Plus, Search, Edit, Trash2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AdminLayout } from "../layout"

const categories = [
  { id: "cat-preventive", name: "Preventive" },
  { id: "cat-restorative", name: "Restorative" },
  { id: "cat-surgical", name: "Surgical" },
]

export default function ServicesPage() {
  const [services, setServices] = useState<any[]>([])
  const [categoriesData, setCategoriesData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingService, setEditingService] = useState<any | null>(null)
  const [formData, setFormData] = useState({
    categoryId: "",
    name: "",
    description: "",
    durationMinutes: 30,
    price: 0,
    bufferBeforeMinutes: 5,
    bufferAfterMinutes: 5,
    active: true,
    color: "#16A34A",
  })
  const [submitting, setSubmitting] = useState(false)

  const fetchServices = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: "20" })
      if (search) params.append("search", search)
      const res = await fetch(`/api/admin/services?${params}`)
      const data = await res.json()
      setServices(data.services)
      setTotalPages(data.totalPages)
    } catch (error) {
      console.error("Failed to fetch services:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/admin/service-categories")
      const data = await res.json()
      setCategoriesData(data)
    } catch (error) {
      console.error("Failed to fetch categories:", error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const url = editingService ? `/api/admin/services/${editingService.id}` : "/api/admin/services"
      const method = editingService ? "PATCH" : "POST"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })
      if (!res.ok) throw new Error("Failed to save")
      setDialogOpen(false)
      setEditingService(null)
      resetForm()
      fetchServices()
    } catch (error) {
      console.error("Failed to save service:", error)
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (service: any) => {
    setEditingService(service)
    setFormData({
      categoryId: service.categoryId || "",
      name: service.name,
      description: service.description || "",
      durationMinutes: service.durationMinutes,
      price: service.price || 0,
      bufferBeforeMinutes: service.bufferBeforeMinutes,
      bufferAfterMinutes: service.bufferAfterMinutes,
      active: service.active,
      color: service.color || "#16A34A",
    })
    setDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this service?")) return
    try {
      await fetch(`/api/admin/services/${id}`, { method: "DELETE" })
      fetchServices()
    } catch (error) {
      console.error("Failed to delete service:", error)
    }
  }

  const resetForm = () => {
    setFormData({
      categoryId: "",
      name: "",
      description: "",
      durationMinutes: 30,
      price: 0,
      bufferBeforeMinutes: 5,
      bufferAfterMinutes: 5,
      active: true,
      color: "#16A34A",
    })
  }

  const handleNew = () => {
    resetForm()
    setEditingService(null)
    setDialogOpen(true)
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-page-title">Services</h1>
            <p className="text-meta">Manage dental services and pricing</p>
          </div>
          <Button onClick={handleNew}>Add Service</Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                <Input
                  placeholder="Search services..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); fetchServices() }}
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
                        <TableHead>Service</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Buffers</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {services.map((service) => (
                        <TableRow key={service.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="h-2 w-2 rounded-full" style={{ backgroundColor: service.color }} />
                              <span className="font-medium">{service.name}</span>
                            </div>
                          </TableCell>
                          <TableCell>{service.category?.name || "—"}</TableCell>
                          <TableCell>{service.durationMinutes} min</TableCell>
                          <TableCell>₱{service.price}</TableCell>
                          <TableCell>±{service.bufferBeforeMinutes} / ±{service.bufferAfterMinutes}</TableCell>
                          <TableCell>
                            <Badge variant={service.active ? "success" : "secondary"}>
                              {service.active ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button variant="ghost" size="icon" onClick={() => handleEdit(service)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDelete(service.id)}>
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
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingService ? "Edit Service" : "New Service"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-4">
                <div className="space-y-1.5">
                  <Label>Category</Label>
                  <Select value={formData.categoryId} onValueChange={v => setFormData(f => ({ ...f, categoryId: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>
                      {categoriesData.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Name</Label>
                  <Input value={formData.name} onChange={e => setFormData(f => ({ ...f, name: e.target.value }))} required />
                </div>
                <div className="space-y-1.5">
                  <Label>Description</Label>
                  <textarea className="input-base min-h-[80px]" value={formData.description} onChange={e => setFormData(f => ({ ...f, description: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Duration (min)</Label>
                    <Input type="number" value={formData.durationMinutes} onChange={e => setFormData(f => ({ ...f, durationMinutes: parseInt(e.target.value) }))} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Price (₱)</Label>
                    <Input type="number" step="0.01" value={formData.price} onChange={e => setFormData(f => ({ ...f, price: parseFloat(e.target.value) }))} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Buffer Before (min)</Label>
                    <Input type="number" value={formData.bufferBeforeMinutes} onChange={e => setFormData(f => ({ ...f, bufferBeforeMinutes: parseInt(e.target.value) }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Buffer After (min)</Label>
                    <Input type="number" value={formData.bufferAfterMinutes} onChange={e => setFormData(f => ({ ...f, bufferAfterMinutes: parseInt(e.target.value) }))} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Color</Label>
                  <Input type="color" value={formData.color} onChange={e => setFormData(f => ({ ...f, color: e.target.value }))} className="h-10 w-20" />
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="active" checked={formData.active} onChange={e => setFormData(f => ({ ...f, active: e.target.checked }))} className="h-4 w-4 rounded border-zinc-300 text-accent focus:ring-accent" />
                  <Label htmlFor="active" className="cursor-pointer">Active</Label>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); setEditingService(null); resetForm() }}>Cancel</Button>
                <Button type="submit" disabled={submitting}>{submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  )
}