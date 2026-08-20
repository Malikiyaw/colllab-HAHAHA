# Dental Clinic Booking System - Implementation Plan

## Project Overview
Full-stack dental clinic operations platform with four connected interfaces: Public Website, Patient Booking, Clinic Operations, Dentist Workspace, and Administration. Strict design constraints: simple architecture, zero unnecessary decoration, dense professional UI.

## Tech Stack
- **Frontend**: Next.js, TypeScript, Tailwind CSS, shadcn/ui, Radix UI, Lucide Icons
- **Backend**: Next.js Route Handlers, TypeScript, Zod, Prisma
- **Database**: PostgreSQL (free provider for production, local for dev)
- **Auth**: Auth.js with PostgreSQL sessions
- **Hosting**: GitHub/Vercel (free plans)
- **Testing**: Vitest, Playwright, ESLint, TypeScript

## Database Schema
Tables: Users (with role), Patients, Dentists, Services, DentistSchedules, BlockedTimes, Appointments, AuditLogs

## API Architecture
- `/api/auth` - Authentication endpoints
- `/api/services` - Service management
- `/api/dentists` - Dentist management with schedule endpoints
- `/api/availability` - Real-time slot availability
- `/api/appointments` - Full booking lifecycle (create, cancel, confirm, check-in, complete)
- `/api/patients` - Patient management
- `/api/admin` - Admin-only endpoints for staff, services, schedules, blocked times, audit logs

## Key Features

### Booking Engine (Critical)
- Transactional booking with database-level conflict prevention
- Real-time availability checking in transaction
- 11-step validation process in single API call
- Appointment state machine (PENDING→CONFIRMED→CHECKED_IN→IN_PROGRESS→COMPLETED)

### User Roles
- **Patient**: Book, view, cancel, reschedule, update profile
- **Receptionist**: Calendar management, walk-ins, confirm, check-in, no-show marking
- **Dentist**: Schedule view, patient details, clinical notes, appointment completion
- **Admin**: All receptionist features + dentist/staff management, services, schedules, audit logs

### Design System Requirements
- Neutral color palette (1 accent color only)
- Inter/Geist typography hierarchy
- Border-based visual separation
- No decorative UI elements
- Structured dense layouts
- Mobile-optimized booking experience

## Implementation Phases

### Phase 1: Foundation
- [ ] Next.js project setup with TypeScript
- [ ] Tailwind CSS + shadcn/ui configuration
- [ ] PostgreSQL setup with environment configuration
- [ ] Auth.js configuration
- [ ] Git repository structure

### Phase 2: Design System
- [ ] Define color tokens and CSS variables
- [ ] Typography and spacing system
- [ ] Component library (AppShell, DataTable, StatusLabel, etc.)
- [ ] Border-based layout patterns

### Phase 3: Authentication
- [ ] Register, login, logout with role-based sessions
- [ ] Route protection middleware
- [ ] Password hashing

### Phase 4: Database
- [ ] All Prisma models with relations
- [ ] Seed data for initial setup
- [ ] Appointment state machine constraints

### Phase 5: Clinic Management
- [ ] CRUD services
- [ ] Dentist management with schedules
- [ ] Clinic hours configuration
- [ ] Blocked time management

### Phase 6: Booking Engine
- [ ] Availability API with conflict detection
- [ ] Transactional booking with atomic operations
- [ ] Appointment lifecycle (create, cancel, reschedule)

### Phase 7: Patient Portal
- [ ] Dashboard with upcoming appointments
- [ ] Booking interface with step-by-step flow
- [ ] Appointment management

### Phase 8: Receptionist
- [ ] Calendar interface with drag-and-drop? (basic version)
- [ ] Patient search and walk-in booking
- [ ] Confirmation, check-in, no-show management

### Phase 9: Dentist Workspace
- [ ] Daily schedule view
- [ ] Patient details and clinical notes
- [ ] Appointment completion workflow

### Phase 10: Admin
- [ ] User management
- [ ] All clinic configuration
- [ ] Audit log viewing

### Phase 11: Quality
- [ ] Unit tests for availability/conflict logic
- [ ] Integration tests for booking workflow
- [ ] Playwright E2E tests (critical: concurrent booking test)
- [ ] Accessibility review

### Phase 12: Deployment
- [ ] Production PostgreSQL setup
- [ ] Environment configuration
- [ ] GitHub/Vercel deployment
- [ ] Monitoring and backup strategy

## Definition of Done
V1 production capability when:
- Patient can register, book, and manage appointments
- Receptionist can manage calendar and confirm/check-in
- Dentist can complete appointments with notes
- Admin can manage all clinic operations
- Booking integrity maintained under concurrent access
- Design system implemented (no decorative UI)

## Critical Risks
1. Booking race condition - must use database transactions
2. Design system compliance - strict anti-vibe constraints
3. Concurrent booking integrity - must test thoroughly
4. Performance under load - single Next.js architecture

## Next Steps
This plan is ready for implementation. Begin with Phase 1 (foundation) to establish the core infrastructure and design system before building business logic.