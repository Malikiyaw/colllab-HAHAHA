"use client"

import { useState, useEffect } from "react"
import { format, addDays, startOfWeek, addWeeks, subWeeks, isSameDay, parseISO } from "date-fns"
import { ChevronLeft, ChevronRight, Loader2, Calendar, Clock, AlertCircle, CheckCircle, XCircle, UserPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import PatientLayout from "../layout"

const services = [
  { id: "cleaning", name: "Dental Cleaning", duration: 30, price: 800, color: "#16A34A" },
  { id: "filling", name: "Composite Filling", duration: 45, price: 1200, color: "#D97706" },
  { id: "consultation", name: "Consultation", duration: 30, price: 500, color: "#2563EB" },
  { id: "extraction", name: "Simple Extraction", duration: 60, price: 2000, color: "#DC2626" },
]

export default function BookingPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [selectedService, setSelectedService] = useState<string>("")
  const [selectedDentist, setSelectedDentist] = useState<string>("")
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [selectedSlot, setSelectedSlot] = useState<string>("")
  const [viewDate, setViewDate] = useState(new Date())
  const [availability, setAvailability] = useState<any[]>([])
  const [dentists, setDentists] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [notes, setNotes] = useState("")
  const [idempotencyKey] = useState(() => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`)

  useEffect(() => {
    fetchDentists()
  }, [])

  useEffect(() => {
    if (selectedService && selectedDentist) {
      fetchAvailability()
    } else {
      setAvailability([])
    }
  }, [selectedService, selectedDentist, viewDate])

  const fetchDentists = async () => {
    try {
      const res = await fetch("/api/dentists")
      const data = await res.json()
      setDentists(data.filter((d: any) => d.active))
    } catch (error) {
      console.error("Failed to fetch dentists:", error)
    }
  }

  const fetchAvailability = async () => {
    if (!selectedService || !selectedDentist) return
    setLoading(true)
    setError("")
    try {
      const params = new URLSearchParams({
        dentistId: selectedDentist,
        serviceId: selectedService,
        date: viewDate.toISOString(),
      })
      const res = await fetch(`/api/availability?${params}`)
      const data = await res.json()
      if (data.error) {
        setError(data.error.message)
        setAvailability([])
      } else {
        setAvailability(data.slots)
      }
    } catch (error) {
      console.error("Failed to fetch availability:", error)
      setError("Failed to load available slots")
    } finally {
      setLoading(false)
    }
  }

  const handleSlotClick = (slot: any) => {
    if (!slot.available) return
    setSelectedSlot(slot.startTime)
  }

  const handleNext = () => {
    if (step === 1 && !selectedService) { setError("Please select a service"); return }
    if (step === 2 && !selectedDentist) { setError("Please select a dentist"); return }
    if (step === 3 && !selectedSlot) { setError("Please select a time slot"); return }
    setError("")
    if (step < 4) setStep(step + 1)
  }

  const handleBack = () => {
    setError("")
    if (step > 1) setStep(step - 1)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedSlot) return
    setSubmitting(true)
    setError("")
    try {
      const startTime = new Date(selectedSlot)
      const service = services.find(s => s.id === selectedService)
      if (!service) throw new Error("Service not found")
      const endTime = new Date(startTime.getTime() + service.duration * 60 * 1000)

      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId: selectedService,
          dentistId: selectedDentist,
          date: format(selectedDate, "yyyy-MM-dd"),
          startTime: format(startTime, "HH:mm"),
          notes,
          idempotencyKey,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error?.message || "Booking failed")
      }

      router.push("/dashboard/patient/appointments")
    } catch (error: any) {
      setError(error.message || "Booking failed")
    } finally {
      setSubmitting(false)
    }
  }

  const weekStart = startOfWeek(viewDate, { weekStartsOn: 1 })
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const today = new Date()

  const formatTime = (iso: string) => format(new Date(iso), "h:mm a")
  const formatDate = (date: Date) => format(date, "EEE, MMM d")

  if (!session) return null

  return (
    <PatientLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-page-title">Book Appointment</h1>
          <p className="text-meta">Step {step} of 4</p>
        </div>

        <div className="flex gap-2 mb-6">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex-1 flex items-center gap-2">
              <div className={`flex-1 h-1 ${step >= s ? "bg-accent" : "bg-zinc-200 dark:bg-zinc-700"}`} />
              {s < 4 && <span className={step > s ? "text-accent" : "text-zinc-400"}>{s}</span>}
            </div>
          ))}
        </div>

        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md text-red-700 dark:text-red-400 flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            {error}
          </div>
        )}

        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Select Service</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {services.map((svc) => (
                  <Button
                    key={svc.id}
                    variant={selectedService === svc.id ? "primary" : "outline"}
                    className="h-32 flex flex-col items-start justify-between p-4"
                    onClick={() => { setSelectedService(svc.id); setError("") }}
                  >
                    <div className="w-full h-2 rounded" style={{ backgroundColor: svc.color }} />
                    <div className="w-full">
                      <p className="font-medium">{svc.name}</p>
                      <p className="text-sm text-zinc-500">{svc.duration} min · ₱{svc.price}</p>
                    </div>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Select Dentist</CardTitle>
            </CardHeader>
            <CardContent>
              {dentists.length === 0 ? (
                <p className="text-zinc-500">No dentists available for this service</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {dentists.filter(d => d.services.some((s: any) => s.serviceId === selectedService)).map((dentist) => (
                    <Button
                      key={dentist.id}
                      variant={selectedDentist === dentist.id ? "primary" : "outline"}
                      className="h-28 flex flex-col items-start justify-between p-4"
                      onClick={() => { setSelectedDentist(dentist.id); setError("") }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: dentist.color }} />
                        <span className="font-medium">{dentist.user.name}</span>
                      </div>
                      <p className="text-sm text-zinc-500">{dentist.specialization || "General Dentistry"}</p>
                    </Button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {step === 3 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Select Date & Time</CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setViewDate(subWeeks(viewDate, 1))}><ChevronLeft className="h-4 w-4" /></Button>
                <span className="text-sm font-medium w-40 text-center">{format(weekStart, "MMM d")} – {format(addDays(weekStart, 6), "MMM d, yyyy")}</span>
                <Button variant="outline" size="sm" onClick={() => setViewDate(addWeeks(viewDate, 1))}><ChevronRight className="h-4 w-4" /></Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex gap-2">
                {weekDays.map((day) => (
                  <Button
                    key={day.toISOString()}
                    variant={isSameDay(day, viewDate) ? "primary" : "outline"}
                    size="sm"
                    className="flex-1"
                    onClick={() => { setViewDate(day); setSelectedSlot("") }}
                  >
                    <div className="text-xs">{format(day, "EEE")}</div>
                    <div className="font-medium">{format(day, "d")}</div>
                    {isSameDay(day, today) && <span className="text-accent text-xs">Today</span>}
                  </Button>
                ))}
              </div>

              {loading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-accent" /></div>
              ) : error ? (
                <div className="text-center py-8 text-red-600">{error}</div>
              ) : availability.length === 0 ? (
                <div className="text-center py-8 text-zinc-500">No available slots for this day</div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {availability
                    .filter(s => s.available)
                    .map((slot) => (
                      <Button
                        key={slot.startTime}
                        variant={selectedSlot === slot.startTime ? "primary" : "outline"}
                        className="w-full justify-start"
                        onClick={() => handleSlotClick(slot)}
                      >
                        <Clock className="h-4 w-4 mr-2" />
                        {formatTime(slot.startTime)} – {formatTime(slot.endTime)}
                      </Button>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {step === 4 && (
          <Card>
            <CardHeader>
              <CardTitle>Confirm Booking</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: services.find(s => s.id === selectedService)?.color }} />
                    <span className="font-medium">{services.find(s => s.id === selectedService)?.name}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-zinc-500">Dentist:</span> {dentists.find(d => d.id === selectedDentist)?.user.name}</div>
                    <div><span className="text-zinc-500">Date:</span> {format(selectedDate, "MMM d, yyyy")}</div>
                    <div><span className="text-zinc-500">Time:</span> {selectedSlot ? format(new Date(selectedSlot), "h:mm a") : "—"}</div>
                    <div><span className="text-zinc-500">Duration:</span> {services.find(s => s.id === selectedService)?.duration} min</div>
                    <div><span className="text-zinc-500">Price:</span> ₱{services.find(s => s.id === selectedService)?.price}</div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>Notes (optional)</Label>
                  <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any concerns or special requests" rows={3} />
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={handleBack} disabled={submitting}>Back</Button>
              <Button onClick={handleSubmit} disabled={submitting} className="ml-auto">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : "Confirm Booking"}
              </Button>
            </CardFooter>
          </Card>
        )}

        <div className="flex gap-2 justify-end">
          {step > 1 && <Button variant="outline" onClick={handleBack} disabled={submitting}>Back</Button>}
          {step < 4 && <Button onClick={handleNext} disabled={submitting || loading}>Next</Button>}
        </div>
      </div>
    </PatientLayout>
  )
}