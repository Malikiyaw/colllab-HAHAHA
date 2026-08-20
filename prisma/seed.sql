-- Seed data for Dental Clinic
-- Run as: psql -U dental_clinic -d dental_clinic -f prisma/seed.sql

-- Insert users
INSERT INTO "User" (id, email, name, "passwordHash", role, active, "createdAt", "updatedAt")
VALUES 
  ('admin-001', 'admin@dentalclinic.local', 'Admin User', '$argon2id$v=19$m=65536,t=3,p=1$71C8kV2/yFdvzXFPFELTDg$X3dvwSFFw8/lvqNj4bbZuamM1i0JAjWM/VZBIEhgPXc', 'SUPER_ADMIN', true, NOW(), NOW()),
  ('reception-001', 'reception@dentalclinic.local', 'Receptionist User', '$argon2id$v=19$m=65536,t=3,p=1$71C8kV2/yFdvzXFPFELTDg$X3dvwSFFw8/lvqNj4bbZuamM1i0JAjWM/VZBIEhgPXc', 'RECEPTIONIST', true, NOW(), NOW()),
  ('dentist-001', 'dentist@dentalclinic.local', 'Dr. Santos', '$argon2id$v=19$m=65536,t=3,p=1$71C8kV2/yFdvzXFPFELTDg$X3dvwSFFw8/lvqNj4bbZuamM1i0JAjWM/VZBIEhgPXc', 'DENTIST', true, NOW(), NOW()),
  ('dentist-002', 'dentist2@dentalclinic.local', 'Dr. Reyes', '$argon2id$v=19$m=65536,t=3,p=1$71C8kV2/yFdvzXFPFELTDg$X3dvwSFFw8/lvqNj4bbZuamM1i0JAjWM/VZBIEhgPXc', 'DENTIST', true, NOW(), NOW()),
  ('patient-001', 'patient@dentalclinic.local', 'Maria Santos', '$argon2id$v=19$m=65536,t=3,p=1$71C8kV2/yFdvzXFPFELTDg$X3dvwSFFw8/lvqNj4bbZuamM1i0JAjWM/VZBIEhgPXc', 'PATIENT', true, NOW(), NOW())
ON CONFLICT (email) DO NOTHING;

-- Insert staff
INSERT INTO "Staff" (id, "userId", position, active, "createdAt", "updatedAt")
VALUES ('staff-001', 'reception-001', 'Front Desk', true, NOW(), NOW())
ON CONFLICT ("userId") DO NOTHING;

-- Insert dentists
INSERT INTO "Dentist" (id, "userId", specialization, "licenseNumber", bio, active, color, "createdAt", "updatedAt")
VALUES 
  ('dentist-rec-001', 'dentist-001', 'General Dentistry', 'DENT-001', 'General dentist with 10 years experience', true, '#EA580C', NOW(), NOW()),
  ('dentist-rec-002', 'dentist-002', 'Orthodontics', 'DENT-002', 'Orthodontist with 8 years experience', true, '#2563EB', NOW(), NOW())
ON CONFLICT ("userId") DO NOTHING;

-- Insert patient
INSERT INTO "Patient" (id, "userId", "dateOfBirth", address, "emergencyContactName", "emergencyContactPhone", "medicalNotes", "createdAt", "updatedAt")
VALUES ('patient-rec-001', 'patient-001', '1990-05-15', '123 Main St, Manila', 'Juan Santos', '+63 912 345 6789', 'No known allergies', NOW(), NOW())
ON CONFLICT ("userId") DO NOTHING;

