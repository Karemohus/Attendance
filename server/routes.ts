import type { Express } from "express";
import type { Server } from "http";
import { storage, hashPassword } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import session from "express-session";
import crypto from "crypto";

declare module 'express-session' {
  interface SessionData {
    userId: number;
  }
}

// ========== Haversine Distance ==========
function getDistanceFromLatLonInMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3;
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}
function deg2rad(deg: number) { return deg * (Math.PI/180); }

// ========== Saudi Timezone Helper ==========
const SAUDI_OFFSET_MS = 3 * 60 * 60 * 1000; // UTC+3

function getSaudiNow(): Date {
  const nowUTC = new Date();
  return new Date(nowUTC.getTime() + SAUDI_OFFSET_MS);
}

function getSaudiToday(): { start: Date; end: Date } {
  const saudi = getSaudiNow();
  const year = saudi.getUTCFullYear();
  const month = saudi.getUTCMonth();
  const day = saudi.getUTCDate();
  // بداية اليوم السعودي بـ UTC
  const start = new Date(Date.UTC(year, month, day, 0, 0, 0) - SAUDI_OFFSET_MS);
  const end = new Date(Date.UTC(year, month, day, 23, 59, 59, 999) - SAUDI_OFFSET_MS);
  return { start, end };
}

function getSaudiMinutes(): { currentMinutes: number; dayName: string } {
  const saudi = getSaudiNow();
  const currentMinutes = saudi.getUTCHours() * 60 + saudi.getUTCMinutes();
  const dayNames = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"];
  const dayName = dayNames[saudi.getUTCDay()];
  return { currentMinutes, dayName };
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

// ========== Shift Validation Logic ==========
// نافذة الدخول: من 60 دقيقة قبل بداية الشيفت إلى بداية الشيفت + grace
const EARLY_ARRIVAL_WINDOW = 60; // دقيقة — كم يقدر يبكر قبل الشيفت

interface ShiftCheckResult {
  allowed: boolean;
  status: string;
  message?: string;
}

function isNightShift(startMinutes: number, endMinutes: number): boolean {
  return endMinutes <= startMinutes;
}

// تطبيع الوقت للشيفتات الليلية — يخلي كل الأوقات في نفس الإطار
function normalizeForNightShift(minutes: number, shiftStartMinutes: number): number {
  if (minutes < shiftStartMinutes - EARLY_ARRIVAL_WINDOW) {
    return minutes + 24 * 60;
  }
  return minutes;
}

function validateFixedCheckIn(
  currentMinutes: number,
  shift: any
): ShiftCheckResult {
  const shiftStartMinutes = timeToMinutes(shift.startTime);
  const shiftEndMinutes = timeToMinutes(shift.endTime);
  const graceIn = shift.graceMinutesIn || 0;
  const nightShift = isNightShift(shiftStartMinutes, shiftEndMinutes);

  let current = currentMinutes;
  let start = shiftStartMinutes;

  if (nightShift) {
    current = normalizeForNightShift(currentMinutes, shiftStartMinutes);
    start = shiftStartMinutes;
    // لو الـ end أصغر من الـ start (ليلي)، نضيف 24 ساعة
  }

  const earliestArrival = start - EARLY_ARRIVAL_WINDOW;
  const latestArrival = start + graceIn;

  // قبل نافذة الدخول بكثير
  if (current < earliestArrival) {
    return {
      allowed: false,
      status: "rejected",
      message: `مبكر جداً - الدخول متاح من ${minutesToTime(shiftStartMinutes - EARLY_ARRIVAL_WINDOW)} (قبل الشيفت بساعة)`
    };
  }

  // بعد فترة السماح = مرفوض نهائياً
  if (current > latestArrival) {
    return {
      allowed: false,
      status: "rejected",
      message: `تأخير في الحضور - وقت الشيفت ${shift.startTime} وفترة السماح ${graceIn} دقيقة. لا يمكن الدخول بعد الموعد`
    };
  }

  // في النافذة المسموحة
  return { allowed: true, status: "success" };
}

function validateFixedCheckOut(
  currentMinutes: number,
  shift: any,
  hasCheckIn: boolean
): ShiftCheckResult {
  const shiftStartMinutes = timeToMinutes(shift.startTime);
  const shiftEndMinutes = timeToMinutes(shift.endTime);
  const graceOut = shift.graceMinutesOut || 0;
  const nightShift = isNightShift(shiftStartMinutes, shiftEndMinutes);

  let current = currentMinutes;
  let end = shiftEndMinutes;

  if (nightShift) {
    current = normalizeForNightShift(currentMinutes, shiftStartMinutes);
    end = shiftEndMinutes + 24 * 60;
  }

  const earliestLeave = end - graceOut;

  // لو ما سجل دخول = مرفوض نهائياً
  if (!hasCheckIn) {
    return {
      allowed: false,
      status: "rejected",
      message: "لا يمكن تسجيل الخروج بدون تسجيل دخول أولاً"
    };
  }

  // لو سجل دخول لكن خارج قبل نهاية الشيفت بكثير (أقل من نص الساعات المطلوبة)
  if (hasCheckIn && current < earliestLeave) {
    const requiredHours = shift.requiredHours || 8;
    // لو باقي أكثر من نص الشيفت = رفض
    const halfShift = (end - (nightShift ? shiftStartMinutes : timeToMinutes(shift.startTime))) / 2;
    const workedMinutes = current - (nightShift ? normalizeForNightShift(timeToMinutes(shift.startTime), shiftStartMinutes) : timeToMinutes(shift.startTime));
    
    if (workedMinutes < halfShift) {
      return {
        allowed: false,
        status: "rejected",
        message: `لا يمكن الخروج - لم تكمل الحد الأدنى من ساعات العمل`
      };
    }
    
    return { allowed: true, status: "early" };
  }

  // Overtime logic
  if (current > end) {
    // لو الـ overtime مش مسموح
    if (!shift.allowOvertime) {
      return { allowed: true, status: "success" };
    }
    
    // لو الـ overtime مسموح وفيه حد أقصى
    if (shift.maxOvertimeEnd) {
      let maxOTMinutes = timeToMinutes(shift.maxOvertimeEnd);
      if (nightShift && maxOTMinutes < shiftStartMinutes) {
        maxOTMinutes += 24 * 60;
      }
      if (current > maxOTMinutes) {
        return { allowed: true, status: "overtime" };
      }
    }
    
    return { allowed: true, status: "overtime" };
  }

  return { allowed: true, status: "success" };
}

function validateFlexibleShift(
  currentMinutes: number,
  shift: any,
  type: string,
  todayCheckIn: any,
  nowUTC: Date
): ShiftCheckResult {
  const flexStart = shift.flexibleDayStart || "06:00";
  const flexEnd = shift.flexibleDayEnd || "01:00";
  const flexStartMinutes = timeToMinutes(flexStart);
  let flexEndMinutes = timeToMinutes(flexEnd);

  if (flexEndMinutes < flexStartMinutes) flexEndMinutes += 24 * 60;

  let adjustedCurrent = currentMinutes;
  if (currentMinutes < flexStartMinutes && currentMinutes < 12 * 60) {
    adjustedCurrent = currentMinutes + 24 * 60;
  }

  if (adjustedCurrent < flexStartMinutes || adjustedCurrent > flexEndMinutes) {
    return {
      allowed: false,
      status: "rejected",
      message: `الشيفت مغلق - ساعات العمل من ${flexStart} إلى ${flexEnd}`
    };
  }

  if (type === 'check-in') {
    return { allowed: true, status: "success" };
  }

  // Checkout
  let status = "success";
  if (todayCheckIn) {
    const checkInTime = new Date(todayCheckIn.timestamp);
    const workedMs = nowUTC.getTime() - checkInTime.getTime();
    const workedHours = workedMs / (1000 * 60 * 60);
    const requiredHours = shift.requiredHours || 8;

    if (workedHours >= requiredHours + 0.5) {
      status = "overtime";
    } else if (workedHours < requiredHours) {
      status = "incomplete";
    }
  }

  return { allowed: true, status };
}

// Helper: دقائق → وقت HH:mm
function minutesToTime(m: number): string {
  const normalized = ((m % (24 * 60)) + 24 * 60) % (24 * 60);
  const h = Math.floor(normalized / 60);
  const min = normalized % 60;
  return `${h.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
}

// ========== Rate Limiter ==========
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
function rateLimit(windowMs: number, maxRequests: number) {
  return (req: any, res: any, next: any) => {
    const key = `${req.ip}:${req.path}`;
    const now = Date.now();
    const entry = rateLimitMap.get(key);
    if (!entry || now > entry.resetAt) {
      rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }
    if (entry.count >= maxRequests) {
      return res.status(429).json({ message: "طلبات كثيرة جداً، حاول بعد شوية" });
    }
    entry.count++;
    next();
  };
}
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap) {
    if (now > entry.resetAt) rateLimitMap.delete(key);
  }
}, 5 * 60 * 1000);

function safeUser(user: any) {
  if (!user) return user;
  const { password, ...safe } = user;
  return safe;
}

// ========== Full shift validation for attendance (used by both normal + kiosk) ==========
async function processAttendance(
  user: any,
  input: { type: string; latitude: number; longitude: number; selfie?: string | null },
  userTodayLogs: any[]
) {
  const shiftsList = await storage.getShifts();
  let shift: any = null;

  if (user.shiftId) {
    shift = shiftsList.find((s: any) => s.id === user.shiftId);
  }
  if (!shift && user.departmentId) {
    // لو فيه أكتر من شيفت في القسم وما عنده shiftId = خطأ
    const deptShifts = shiftsList.filter((s: any) => s.departmentId === user.departmentId);
    if (deptShifts.length > 1) {
      return { error: true, status: 400, message: "الموظف غير معين على شيفت محدد — يرجى مراجعة المشرف" };
    }
    shift = deptShifts[0] || null;
  }

  if (!shift) {
    // لو مفيش شيفت = يتسجل success بدون أي فحص
    return { error: false, status: "success" };
  }

  const { currentMinutes, dayName } = getSaudiMinutes();
  const workDays: string[] = JSON.parse(shift.workDays);

  // يوم غير عمل = overtime (لو مسموح) أو success
  if (!workDays.includes(dayName)) {
    return { error: false, status: shift.allowOvertime ? "overtime" : "success" };
  }

  // ========== الشيفت المرن ==========
  if (shift.isFlexible) {
    const todayCheckIn = userTodayLogs.find((l: any) => l.type === 'check-in');
    const result = validateFlexibleShift(currentMinutes, shift, input.type, todayCheckIn, new Date());
    if (!result.allowed) {
      return { error: true, status: 400, message: result.message };
    }
    return { error: false, status: result.status };
  }

  // ========== الشيفت العادي ==========
  if (input.type === 'check-in') {
    const result = validateFixedCheckIn(currentMinutes, shift);
    if (!result.allowed) {
      return { error: true, status: 400, message: result.message };
    }
    return { error: false, status: result.status };
  } else {
    const hasCheckIn = userTodayLogs.some((l: any) => l.type === 'check-in');
    const result = validateFixedCheckOut(currentMinutes, shift, hasCheckIn);
    if (!result.allowed) {
      return { error: true, status: 400, message: result.message };
    }
    return { error: false, status: result.status };
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // ========== Session ==========
  const sessionSecret = process.env.SESSION_SECRET || (process.env.NODE_ENV === 'production' ? undefined : 'dev-secret-change-me');
  if (!sessionSecret) {
    throw new Error("SESSION_SECRET is required in production");
  }

  app.use(session({
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
      sameSite: 'lax'
    }
  }));

  // Security Headers
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  // ========== Middleware ==========
  const requireAuth = (req: any, res: any, next: any) => {
    if (!req.session.userId) return res.status(401).json({ message: "Unauthorized" });
    next();
  };

  const requireAdmin = async (req: any, res: any, next: any) => {
    if (!req.session.userId) return res.status(401).json({ message: "Unauthorized" });
    const user = await storage.getUser(req.session.userId);
    if (user?.role !== "admin") return res.status(403).json({ message: "Forbidden" });
    next();
  };

  const requireSupervisor = async (req: any, res: any, next: any) => {
    if (!req.session.userId) return res.status(401).json({ message: "Unauthorized" });
    const user = await storage.getUser(req.session.userId);
    if (user?.role !== "admin" && user?.role !== "supervisor") return res.status(403).json({ message: "Forbidden" });
    next();
  };

  const requireKioskAuth = async (req: any, res: any, next: any) => {
    const kioskToken = req.headers['x-kiosk-token'] as string;
    if (!kioskToken) return res.status(401).json({ message: "Kiosk token مطلوب" });
    const device = await storage.getKioskDevice(kioskToken);
    if (!device) return res.status(401).json({ message: "Kiosk token غير صالح" });
    req.kioskDevice = device;
    next();
  };

  // ========== SSE ==========
  const clients = new Set<any>();
  app.get('/api/attendance/stream', requireAuth, (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();
    clients.add(res);
    req.on('close', () => { clients.delete(res); });
  });
  function broadcastUpdate() {
    for (const client of clients) { client.write('data: update\n\n'); }
  }

  // ================================================================
  // AUTH
  // ================================================================

  app.post(api.auth.login.path, rateLimit(15 * 60 * 1000, 10), async (req, res) => {
    try {
      const { employeeId, password } = api.auth.login.input.parse(req.body);
      const user = await storage.verifyUserPassword(employeeId, password);
      if (!user) return res.status(401).json({ message: "بيانات الدخول غير صحيحة" });

      req.session.userId = user.id;
      req.session.save((err) => {
        if (err) return res.status(500).json({ message: "Session error" });
        res.json(safeUser(user));
      });
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post(api.auth.logout.path, (req, res) => {
    req.session.destroy(() => { res.json({ success: true }); });
  });

  app.get(api.auth.me.path, async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ message: "Unauthorized" });
    const user = await storage.getSafeUser(req.session.userId);
    if (!user) return res.status(401).json({ message: "Unauthorized" });
    res.json(user);
  });

  app.post(api.auth.changePassword.path, requireAuth, async (req, res) => {
    try {
      const { password } = api.auth.changePassword.input.parse(req.body);
      if (password.length < 6) return res.status(400).json({ message: "كلمة المرور لازم 6 حروف على الأقل" });
      await storage.updateUser(req.session.userId!, { password });
      // إلغاء إجبار تغيير كلمة المرور
      try {
        await storage.setForcePasswordChange(req.session.userId!, false);
      } catch (e) { /* العمود ممكن مش موجود بعد */ }
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ message: "فشل تغيير كلمة المرور" });
    }
  });

  app.post(api.auth.forgotPassword.path, rateLimit(15 * 60 * 1000, 5), async (req, res) => {
    try {
      const { email } = api.auth.forgotPassword.input.parse(req.body);
      const user = await storage.getUserByEmail(email);
      if (!user) return res.json({ success: true, message: "إذا الإيميل موجود، تم إرسال رابط التغيير" });
      const s = await storage.getSettings();
      if (!s.resendApiKey) return res.status(400).json({ message: "خدمة الإيميل غير مفعلة" });
      const token = await storage.createResetToken(user.id);
      const resetLink = `${req.protocol}://${req.get('host')}/reset-password?token=${token}`;
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${s.resendApiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'onboarding@resend.dev', to: email,
          subject: 'إعادة تعيين كلمة المرور',
          html: `<p>اضغط <a href="${resetLink}">هنا</a> لإعادة تعيين كلمة المرور. صالح لمدة ساعة.</p>`
        }),
      });
      res.json({ success: true, message: "تم إرسال الرابط" });
    } catch (err) {
      res.status(400).json({ message: "فشل إرسال الرابط" });
    }
  });

  app.post(api.auth.resetPassword.path, rateLimit(15 * 60 * 1000, 5), async (req, res) => {
    try {
      const { token, password } = api.auth.resetPassword.input.parse(req.body);
      if (password.length < 6) return res.status(400).json({ message: "كلمة المرور لازم 6 حروف على الأقل" });
      const userId = await storage.verifyResetToken(token);
      if (!userId) return res.status(400).json({ message: "الرابط غير صالح أو منتهي" });
      await storage.updateUser(userId, { password });
      await storage.markTokenUsed(token);
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ message: "فشل إعادة التعيين" });
    }
  });

  // ================================================================
  // SETTINGS
  // ================================================================

  app.get(api.settings.get.path, async (req, res) => {
    const s = await storage.getSettings();
    if (!req.session.userId) return res.json({ appName: s.appName, logoUrl: s.logoUrl });
    const user = await storage.getUser(req.session.userId);
    if (user?.role === "admin") {
      return res.json({ ...s, resendApiKey: s.resendApiKey ? s.resendApiKey.substring(0, 8) + '...' : null });
    }
    res.json({ appName: s.appName, logoUrl: s.logoUrl });
  });

  app.post(api.settings.update.path, requireAdmin, async (req, res) => {
    try {
      const input = api.settings.update.input.parse(req.body);
      const s = await storage.updateSettings(input);
      res.json(s);
    } catch (err) {
      res.status(400).json({ message: "فشل تحديث الإعدادات" });
    }
  });

  // ================================================================
  // DEPARTMENTS — نخلي list public عشان الـ Kiosk page
  // ================================================================

  app.get(api.departments.list.path, async (req, res) => {
    // لو مش مسجل دخول — يرجع فقط id + name (للكيوسك)
    if (!req.session.userId) {
      const depts = await storage.getDepartments();
      return res.json(depts.map(d => ({ id: d.id, name: d.name })));
    }
    const depts = await storage.getDepartments();
    res.json(depts);
  });

  app.post(api.departments.create.path, requireAdmin, async (req, res) => {
    try {
      const input = api.departments.create.input.parse(req.body);
      const dept = await storage.createDepartment(input);
      res.status(201).json(dept);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch(api.departments.update.path, requireAdmin, async (req, res) => {
    try {
      const input = api.departments.update.input.parse(req.body);
      const dept = await storage.updateDepartment(Number(req.params.id), input);
      res.json(dept);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete(api.departments.delete.path, requireAdmin, async (req, res) => {
    try {
      await storage.deleteDepartment(Number(req.params.id));
      res.status(204).send();
    } catch (err) {
      res.status(500).json({ message: "فشل حذف القسم" });
    }
  });

  // ================================================================
  // LOCATIONS
  // ================================================================

  app.get(api.locations.list.path, requireAuth, async (req, res) => {
    const currentUser = await storage.getUser(req.session.userId!);
    let locs = await storage.getLocations();
    if (currentUser?.role === "supervisor" && currentUser.departmentId)
      locs = locs.filter(l => l.departmentId === currentUser.departmentId);
    if (currentUser?.role === "employee" && currentUser.locationId)
      locs = locs.filter(l => l.id === currentUser.locationId);
    res.json(locs);
  });

  app.post(api.locations.create.path, requireSupervisor, async (req, res) => {
    try {
      const input = api.locations.create.input.parse(req.body);
      const currentUser = await storage.getUser(req.session.userId!);
      if (currentUser?.role === "supervisor" && currentUser.departmentId && input.departmentId !== currentUser.departmentId)
        return res.status(403).json({ message: "لا يمكنك إضافة مواقع لقسم آخر" });
      const loc = await storage.createLocation(input);
      res.status(201).json(loc);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch(api.locations.update.path, requireSupervisor, async (req, res) => {
    try {
      const input = api.locations.update.input.parse(req.body);
      const currentUser = await storage.getUser(req.session.userId!);
      const location = await storage.getLocation(Number(req.params.id));
      if (currentUser?.role === "supervisor" && currentUser.departmentId && location?.departmentId !== currentUser.departmentId)
        return res.status(403).json({ message: "لا يمكنك تعديل مواقع قسم آخر" });
      const loc = await storage.updateLocation(Number(req.params.id), input);
      res.json(loc);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete(api.locations.delete.path, requireSupervisor, async (req, res) => {
    try {
      const currentUser = await storage.getUser(req.session.userId!);
      const location = await storage.getLocation(Number(req.params.id));
      if (currentUser?.role === "supervisor" && currentUser.departmentId && location?.departmentId !== currentUser.departmentId)
        return res.status(403).json({ message: "لا يمكنك حذف مواقع قسم آخر" });
      await storage.deleteLocation(Number(req.params.id));
      res.status(204).send();
    } catch (err) {
      res.status(500).json({ message: "فشل حذف الموقع" });
    }
  });

  // ================================================================
  // SHIFTS
  // ================================================================

  app.get(api.shifts.list.path, requireAuth, async (req, res) => {
    const currentUser = await storage.getUser(req.session.userId!);
    let shiftsList = await storage.getShifts();
    if (currentUser?.role === "supervisor" && currentUser.departmentId)
      shiftsList = shiftsList.filter(s => s.departmentId === currentUser.departmentId);
    if (currentUser?.role === "employee") {
      if (currentUser.shiftId) shiftsList = shiftsList.filter(s => s.id === currentUser.shiftId);
      else if (currentUser.departmentId) shiftsList = shiftsList.filter(s => s.departmentId === currentUser.departmentId);
      else shiftsList = [];
    }
    res.json(shiftsList);
  });

  app.post(api.shifts.create.path, requireSupervisor, async (req, res) => {
    try {
      const input = api.shifts.create.input.parse(req.body);
      const currentUser = await storage.getUser(req.session.userId!);
      if (currentUser?.role === "supervisor" && currentUser.departmentId && input.departmentId !== currentUser.departmentId)
        return res.status(403).json({ message: "لا يمكنك إضافة شيفتات لقسم آخر" });
      const s = await storage.createShift(input);
      res.status(201).json(s);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: JSON.stringify(err.errors) });
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch(api.shifts.update.path, requireSupervisor, async (req, res) => {
    try {
      const input = api.shifts.update.input.parse(req.body);
      const currentUser = await storage.getUser(req.session.userId!);
      const allShifts = await storage.getShifts();
      const targetShift = allShifts.find(s => s.id === Number(req.params.id));
      if (currentUser?.role === "supervisor" && currentUser.departmentId && targetShift?.departmentId !== currentUser.departmentId)
        return res.status(403).json({ message: "لا يمكنك تعديل شيفتات قسم آخر" });
      const s = await storage.updateShift(Number(req.params.id), input);
      res.json(s);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: JSON.stringify(err.errors) });
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete(api.shifts.delete.path, requireSupervisor, async (req, res) => {
    try {
      const currentUser = await storage.getUser(req.session.userId!);
      const allShifts = await storage.getShifts();
      const targetShift = allShifts.find(s => s.id === Number(req.params.id));
      if (currentUser?.role === "supervisor" && currentUser.departmentId && targetShift?.departmentId !== currentUser.departmentId)
        return res.status(403).json({ message: "لا يمكنك حذف شيفتات قسم آخر" });
      await storage.deleteShift(Number(req.params.id));
      res.status(204).send();
    } catch (err) {
      res.status(500).json({ message: "فشل حذف الشيفت" });
    }
  });

  // ================================================================
  // EMPLOYEES
  // ================================================================

  app.get(api.employees.list.path, requireAuth, async (req, res) => {
    const currentUser = await storage.getUser(req.session.userId!);
    let usersList = await storage.getUsers();
    if (currentUser?.role === "supervisor" && currentUser.departmentId)
      usersList = usersList.filter(u => u.departmentId === currentUser.departmentId);
    if (currentUser?.role === "employee")
      usersList = usersList.filter(u => u.id === currentUser.id);
    res.json(usersList);
  });

  app.post(api.employees.create.path, requireSupervisor, async (req, res) => {
    try {
      const input = api.employees.create.input.parse(req.body);
      const currentUser = await storage.getUser(req.session.userId!);
      if (currentUser?.role === "supervisor") {
        if (input.role && input.role !== "employee") return res.status(403).json({ message: "لا يمكنك تعيين أدوار أعلى من موظف" });
        input.role = "employee";
        if (currentUser.departmentId) {
          if (input.departmentId && input.departmentId !== currentUser.departmentId) return res.status(403).json({ message: "لا يمكنك إضافة موظفين لقسم آخر" });
          input.departmentId = currentUser.departmentId;
        }
      }
      if (!input.password || input.password.length < 6) return res.status(400).json({ message: "كلمة المرور لازم 6 حروف على الأقل" });
      const existing = await storage.getUserByEmployeeId(input.employeeId);
      if (existing) return res.status(400).json({ message: "معرف الموظف موجود مسبقاً" });
      const user = await storage.createUser({
        employeeId: input.employeeId, password: input.password, name: input.name,
        email: input.email, role: input.role || "employee",
        locationId: input.locationId, departmentId: input.departmentId, shiftId: input.shiftId,
      });
      res.status(201).json(user);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch(api.employees.update.path, requireSupervisor, async (req, res) => {
    try {
      const input = api.employees.update.input.parse(req.body);
      const currentUser = await storage.getUser(req.session.userId!);
      const targetUser = await storage.getUser(Number(req.params.id));
      if (!targetUser) return res.status(404).json({ message: "الموظف غير موجود" });
      if (currentUser?.role === "supervisor") {
        if (targetUser.departmentId !== currentUser.departmentId) return res.status(403).json({ message: "لا يمكنك تعديل موظفين من قسم آخر" });
        if (input.role && input.role !== "employee") return res.status(403).json({ message: "لا يمكنك تغيير دور الموظف" });
        if (input.departmentId && input.departmentId !== currentUser.departmentId) return res.status(403).json({ message: "لا يمكنك نقل موظف لقسم آخر" });
        delete input.role;
      }
      if (input.password && input.password.length < 6) return res.status(400).json({ message: "كلمة المرور لازم 6 حروف على الأقل" });
      const user = await storage.updateUser(Number(req.params.id), input);
      res.json(user);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete(api.employees.delete.path, requireSupervisor, async (req, res) => {
    try {
      const currentUser = await storage.getUser(req.session.userId!);
      const targetUser = await storage.getUser(Number(req.params.id));
      if (!targetUser) return res.status(404).json({ message: "الموظف غير موجود" });
      if (targetUser.id === currentUser?.id) return res.status(400).json({ message: "لا يمكنك حذف حسابك" });
      if (currentUser?.role === "supervisor" && currentUser.departmentId && targetUser.departmentId !== currentUser.departmentId)
        return res.status(403).json({ message: "لا يمكنك حذف موظفين من قسم آخر" });
      await storage.deleteUser(Number(req.params.id));
      res.status(204).send();
    } catch (err) {
      res.status(500).json({ message: "فشل حذف الموظف" });
    }
  });

  // ================================================================
  // KIOSK ENDPOINTS — بدون auth (للأجهزة الثابتة)
  // ================================================================

  // البحث عن موظف بالـ employeeId
  app.get("/api/employees/by-id/:employeeId", async (req, res) => {
    const user = await storage.getUserByEmployeeId(req.params.employeeId);
    if (!user) return res.status(404).json({ message: "الموظف غير موجود" });
    // بيانات محدودة فقط
    res.json({
      id: user.id,
      employeeId: user.employeeId,
      name: user.name,
      departmentId: user.departmentId,
      locationId: user.locationId
    });
  });

  // سجلات اليوم لموظف
  app.get("/api/attendance/today/:userId", async (req, res) => {
    try {
      const userId = Number(req.params.userId);
      const { start, end } = getSaudiToday();
      const todayLogs = await storage.getAttendancesByUserAndDate(userId, start, end);
      res.json({
        hasCheckIn: todayLogs.some(l => l.type === 'check-in'),
        hasCheckOut: todayLogs.some(l => l.type === 'check-out')
      });
    } catch (err) {
      res.status(500).json({ message: "خطأ" });
    }
  });

  // تسجيل حضور عبر Kiosk
  app.post("/api/attendance/kiosk", rateLimit(60 * 1000, 10), async (req, res) => {
    try {
      const { employeeId, type, selfie, latitude, longitude } = req.body;
      if (!employeeId || !type || !selfie) return res.status(400).json({ message: "بيانات ناقصة" });

      const user = await storage.getUserByEmployeeId(employeeId);
      if (!user) return res.status(404).json({ message: "الموظف غير موجود" });

      const { start, end } = getSaudiToday();
      const todayLogs = await storage.getAttendancesByUserAndDate(user.id, start, end);
      if (todayLogs.find(log => log.type === type))
        return res.status(400).json({ message: type === "check-in" ? "تم تسجيل الدخول مسبقاً اليوم" : "تم تسجيل الخروج مسبقاً اليوم" });

      // منع الخروج بدون دخول
      if (type === 'check-out' && !todayLogs.some(l => l.type === 'check-in')) {
        return res.status(400).json({ message: "لا يمكن تسجيل الخروج بدون تسجيل دخول أولاً" });
      }

      // نفس منطق الشيفت
      const result = await processAttendance(user, { type, latitude: latitude || 0, longitude: longitude || 0, selfie }, todayLogs);
      if (result.error) return res.status(result.status as number).json({ message: result.message });

      const att = await storage.createAttendance({
        userId: user.id, latitude: latitude || 0, longitude: longitude || 0, type, status: result.status!, selfieUrl: selfie
      });
      broadcastUpdate();
      res.status(201).json(att);
    } catch (err: any) {
      res.status(500).json({ message: err.message || "حدث خطأ" });
    }
  });

  // Kiosk Device Management (اختياري — للمستقبل)
  app.get("/api/kiosk-devices", requireAdmin, async (req, res) => { res.json(await storage.getKioskDevices()); });
  app.post("/api/kiosk-devices", requireAdmin, async (req, res) => {
    try {
      const { name, departmentId } = req.body;
      if (!name || !departmentId) return res.status(400).json({ message: "الاسم والقسم مطلوبين" });
      res.status(201).json(await storage.createKioskDevice(name, departmentId));
    } catch (err) { res.status(500).json({ message: "فشل إنشاء الجهاز" }); }
  });
  app.delete("/api/kiosk-devices/:id", requireAdmin, async (req, res) => {
    try { await storage.deleteKioskDevice(Number(req.params.id)); res.status(204).send(); }
    catch (err) { res.status(500).json({ message: "فشل حذف الجهاز" }); }
  });

  // ================================================================
  // ATTENDANCE — مع كل الإصلاحات
  // ================================================================

  app.post(api.attendance.record.path, requireAuth, async (req, res) => {
    try {
      const input = api.attendance.record.input.parse(req.body);
      const user = await storage.getUser(req.session.userId!);
      if (!user) return res.status(401).json({ message: "Unauthorized" });

      // فحص التكرار بتوقيت السعودية
      const { start, end } = getSaudiToday();
      const userTodayLogs = await storage.getAttendancesByUserAndDate(user.id, start, end);
      if (userTodayLogs.find(log => log.type === input.type))
        return res.status(400).json({ message: "تم تسجيل الحضور مسبقاً اليوم" });

      if (!input.selfie || !input.selfie.startsWith('data:image/'))
        return res.status(400).json({ message: "صورة السيلفي مطلوبة" });

      // منع الخروج بدون دخول
      if (input.type === 'check-out' && !userTodayLogs.some(l => l.type === 'check-in')) {
        return res.status(400).json({ message: "لا يمكن تسجيل الخروج بدون تسجيل دخول أولاً" });
      }

      // Geofencing — إجباري
      if (!user.locationId) {
        return res.status(400).json({ message: "لم يتم تعيين موقع لك — راجع المشرف" });
      }
      const location = await storage.getLocation(user.locationId);
      if (location) {
        const distance = getDistanceFromLatLonInMeters(input.latitude, input.longitude, Number(location.latitude), Number(location.longitude));
        if (distance > location.radius) return res.status(400).json({ message: "أنت خارج النطاق الجغرافي المسموح به" });
      }

      // Shift validation — نفس الـ function المشتركة
      const result = await processAttendance(user, input, userTodayLogs);
      if (result.error) return res.status(result.status as number).json({ message: result.message });

      const att = await storage.createAttendance({
        userId: user.id, latitude: input.latitude, longitude: input.longitude,
        type: input.type, status: result.status!, selfieUrl: input.selfie || null
      });
      broadcastUpdate();
      res.status(201).json(att);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get(api.attendance.list.path, requireAuth, async (req, res) => {
    try {
      const records = await storage.getAttendances();
      const currentUser = await storage.getUser(req.session.userId!);
      if (currentUser?.role === "employee") return res.json(records.filter(r => r.userId === currentUser.id));
      if (currentUser?.role === "supervisor" && currentUser.departmentId)
        return res.json(records.filter(r => r.user.departmentId === currentUser.departmentId));
      res.json(records);
    } catch (err) {
      res.status(500).json({ message: "خطأ في جلب السجلات" });
    }
  });

  // ================================================================
  // MONTHLY REPORTS
  // ================================================================

  app.get("/api/reports/monthly", requireSupervisor, async (req, res) => {
    try {
      const year = Number(req.query.year) || new Date().getFullYear();
      const month = Number(req.query.month) || new Date().getMonth() + 1;
      const currentUser = await storage.getUser(req.session.userId!);
      let departmentId: number | undefined;
      if (currentUser?.role === "supervisor" && currentUser.departmentId) departmentId = currentUser.departmentId;
      if (currentUser?.role === "admin" && req.query.departmentId) departmentId = Number(req.query.departmentId);

      const report = await storage.generateMonthlyReport(year, month, departmentId);
      res.json({
        year, month, departmentId: departmentId || null, data: report,
        summary: {
          totalEmployees: report.length,
          averageAttendanceRate: report.length > 0
            ? Math.round(report.reduce((sum, r) => sum + (r.presentDays / Math.max(r.totalWorkDays, 1)) * 100, 0) / report.length) : 0,
          totalAbsentDays: report.reduce((sum, r) => sum + r.absentDays, 0),
          totalOvertimeDays: report.reduce((sum, r) => sum + r.overtimeDays, 0),
          totalLateDays: report.reduce((sum, r) => sum + r.lateDays, 0),
        }
      });
    } catch (err) {
      res.status(500).json({ message: "فشل إنشاء التقرير" });
    }
  });

  // ================================================================
  // SEED
  // ================================================================
  await seedDatabase();
  return httpServer;
}

async function seedDatabase() {
  const allUsers = await storage.getUsers();
  if (allUsers.length === 0) {
    const dept = await storage.createDepartment({ name: "Main Department", region: "HQ" });
    await storage.createUser({ employeeId: "admin", password: "admin123", name: "System Administrator", role: "admin", locationId: null, departmentId: null });
    const hq = await storage.createLocation({ name: "Headquarters", latitude: 30.0444, longitude: 31.2357, radius: 500, departmentId: dept.id });
    await storage.createUser({ employeeId: "EMP001", password: "password123", name: "Ahmed Employee", role: "employee", locationId: hq.id, departmentId: dept.id });
  }
}
