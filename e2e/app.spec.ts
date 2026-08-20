import { test, expect } from "@playwright/test"

test.describe("Patient Booking Flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/auth/login")
    await page.fill('input[name="email"]', "patient@dentalclinic.local")
    await page.fill('input[name="password"]', "password123")
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL(/.*dashboard/)
  })

  test("patient can book an appointment", async ({ page }) => {
    await page.goto("/dashboard/patient/booking")

    await expect(page.locator("h1")).toContainText("Book Appointment")

    await page.click('button:has-text("Dental Cleaning")')
    await page.click('button:has-text("Next")')

    await page.click('button:has-text("Dr. Santos")')
    await page.click('button:has-text("Next")')

    await page.click('button:has-text("10:00")')
    await page.click('button:has-text("Next")')

    await page.fill('textarea[name="notes"]', "Test booking")
    await page.click('button:has-text("Confirm Booking")')

    await expect(page).toHaveURL(/.*appointments/)
    await expect(page.locator("text=Dental Cleaning")).toBeVisible()
    await expect(page.locator("text=Dr. Santos")).toBeVisible()
  })
})

test.describe("Receptionist Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/auth/login")
    await page.fill('input[name="email"]', "reception@dentalclinic.local")
    await page.fill('input[name="password"]', "password123")
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL(/.*dashboard/)
  })

  test("receptionist can see appointments", async ({ page }) => {
    await page.goto("/dashboard/receptionist/appointments")
    await expect(page.locator("h1")).toContainText("Appointments")
  })

  test("receptionist can confirm appointment", async ({ page }) => {
    await page.goto("/dashboard/receptionist/appointments")
    await page.click('button:has-text("Confirm")')
    await expect(page.locator('text="Confirmed"')).toBeVisible()
  })
})

test.describe("Dentist Workspace", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/auth/login")
    await page.fill('input[name="email"]', "dentist@dentalclinic.local")
    await page.fill('input[name="password"]', "password123")
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL(/.*dashboard/)
  })

  test("dentist can see today's schedule", async ({ page }) => {
    await page.goto("/dashboard/dentist/schedule")
    await expect(page.locator("h1")).toContainText("Today's Schedule")
  })
})

test.describe("Admin Console", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/auth/login")
    await page.fill('input[name="email"]', "admin@dentalclinic.local")
    await page.fill('input[name="password"]', "password123")
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL(/.*dashboard/)
  })

  test("admin can manage services", async ({ page }) => {
    await page.goto("/dashboard/admin/services")
    await expect(page.locator("h1")).toContainText("Services")

    await page.click('button:has-text("Add Service")')
    await page.fill('input[name="name"]', "New Service")
    await page.fill('input[name="durationMinutes"]', "30")
    await page.fill('input[name="price"]', "1000")
    await page.click('button:has-text("Save")')

    await expect(page.locator('text="New Service"')).toBeVisible()
  })

  test("admin can manage dentists", async ({ page }) => {
    await page.goto("/dashboard/admin/dentists")
    await expect(page.locator("h1")).toContainText("Dentists")
  })
})

test.describe("Accessibility", () => {
  test("pages have proper heading structure", async ({ page }) => {
    await page.goto("/dashboard/patient/booking")
    const h1Count = await page.locator("h1").count()
    expect(h1Count).toBe(1)
  })

  test("forms have proper labels", async ({ page }) => {
    await page.goto("/auth/login")
    const emailLabel = await page.locator("label[for='email']").count()
    const passwordLabel = await page.locator("label[for='password']").count()
    expect(emailLabel).toBe(1)
    expect(passwordLabel).toBe(1)
  })

  test("buttons have accessible names", async ({ page }) => {
    await page.goto("/dashboard/patient/booking")
    const buttons = page.locator("button")
    const count = await buttons.count()
    for (let i = 0; i < count; i++) {
      const button = buttons.nth(i)
      const text = await button.textContent()
      expect(text?.trim().length).toBeGreaterThan(0)
    }
  })
})