-- Insert service categories
INSERT INTO "ServiceCategory" (id, name, description, active, "createdAt", "updatedAt")
VALUES 
  ('cat-preventive', 'Preventive', 'Preventive dental care', true, NOW(), NOW()),
  ('cat-restorative', 'Restorative', 'Restorative dental procedures', true, NOW(), NOW()),
  ('cat-surgical', 'Surgical', 'Surgical dental procedures', true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Insert services
INSERT INTO "Service" (id, "categoryId", name, description, "durationMinutes", price, "bufferBeforeMinutes", "bufferAfterMinutes", active, color, "createdAt", "updatedAt")
VALUES 
  ('cleaning', 'cat-preventive', 'Dental Cleaning', 'Routine prophylaxis cleaning', 30, 800, 5, 5, true, '#16A34A', NOW(), NOW()),
  ('filling', 'cat-restorative', 'Composite Filling', 'Tooth-colored composite filling', 45, 1200, 5, 5, true, '#D97706', NOW(), NOW()),
  ('consultation', 'cat-preventive', 'Consultation', 'General dental consultation', 30, 500, 5, 5, true, '#2563EB', NOW(), NOW()),
  ('extraction', 'cat-surgical', 'Simple Extraction', 'Simple tooth extraction', 60, 2000, 10, 10, true, '#DC2626', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Assign services to dentists
INSERT INTO "DentistService" ("dentistId", "serviceId", active, "priceOverride")
VALUES 
  ('dentist-rec-001', 'cleaning', true, NULL),
  ('dentist-rec-001', 'filling', true, NULL),
  ('dentist-rec-001', 'consultation', true, NULL),
  ('dentist-rec-001', 'extraction', true, NULL),
  ('dentist-rec-002', 'cleaning', true, NULL),
  ('dentist-rec-002', 'consultation', true, NULL)
ON CONFLICT ("dentistId", "serviceId") DO NOTHING;

-- Insert dentist schedules (Mon-Fri 9-17, Sat 9-15)
INSERT INTO "DentistSchedule" (id, "dentistId", "dayOfWeek", "startTime", "endTime", active)
VALUES 
  -- Dr. Santos
  ('ds-001-1', 'dentist-rec-001', 1, '09:00', '17:00', true),
  ('ds-001-2', 'dentist-rec-001', 2, '09:00', '17:00', true),
  ('ds-001-3', 'dentist-rec-001', 3, '09:00', '17:00', true),
  ('ds-001-4', 'dentist-rec-001', 4, '09:00', '17:00', true),
  ('ds-001-5', 'dentist-rec-001', 5, '09:00', '17:00', true),
  ('ds-001-6', 'dentist-rec-001', 6, '09:00', '15:00', true),
  -- Dr. Reyes
  ('ds-002-1', 'dentist-rec-002', 1, '09:00', '17:00', true),
  ('ds-002-2', 'dentist-rec-002', 2, '09:00', '17:00', true),
  ('ds-002-3', 'dentist-rec-002', 3, '09:00', '17:00', true),
  ('ds-002-4', 'dentist-rec-002', 4, '09:00', '17:00', true),
  ('ds-002-5', 'dentist-rec-002', 5, '09:00', '17:00', true),
  ('ds-002-6', 'dentist-rec-002', 6, '09:00', '15:00', true)
ON CONFLICT (id) DO NOTHING;

-- Insert clinic schedules
INSERT INTO "ClinicSchedule" (id, "dayOfWeek", "startTime", "endTime", active)
VALUES 
  ('clinic-1', 1, '09:00', '18:00', true),
  ('clinic-2', 2, '09:00', '18:00', true),
  ('clinic-3', 3, '09:00', '18:00', true),
  ('clinic-4', 4, '09:00', '18:00', true),
  ('clinic-5', 5, '09:00', '18:00', true),
  ('clinic-6', 6, '09:00', '15:00', true)
ON CONFLICT (id) DO NOTHING;

-- Insert settings
INSERT INTO "Setting" (key, value, "updatedAt")
VALUES 
  ('clinic_name', '"Dental Clinic"', NOW()),
  ('timezone', '"Asia/Manila"', NOW()),
  ('currency', '"PHP"', NOW()),
  ('reminder_hours', '[24, 1]', NOW()),
  ('waitlist_notify_window_hours', '2', NOW()),
  ('grace_period_minutes', '15', NOW())
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, "updatedAt" = NOW();