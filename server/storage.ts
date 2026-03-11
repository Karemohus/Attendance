import { db } from "./db";
import { eq, desc, and, gte, lte, sql } from "drizzle-orm";
import {
  users, locations, attendance, shifts, settings, departments,
  passwordResetTokens, kioskDevices,
  type User, type InsertUser, type Location, type InsertLocation,
  type Attendance, type InsertAttendance, type UserWithLocation,
  type AttendanceWithUser, type Shift, type InsertShift,
  type ShiftWithDepartment, type Department, type InsertDepartment,
  type LocationWithDepartment, type SafeUser, type MonthlyReportEntry,
  type KioskDevice
} from "@shared/schema";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";
import crypto from "crypto";

const PostgresStore = connectPg(session);

// ========== Password Hashing ==========
// استخدام crypto.scrypt بدل bcrypt عشان ما يحتاج native modules
function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString('hex');
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) reject(err);
      resolve(`${salt}:${derivedKey.toString('hex')}`);
    });
  });
}

function verifyPassword(password: string, hash: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    // دعم كلمات المرور القديمة (plain text) للتوافق
    if (!hash.includes(':')) {
      resolve(password === hash);
      return;
    }
    const [salt, key] = hash.split(':');
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) reject(err);
      resolve(derivedKey.toString('hex') === key);
    });
  });
}

// ========== Strip Password ==========
function stripPassword(user: User): SafeUser {
  const { password, ...safeUser } = user;
  return safeUser;
}

export interface IStorage {
  // Auth
  getUser(id: number): Promise<User | undefined>;
  getSafeUser(id: number): Promise<SafeUser | undefined>;
  getUserByEmployeeId(employeeId: string): Promise<User | undefined>;
  getUsers(): Promise<UserWithLocation[]>;
  createUser(user: InsertUser): Promise<SafeUser>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<SafeUser>;
  deleteUser(id: number): Promise<void>;
  verifyUserPassword(employeeId: string, password: string): Promise<User | null>;
  getUserByEmail(email: string): Promise<User | undefined>;

  // Password Reset
  createResetToken(userId: number): Promise<string>;
  verifyResetToken(token: string): Promise<number | null>;
  markTokenUsed(token: string): Promise<void>;

  // Departments
  getDepartments(): Promise<Department[]>;
  getDepartment(id: number): Promise<Department | undefined>;
  createDepartment(department: InsertDepartment): Promise<Department>;
  updateDepartment(id: number, department: Partial<InsertDepartment>): Promise<Department>;
  deleteDepartment(id: number): Promise<void>;

  // Locations
  getLocations(): Promise<LocationWithDepartment[]>;
  getLocation(id: number): Promise<Location | undefined>;
  createLocation(location: InsertLocation): Promise<Location>;
  updateLocation(id: number, location: Partial<InsertLocation>): Promise<Location>;
  deleteLocation(id: number): Promise<void>;

  // Shifts
  getShifts(): Promise<ShiftWithDepartment[]>;
  getShift(id: number): Promise<Shift | undefined>;
  createShift(shift: InsertShift): Promise<Shift>;
  updateShift(id: number, shift: Partial<InsertShift>): Promise<Shift>;
  deleteShift(id: number): Promise<void>;

  // Attendance
  getAttendances(): Promise<AttendanceWithUser[]>;
  getAttendancesByUserAndDate(userId: number, startDate: Date, endDate: Date): Promise<Attendance[]>;
  getAttendancesByDateRange(startDate: Date, endDate: Date): Promise<AttendanceWithUser[]>;
  createAttendance(attendance: InsertAttendance & { userId: number; status: string }): Promise<Attendance>;

  // Kiosk
  getKioskDevice(token: string): Promise<KioskDevice | undefined>;
  getKioskDevices(): Promise<KioskDevice[]>;
  createKioskDevice(name: string, departmentId: number): Promise<KioskDevice>;
  deleteKioskDevice(id: number): Promise<void>;

  // Settings
  getSettings(): Promise<any>;
  updateSettings(settings: any): Promise<any>;

  // Reports
  generateMonthlyReport(year: number, month: number, departmentId?: number): Promise<MonthlyReportEntry[]>;

