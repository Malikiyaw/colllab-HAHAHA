"use client"

import { ReactNode } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { LayoutDashboard, Users, Calendar, Clock, Shield, Settings, LogOut, Building2, UserCog } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Separator } from "@/components/ui/separator"
import { useSession, signOut } from "next-auth/react"

const navigation = [
  { name: "Overview", href: "/dashboard/admin", icon: LayoutDashboard },
  { name: "Appointments", href: "/dashboard/admin/appointments", icon: Calendar },
  { name: "Patients", href: "/dashboard/admin/patients", icon: Users },
  { name: "Dentists", href: "/dashboard/admin/dentists", icon: UserCog },
  { name: "Services", href: "/dashboard/admin/services", icon: Building2 },
  { name: "Schedules", href: "/dashboard/admin/schedules", icon: Clock },
  { name: "Blocked Time", href: "/dashboard/admin/blocked-times", icon: Shield },
  { name: "Staff", href: "/dashboard/admin/staff", icon: Users },
  { name: "Audit Logs", href: "/dashboard/admin/audit-logs", icon: Shield },
  { name: "Settings", href: "/dashboard/admin/settings", icon: Settings },
]

export function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const { data: session } = useSession()

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 sticky top-0 z-40">
        <div className="container-base flex h-16 items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/admin" className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
              Dental Clinic Admin
            </Link>
            <Separator orientation="vertical" className="h-6" />
            <nav className="hidden md:flex items-center gap-1">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors",
                    pathname === item.href || pathname.startsWith(item.href + "/")
                      ? "bg-accent text-accent-foreground"
                      : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.name}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <Avatar>
                    <AvatarImage src={session?.user?.image || ""} alt={session?.user?.name || ""} />
                    <AvatarFallback>
                      {session?.user?.name?.charAt(0).toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-3 py-2 border-b border-zinc-200 dark:border-zinc-700">
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{session?.user?.name}</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 capitalize">{session?.user?.role?.toLowerCase()}</p>
                </div>
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/admin/settings" className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <Separator />
                <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/" })}>
                  <LogOut className="h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>
      <main className="container-base py-6">{children}</main>
    </div>
  )
}

export default AdminLayout