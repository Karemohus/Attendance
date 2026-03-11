import { pgTable, text, serial, integer, timestamp, boolean, doublePrecision, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const departments = pgTable("departments", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  region: text("region").notNull(),
});

export const locations = pgTable("locations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  latitude: doublePrecision("latitude").notNull(),
  longitude: doublePrecision("longitude").notNull(),
  radius: integer("radius").notNull(),
  departmentId: integer("department_id").notNull().references(() => departments.id),
});

export const shifts = pgTable("shifts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  departmentId: integer("department_id").notNull().references(() => departments.id),
  graceMinutesIn: integer("grace_minutes_in").default(0).notNull(),
  graceMinutesOut: integer("grace_minutes_out").default(0).notNull(),
  workDays: text("work_days").notNull().default('["monday","tuesday","wednesday","thursday","friday","saturday","sunday"]'),
  requiredHours: integer("required_hours").default(8).notNull(),
  allowOvertime: boolean("allow_overtime").default(false).notNull(),
  maxOvertimeEnd: text("max_overtime_end"),
  isFlexible: boolean("is_flexible").default(false).notNull(),
  flexibleDayStart: text("flexible_day_start"),
  flexibleDayEnd: text("flexible_day_end"),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  employeeId: text("employee_id").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  email: text("email"),
  role: text("role").default("employee").notNull(),
  locationId: integer("location_id").references(() => locations.id),
  departmentId: integer("department_id").references(() => departments.id),
  shiftId: integer("shift_id").references(() => shifts.id),
  forcePasswordChange: boolean("force_password_change").default(true).notNull(),
});

export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  appName: text("app_name").notNull().default("Attendance System"),
  logoUrl: text("logo_url"),
  resendApiKey: text("resend_api_key"),
});

export const attendance = pgTable("attendance", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: text("type").notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  latitude: doublePrecision("latitude").notNull(),
  longitude: doublePrecision("longitude").notNull(),
  status: text("status").notNull(),
  selfieUrl: text("selfie_url"),
}, (table) => [
  index("idx_attendance_user_timestamp").on(table.userId, table.timestamp),
  index("idx_attendance_timestamp").on(table.timestamp),
]);

// جدول توكنات إعادة تعيين كلمة المرور
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").default(false).notNull(),
});

// جدول أجهزة الكيوسك
export const kioskDevices = pgTable("kiosk_devices", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  token: text("token").notNull().unique(),
  departmentId: integer("department_id").notNull().references(() => departments.id),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations
export const departmentsRelations = relations(departments, ({ many }) => ({
  locations: many(locations),
  shifts: many(shifts),
  users: many(users),
  kioskDevices: many(kioskDevices),
}));

export const locationsRelations = relations(locations, ({ one, many }) => ({
  department: one(departments, { fields: [locations.departmentId], references: [departments.id] }),
  users: many(users),
}));

export const shiftsRelations = relations(shifts, ({ one }) => ({
  department: one(departments, { fields: [shifts.departmentId], references: [departments.id] }),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  location: one(locations, { fields: [users.locationId], references: [locations.id] }),
  department: one(departments, { fields: [users.departmentId], references: [departments.id] }),
  shift: one(shifts, { fields: [users.shiftId], references: [shifts.id] }),
  attendances: many(attendance),
}));

export const attendanceRelations = relations(attendance, ({ one }) => ({
  user: one(users, { fields: [attendance.userId], references: [users.id] }),
}));

export const kioskDevicesRelations = relations(kioskDevices, ({ one }) => ({
  department: one(departments, { fields: [kioskDevices.departmentId], references: [departments.id] }),
}));

// Insert schemas
export const insertSettingsSchema = createInsertSchema(settings).omit({ id: true });
export const insertDepartmentSchema = createInsertSchema(departments).omit({ id: true });
export const insertLocationSchema = createInsertSchema(locations).omit({ id: true });
export const insertShiftSchema = createInsertSchema(shifts).omit({ id: true });
export const insertUserSchema = createInsertSchema(users).omit({ id: true, forcePasswordChange: true });
export const insertAttendanceSchema = createInsertSchema(attendance).omit({ id: true, timestamp: true, userId: true, status: true });

// Types
export type Settings = typeof settings.$inferSelect;
export type InsertSettings = z.infer<typeof insertSettingsSchema>;
export type Department = typeof departments.$inferSelect;
export type Location = typeof locations.$inferSelect;
export type Shift = typeof shifts.$inferSelect;
export type User = typeof users.$inferSelect;
export type Attendance = typeof attendance.$inferSelect;
export type KioskDevice = typeof kioskDevices.$inferSelect;

export type InsertDepartment = z.infer<typeof insertDepartmentSchema>;
export type InsertLocation = z.infer<typeof insertLocationSchema>;
export type InsertShift = z.infer<typeof insertShiftSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertAttendance = z.infer<typeof insertAttendanceSchema>;

// Safe user type — بدون كلمة المرور
export type SafeUser = Omit<User, 'password'>;
export type AttendanceWithUser = Attendance & { user: SafeUser };
export type UserWithLocation = SafeUser & { location?: Location | null, department?: Department | null, shift?: Shift | null };
export type ShiftWithDepartment = Shift & { department: Department };
export type LocationWithDepartment = Location & { department: Department };

// Monthly Report type
export type MonthlyReportEntry = {
  userId: number;
  employeeId: string;
  employeeName: string;
  departmentName: string | null;
  totalWorkDays: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  earlyOutDays: number;
  overtimeDays: number;
  totalWorkedHours: number;
  totalRequiredHours: number;
  averageDailyHours: number;
};