  sessionStore: session.Store;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresStore({
      pool,
      createTableIfMissing: true,
    });
  }

  // ========== Users ==========
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getSafeUser(id: number): Promise<SafeUser | undefined> {
    const user = await this.getUser(id);
    return user ? stripPassword(user) : undefined;
  }

  async getUserByEmployeeId(employeeId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.employeeId, employeeId));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async verifyUserPassword(employeeId: string, password: string): Promise<User | null> {
    const user = await this.getUserByEmployeeId(employeeId);
    if (!user) return null;
    const valid = await verifyPassword(password, user.password);
    return valid ? user : null;
  }

  async getUsers(): Promise<UserWithLocation[]> {
    const rows = await db.select().from(users)
      .leftJoin(locations, eq(users.locationId, locations.id))
      .leftJoin(departments, eq(users.departmentId, departments.id))
      .leftJoin(shifts, eq(users.shiftId, shifts.id));
    return rows.map(r => {
      const { password, ...safeUser } = r.users;
      return {
        ...safeUser,
        location: r.locations,
        department: r.departments,
        shift: r.shifts
      };
    });
  }

  async createUser(insertUser: InsertUser): Promise<SafeUser> {
    const hashedPassword = await hashPassword(insertUser.password);
    const [user] = await db.insert(users).values({
      ...insertUser,
      password: hashedPassword,
    }).returning();
    return stripPassword(user);
  }

  async updateUser(id: number, update: Partial<InsertUser>): Promise<SafeUser> {
    const toUpdate: any = { ...update };
    if (update.password) {
      toUpdate.password = await hashPassword(update.password);
    }
    const [updated] = await db.update(users).set(toUpdate).where(eq(users.id, id)).returning();
    return stripPassword(updated);
  }

  async deleteUser(id: number): Promise<void> {
    // الحضور يُحذف تلقائياً بسبب onDelete: 'cascade'
    await db.delete(users).where(eq(users.id, id));
  }

  // ========== Password Reset ==========
  async setForcePasswordChange(userId: number, value: boolean): Promise<void> {
    await db.update(users).set({ forcePasswordChange: value }).where(eq(users.id, userId));
  }

  async createResetToken(userId: number): Promise<string> {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // ساعة واحدة
    await db.insert(passwordResetTokens).values({ userId, token, expiresAt });
    return token;
  }

  async verifyResetToken(token: string): Promise<number | null> {
    const [row] = await db.select().from(passwordResetTokens)
      .where(and(
        eq(passwordResetTokens.token, token),
        eq(passwordResetTokens.used, false),
        gte(passwordResetTokens.expiresAt, new Date())
      ));
    return row ? row.userId : null;
  }

  async markTokenUsed(token: string): Promise<void> {
    await db.update(passwordResetTokens)
      .set({ used: true })
      .where(eq(passwordResetTokens.token, token));
  }

  // ========== Departments ==========
  async getDepartments(): Promise<Department[]> {
    return await db.select().from(departments);
  }

  async getDepartment(id: number): Promise<Department | undefined> {
    const [dept] = await db.select().from(departments).where(eq(departments.id, id));
    return dept;
  }

  async createDepartment(insertDepartment: InsertDepartment): Promise<Department> {
    const [dept] = await db.insert(departments).values(insertDepartment).returning();
    return dept;
  }

  async updateDepartment(id: number, department: Partial<InsertDepartment>): Promise<Department> {
    const [updated] = await db.update(departments).set(department).where(eq(departments.id, id)).returning();
    return updated;
  }

  async deleteDepartment(id: number): Promise<void> {
    await db.update(users).set({ departmentId: null }).where(eq(users.departmentId, id));
    await db.delete(locations).where(eq(locations.departmentId, id));
    await db.delete(shifts).where(eq(shifts.departmentId, id));
    await db.delete(kioskDevices).where(eq(kioskDevices.departmentId, id));
    await db.delete(departments).where(eq(departments.id, id));
  }

  // ========== Locations ==========
  async getLocations(): Promise<LocationWithDepartment[]> {
    const rows = await db.select().from(locations).innerJoin(departments, eq(locations.departmentId, departments.id));
    return rows.map(r => ({ ...r.locations, department: r.departments }));
  }

  async getLocation(id: number): Promise<Location | undefined> {
    const [loc] = await db.select().from(locations).where(eq(locations.id, id));
    return loc;
  }

  async createLocation(insertLocation: InsertLocation): Promise<Location> {
    const [loc] = await db.insert(locations).values(insertLocation).returning();
    return loc;
  }

  async updateLocation(id: number, location: Partial<InsertLocation>): Promise<Location> {
    const [updated] = await db.update(locations).set(location).where(eq(locations.id, id)).returning();
    return updated;
  }

  async deleteLocation(id: number): Promise<void> {
    await db.update(users).set({ locationId: null }).where(eq(users.locationId, id));
    await db.delete(locations).where(eq(locations.id, id));
  }

  // ========== Shifts ==========
  async getShifts(): Promise<ShiftWithDepartment[]> {
    const rows = await db.select().from(shifts).innerJoin(departments, eq(shifts.departmentId, departments.id));
    return rows.map(r => ({ ...r.shifts, department: r.departments }));
  }

  async getShift(id: number): Promise<Shift | undefined> {
    const [s] = await db.select().from(shifts).where(eq(shifts.id, id));
    return s;
  }

  async createShift(insertShift: InsertShift): Promise<Shift> {
    const [shift] = await db.insert(shifts).values(insertShift).returning();
    return shift;
  }

  async updateShift(id: number, shift: Partial<InsertShift>): Promise<Shift> {
    const [updated] = await db.update(shifts).set(shift).where(eq(shifts.id, id)).returning();
    return updated;
  }

  async deleteShift(id: number): Promise<void> {
    await db.update(users).set({ shiftId: null }).where(eq(users.shiftId, id));
    await db.delete(shifts).where(eq(shifts.id, id));
  }

  // ========== Attendance ==========
  async getAttendances(): Promise<AttendanceWithUser[]> {
    const rows = await db.select().from(attendance)
      .innerJoin(users, eq(attendance.userId, users.id))
      .orderBy(desc(attendance.timestamp));
    return rows.map(r => {
      const { password, ...safeUser } = r.users;
      return { ...r.attendance, user: safeUser };
    });
  }

  // Query مخصص — بيجيب سجلات مستخدم معين في فترة معينة
  async getAttendancesByUserAndDate(userId: number, startDate: Date, endDate: Date): Promise<Attendance[]> {
    return await db.select().from(attendance)
      .where(and(
        eq(attendance.userId, userId),
        gte(attendance.timestamp, startDate),
        lte(attendance.timestamp, endDate)
      ))
      .orderBy(desc(attendance.timestamp));
  }

  // Query مخصص — بيجيب كل السجلات في فترة معينة
  async getAttendancesByDateRange(startDate: Date, endDate: Date): Promise<AttendanceWithUser[]> {
    const rows = await db.select().from(attendance)
      .innerJoin(users, eq(attendance.userId, users.id))
      .where(and(
        gte(attendance.timestamp, startDate),
        lte(attendance.timestamp, endDate)
      ))
      .orderBy(desc(attendance.timestamp));
    return rows.map(r => {
      const { password, ...safeUser } = r.users;
      return { ...r.attendance, user: safeUser };
    });
  }

  async createAttendance(insertAttendance: InsertAttendance & { userId: number; status: string }): Promise<Attendance> {
    const [att] = await db.insert(attendance).values(insertAttendance).returning();
    return att;
  }

  // ========== Kiosk Devices ==========
  async getKioskDevice(token: string): Promise<KioskDevice | undefined> {
    const [device] = await db.select().from(kioskDevices)
      .where(and(eq(kioskDevices.token, token), eq(kioskDevices.isActive, true)));
    return device;
  }

  async getKioskDevices(): Promise<KioskDevice[]> {
    return await db.select().from(kioskDevices);
  }

  async createKioskDevice(name: string, departmentId: number): Promise<KioskDevice> {
    const token = crypto.randomBytes(32).toString('hex');
    const [device] = await db.insert(kioskDevices).values({ name, departmentId, token }).returning();
    return device;
  }

  async deleteKioskDevice(id: number): Promise<void> {
    await db.delete(kioskDevices).where(eq(kioskDevices.id, id));
  }

  // ========== Settings ==========
  async getSettings(): Promise<any> {
    const [s] = await db.select().from(settings);
    if (!s) {
      const [newS] = await db.insert(settings).values({ appName: "Attendance System" }).returning();
      return newS;
    }
    return s;
  }

  async updateSettings(update: any): Promise<any> {
    const s = await this.getSettings();
    const [updated] = await db.update(settings).set(update).where(eq(settings.id, s.id)).returning();
    return updated;
  }

  // ========== Monthly Report ==========
  async generateMonthlyReport(year: number, month: number, departmentId?: number): Promise<MonthlyReportEntry[]> {
    // حساب بداية ونهاية الشهر
    const startDate = new Date(year, month - 1, 1, 0, 0, 0);
    const endDate = new Date(year, month, 0, 23, 59, 59); // آخر يوم في الشهر

    // جلب كل الموظفين
    let allUsers = await this.getUsers();
    if (departmentId) {
      allUsers = allUsers.filter(u => u.departmentId === departmentId);
    }
    // فقط الموظفين (مش الأدمن)
    const employeeUsers = allUsers.filter(u => u.role === 'employee' || u.role === 'supervisor');

    // جلب سجلات الحضور للشهر
    const monthAttendance = await this.getAttendancesByDateRange(startDate, endDate);

    // جلب الشيفتات
    const allShifts = await this.getShifts();

    const report: MonthlyReportEntry[] = [];

    for (const emp of employeeUsers) {
      // إيجاد الشيفت
      let shift = emp.shift ? allShifts.find(s => s.id === emp.shift!.id) : null;
      if (!shift && emp.departmentId) {
        shift = allShifts.find(s => s.departmentId === emp.departmentId) || null;
      }
      const requiredHoursPerDay = shift?.requiredHours || 8;
      const workDaysArr: string[] = shift ? JSON.parse(shift.workDays) : ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"];

      // حساب أيام العمل في الشهر
      let totalWorkDays = 0;
      const daysInMonth = endDate.getDate();
      const dayNames = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"];
      for (let d = 1; d <= daysInMonth; d++) {
        const date = new Date(year, month - 1, d);
        const dayName = dayNames[date.getDay()];
        if (workDaysArr.includes(dayName)) {
          totalWorkDays++;
        }
      }

      // فلترة سجلات هذا الموظف
      const empLogs = monthAttendance.filter(a => a.userId === emp.id);

      // تجميع السجلات حسب اليوم
      const dailyMap = new Map<string, { checkIn?: typeof empLogs[0], checkOut?: typeof empLogs[0] }>();
      for (const log of empLogs) {
        const dayKey = new Date(log.timestamp).toISOString().split('T')[0];
        if (!dailyMap.has(dayKey)) dailyMap.set(dayKey, {});
        const day = dailyMap.get(dayKey)!;
        if (log.type === 'check-in' && !day.checkIn) day.checkIn = log;
        if (log.type === 'check-out' && !day.checkOut) day.checkOut = log;
      }

      let presentDays = 0;
      let lateDays = 0;
      let earlyOutDays = 0;
      let overtimeDays = 0;
      let totalWorkedMs = 0;

      for (const [, day] of dailyMap) {
        if (day.checkIn) {
          presentDays++;

          // حساب التأخير
          if (shift && !shift.isFlexible) {
            const [sh, sm] = shift.startTime.split(':').map(Number);
            const checkInDate = new Date(day.checkIn.timestamp);
            const checkInMinutes = checkInDate.getHours() * 60 + checkInDate.getMinutes();
            const shiftStartMinutes = sh * 60 + sm;
            const grace = shift.graceMinutesIn || 0;
            if (checkInMinutes > shiftStartMinutes + grace) {
              lateDays++;
            }
          }

          // حساب ساعات العمل
          if (day.checkOut) {
            const inTime = new Date(day.checkIn.timestamp).getTime();
            const outTime = new Date(day.checkOut.timestamp).getTime();
            const workedMs = outTime - inTime;
            totalWorkedMs += workedMs;

            // خروج مبكر
            if (day.checkOut.status === 'early' || day.checkOut.status === 'incomplete') {
              earlyOutDays++;
            }
            // وقت إضافي
            if (day.checkOut.status === 'overtime') {
              overtimeDays++;
            }
          }
        }
      }

      const totalWorkedHours = Math.round((totalWorkedMs / (1000 * 60 * 60)) * 100) / 100;
      const absentDays = Math.max(0, totalWorkDays - presentDays);
      const averageDailyHours = presentDays > 0 ? Math.round((totalWorkedHours / presentDays) * 100) / 100 : 0;

      report.push({
        userId: emp.id,
        employeeId: emp.employeeId,
        employeeName: emp.name,
        departmentName: emp.department?.name || null,
        totalWorkDays,
        presentDays,
        absentDays,
        lateDays,
        earlyOutDays,
        overtimeDays,
        totalWorkedHours,
        totalRequiredHours: totalWorkDays * requiredHoursPerDay,
        averageDailyHours,
      });
    }

    return report;
  }
}

export const storage = new DatabaseStorage();
export { hashPassword, verifyPassword };
