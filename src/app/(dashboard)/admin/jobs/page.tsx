"use client"

import { useState, useEffect } from "react"
import { Bell, Loader2, Play, Mail, CheckCircle, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { AdminLayout } from "../layout"
import { useSession } from "next-auth/react"

export default function AdminJobsPage() {
  const { data: session } = useSession()
  const [queues, setQueues] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [testEmailDialog, setTestEmailDialog] = useState(false)
  const [testEmail, setTestEmail] = useState("")
  const [sendingTest, setSendingTest] = useState(false)

  useEffect(() => {
    fetchQueues()
  }, [])

  const fetchQueues = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/jobs")
      const data = await res.json()
      setQueues(data.queues || [])
    } catch (error) {
      console.error("Failed to fetch queues:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleAction = async (action: string, payload: any = {}) => {
    try {
      const res = await fetch("/api/admin/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...payload }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error?.message || "Failed")
      alert(data.message)
      if (action === "register-jobs") fetchQueues()
    } catch (error: any) {
      alert(error.message)
    }
  }

  const sendTestEmail = async () => {
    if (!testEmail) return
    setSendingTest(true)
    try {
      const res = await fetch("/api/admin/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "test-email", to: testEmail }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error?.message || "Failed")
      alert("Test email sent!")
      setTestEmailDialog(false)
      setTestEmail("")
    } catch (error: any) {
      alert(error.message)
    } finally {
      setSendingTest(false)
    }
  }

  if (!session) return null

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-page-title">Background Jobs</h1>
          <p className="text-meta">Manage job queues and scheduled tasks</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Button onClick={() => handleAction("register-jobs")}>
            <Play className="h-4 w-4 mr-2" />
            Register Handlers
          </Button>
          <Button variant="outline" onClick={() => handleAction("process-waitlist")}>
            <Bell className="h-4 w-4 mr-2" />
            Process Waitlist
          </Button>
          <Button variant="outline" onClick={() => handleAction("send-daily-schedules")}>
            <Mail className="h-4 w-4 mr-2" />
            Send Daily Schedules
          </Button>
          <Button variant="outline" onClick={() => setTestEmailDialog(true)}>
            <Mail className="h-4 w-4 mr-2" />
            Test Email
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Job Queues</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-accent" /></div>
            ) : queues.length === 0 ? (
              <div className="text-center py-8 text-zinc-500">No job queues found</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Queue Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Pending</TableHead>
                      <TableHead>Active</TableHead>
                      <TableHead>Completed</TableHead>
                      <TableHead>Failed</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {queues.map((queue: any) => (
                      <TableRow key={queue.name}>
                        <TableCell className="font-mono text-sm">{queue.name}</TableCell>
                        <TableCell>
                          <Badge variant={queue.active ? "success" : "secondary"}>
                            {queue.active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>{queue.pending || 0}</TableCell>
                        <TableCell>{queue.active || 0}</TableCell>
                        <TableCell>{queue.completed || 0}</TableCell>
                        <TableCell>{queue.failed || 0}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Scheduled Jobs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Appointment Reminders</p>
                    <p className="text-sm text-zinc-500">24h and 1h before appointments</p>
                  </div>
                  <Badge variant="success">Scheduled</Badge>
                </div>
              </div>
              <div className="p-4 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Waitlist Processing</p>
                    <p className="text-sm text-zinc-500">Every 5 minutes</p>
                  </div>
                  <Badge variant="success">Scheduled</Badge>
                </div>
              </div>
              <div className="p-4 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Daily Schedule Emails</p>
                    <p className="text-sm text-zinc-500">Daily at 6:00 AM</p>
                  </div>
                  <Badge variant="success">Scheduled</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Dialog open={testEmailDialog} onOpenChange={setTestEmailDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Send Test Email</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); sendTestEmail() }}>
              <div className="space-y-4 py-4">
                <div className="space-y-1.5">
                  <Label>Recipient Email</Label>
                  <Input type="email" value={testEmail} onChange={e => setTestEmail(e.target.value)} placeholder="test@example.com" required />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setTestEmailDialog(false)}>Cancel</Button>
                <Button type="submit" disabled={sendingTest}>{sendingTest ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : "Send Test"}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  )
}