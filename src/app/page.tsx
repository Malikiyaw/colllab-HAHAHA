import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

const services = [
  { name: "Cleaning", duration: "30 min", price: 800, description: "Routine dental cleaning" },
  { name: "Filling", duration: "45 min", price: 1200, description: "Composite filling" },
  { name: "Consultation", duration: "30 min", price: 500, description: "General dental consultation" },
  { name: "Extraction", duration: "60 min", price: 2000, description: "Simple tooth extraction" },
]

const hours = [
  { days: "Mon–Fri", time: "09:00–18:00" },
  { days: "Sat", time: "09:00–15:00" },
  { days: "Sun", time: "Closed" },
]

export default function HomePage() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="container-base py-4 flex items-center justify-between">
          <div className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">DENTAL CLINIC</div>
          <nav className="flex items-center gap-6 text-sm">
            <Link href="/services" className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100">Services</Link>
            <Link href="/doctors" className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100">Doctors</Link>
            <Button asChild variant="primary">
              <Link href="/auth/login" className="text-sm">Book Now</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main>
        <section className="py-16 lg:py-24 bg-white dark:bg-zinc-900">
          <div className="container-base">
            <div className="max-w-3xl">
              <h1 className="text-major-title text-zinc-900 dark:text-zinc-100 mb-4">
                Modern dental care with straightforward scheduling
              </h1>
              <p className="text-body text-zinc-600 dark:text-zinc-400 mb-8">
                Book appointments online, manage your visits, and get reminders. No phone calls needed.
              </p>
              <div className="flex flex-wrap gap-4">
                <Button asChild size="lg" variant="primary">
                  <Link href="/auth/register">Book Appointment</Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="/services">View Services</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 border-t border-zinc-200 dark:border-zinc-800">
          <div className="container-base">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h2 className="text-section text-zinc-900 dark:text-zinc-100 mb-4">Hours</h2>
                <div className="space-y-2">
                  {hours.map((h) => (
                    <div key={h.days} className="flex justify-between text-body">
                      <span className="text-zinc-600 dark:text-zinc-400">{h.days}</span>
                      <span className="text-zinc-900 dark:text-zinc-100 font-medium">{h.time}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h2 className="text-section text-zinc-900 dark:text-zinc-100 mb-4">Contact</h2>
                <div className="space-y-2 text-body">
                  <p className="text-zinc-600 dark:text-zinc-400">+63 xxx xxx xxxx</p>
                  <p className="text-zinc-600 dark:text-zinc-400">clinic@email.com</p>
                  <p className="text-zinc-600 dark:text-zinc-400">123 Dental Street, Manila</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 bg-white dark:bg-zinc-900">
          <div className="container-base">
            <h2 className="text-page-title text-zinc-900 dark:text-zinc-100 mb-8">Services</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {services.map((service) => (
                <Card key={service.name} className="h-full">
                  <CardContent className="p-6 flex flex-col h-full">
                    <h3 className="text-section text-zinc-900 dark:text-zinc-100 mb-2">{service.name}</h3>
                    <p className="text-body text-zinc-600 dark:text-zinc-400 mb-4 flex-1">{service.description}</p>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-zinc-500 dark:text-zinc-400">Duration</span>
                        <span className="text-zinc-900 dark:text-zinc-100 font-medium">{service.duration}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500 dark:text-zinc-400">Price</span>
                        <span className="text-zinc-900 dark:text-zinc-100 font-medium">₱{service.price}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 py-8">
        <div className="container-base text-center text-sm text-zinc-500 dark:text-zinc-400">
          © 2026 Dental Clinic. All rights reserved.
        </div>
      </footer>
    </div>
  )
}