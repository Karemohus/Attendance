import { z } from 'zod';
import { users, locations, attendance, shifts, departments, UserWithLocation, AttendanceWithUser, ShiftWithDepartment, LocationWithDepartment, type MonthlyReportEntry } from './schema';

export const errorSchemas = {
  validation: z.object({ message: z.string(), field: z.string().optional() }),
  unauthorized: z.object({ message: z.string() }),
  notFound: z.object({ message: z.string() }),
  forbidden: z.object({ message: z.string() }),
};

export const api = {
  auth: {
    login: {
      method: 'POST' as const,
      path: '/api/auth/login' as const,
      input: z.object({ employeeId: z.string(), password: z.string() }),
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        401: errorSchemas.unauthorized,
      }
    },
    logout: {
      method: 'POST' as const,
      path: '/api/auth/logout' as const,
      responses: {
        200: z.object({ success: z.boolean() })
      }
    },
    me: {
      method: 'GET' as const,
      path: '/api/auth/me' as const,
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        401: errorSchemas.unauthorized,
      }
    },
    changePassword: {
      method: 'POST' as const,
      path: '/api/auth/change-password' as const,
      input: z.object({ password: z.string() }),
      responses: {
        200: z.object({ success: z.boolean() }),
        401: errorSchemas.unauthorized,
      }
    },
    forgotPassword: {
      method: 'POST' as const,
      path: '/api/auth/forgot-password' as const,
      input: z.object({ email: z.string().email() }),
      responses: {
        200: z.object({ success: z.boolean(), message: z.string() }),
        400: errorSchemas.validation,
      }
    },
    resetPassword: {
      method: 'POST' as const,
      path: '/api/auth/reset-password' as const,
      input: z.object({ token: z.string(), password: z.string() }),
      responses: {
        200: z.object({ success: z.boolean() }),
        400: errorSchemas.validation,
      }
    }
  },
  settings: {
    get: {
      method: 'GET' as const,
      path: '/api/settings' as const,
      responses: { 200: z.custom<any>() }
    },
    update: {
      method: 'POST' as const,
      path: '/api/settings' as const,
      input: z.object({
        appName: z.string().optional(),
        logoUrl: z.string().optional(),
        resendApiKey: z.string().optional(),
      }),
      responses: { 200: z.custom<any>(), 401: errorSchemas.unauthorized }
    }
  },
  departments: {
    list: {
      method: 'GET' as const,
      path: '/api/departments' as const,
      responses: { 200: z.array(z.custom<typeof departments.$inferSelect>()) }
    },
    create: {
      method: 'POST' as const,
      path: '/api/departments' as const,
      input: z.object({
        name: z.string(),
        region: z.string(),
      }),
      responses: { 201: z.custom<typeof departments.$inferSelect>() }
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/departments/:id' as const,
      input: z.object({
        name: z.string().optional(),
        region: z.string().optional(),
      }),
      responses: { 200: z.custom<typeof departments.$inferSelect>(), 404: errorSchemas.notFound }
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/departments/:id' as const,
      responses: { 204: z.void(), 404: errorSchemas.notFound }
    }
  },
  locations: {
    list: {
      method: 'GET' as const,
      path: '/api/locations' as const,
      responses: { 200: z.array(z.custom<LocationWithDepartment>()) }
    },
    create: {
      method: 'POST' as const,
      path: '/api/locations' as const,
      input: z.object({
        name: z.string(),
        latitude: z.coerce.number(),
        longitude: z.coerce.number(),
        radius: z.coerce.number(),
        departmentId: z.coerce.number(),
      }),
      responses: { 201: z.custom<typeof locations.$inferSelect>() }
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/locations/:id' as const,
      input: z.object({
        name: z.string().optional(),
        latitude: z.coerce.number().optional(),
        longitude: z.coerce.number().optional(),
        radius: z.coerce.number().optional(),
        departmentId: z.coerce.number().optional(),
      }),
      responses: { 200: z.custom<typeof locations.$inferSelect>(), 404: errorSchemas.notFound }
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/locations/:id' as const,
      responses: { 204: z.void(), 404: errorSchemas.notFound }
    }
  },
  shifts: {
    list: {
      method: 'GET' as const,
      path: '/api/shifts' as const,
      responses: { 200: z.array(z.custom<ShiftWithDepartment>()) }
    },
    create: {
      method: 'POST' as const,
      path: '/api/shifts' as const,
      input: z.object({
        name: z.string(),
        startTime: z.string(),
        endTime: z.string(),
        departmentId: z.coerce.number(),
        graceMinutesIn: z.coerce.number().default(0),
        graceMinutesOut: z.coerce.number().default(0),
        workDays: z.string(), // JSON string
        requiredHours: z.coerce.number().default(8),
        allowOvertime: z.boolean().default(false),
        maxOvertimeEnd: z.string().optional().nullable(),
        isFlexible: z.boolean().default(false),
        flexibleDayStart: z.string().optional().nullable(),
        flexibleDayEnd: z.string().optional().nullable(),
      }),
      responses: { 201: z.custom<typeof shifts.$inferSelect>() }
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/shifts/:id' as const,
      input: z.object({
        name: z.string().optional(),
        startTime: z.string().optional(),
        endTime: z.string().optional(),
        departmentId: z.coerce.number().optional(),
        graceMinutesIn: z.coerce.number().optional(),
        graceMinutesOut: z.coerce.number().optional(),
        workDays: z.string().optional(),
        requiredHours: z.coerce.number().optional(),
        allowOvertime: z.boolean().optional(),
        maxOvertimeEnd: z.string().optional().nullable(),
        isFlexible: z.boolean().optional(),
        flexibleDayStart: z.string().optional().nullable(),
        flexibleDayEnd: z.string().optional().nullable(),
      }),
      responses: { 200: z.custom<typeof shifts.$inferSelect>(), 404: errorSchemas.notFound }
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/shifts/:id' as const,
      responses: { 204: z.void(), 404: errorSchemas.notFound }
    }
  },
  employees: {
    list: {
      method: 'GET' as const,
      path: '/api/employees' as const,
      responses: { 200: z.array(z.custom<UserWithLocation>()) }
    },
    create: {
      method: 'POST' as const,
      path: '/api/employees' as const,
      input: z.object({
        employeeId: z.string(),
        password: z.string(),
        name: z.string(),
        email: z.string().email().optional(),
        role: z.string().optional().default("employee"),
        departmentId: z.coerce.number().optional().nullable(),
        locationId: z.coerce.number().optional().nullable(),
        shiftId: z.coerce.number().optional().nullable(),
      }),
      responses: { 201: z.custom<typeof users.$inferSelect>(), 400: errorSchemas.validation }
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/employees/:id' as const,
      input: z.object({
        employeeId: z.string().optional(),
        password: z.string().optional(),
        name: z.string().optional(),
        email: z.string().email().optional(),
        role: z.string().optional(),
        departmentId: z.coerce.number().optional().nullable(),
        locationId: z.coerce.number().optional().nullable(),
        shiftId: z.coerce.number().optional().nullable(),
      }),
      responses: { 200: z.custom<typeof users.$inferSelect>(), 404: errorSchemas.notFound }
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/employees/:id' as const,
      responses: { 204: z.void(), 404: errorSchemas.notFound }
    }
  },
  attendance: {
    record: {
      method: 'POST' as const,
      path: '/api/attendance' as const,
      input: z.object({
        latitude: z.coerce.number(),
        longitude: z.coerce.number(),
        type: z.enum(['check-in', 'check-out']),
        selfie: z.string().optional(), // base64
      }),
      responses: {
        201: z.custom<typeof attendance.$inferSelect>(),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
      }
    },
    list: {
      method: 'GET' as const,
      path: '/api/attendance' as const,
      responses: { 200: z.array(z.custom<AttendanceWithUser>()) }
    },
  },
  reports: {
    monthly: {
      method: 'GET' as const,
      path: '/api/reports/monthly' as const,
      responses: {
        200: z.object({
          year: z.number(),
          month: z.number(),
          departmentId: z.number().nullable(),
          data: z.array(z.custom<MonthlyReportEntry>()),
          summary: z.object({
            totalEmployees: z.number(),
            averageAttendanceRate: z.number(),
            totalAbsentDays: z.number(),
            totalOvertimeDays: z.number(),
            totalLateDays: z.number(),
          })
        })
      }
    }
  }
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
