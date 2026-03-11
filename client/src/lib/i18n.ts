import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Language = 'ar' | 'en';

interface LanguageStore {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  ar: {
    // General
    'app.name': 'نظام الحضور',
    'loading': 'جاري التحميل...',
    'save': 'حفظ',
    'cancel': 'إلغاء',
    'delete': 'حذف',
    'edit': 'تعديل',
    'add': 'إضافة',
    'search': 'بحث',
    'filter': 'فلتر',
    'clear': 'مسح',
    'actions': 'الإجراءات',
    'all': 'الكل',
    'none': 'لا يوجد',
    'yes': 'نعم',
    'no': 'لا',
    'confirm': 'تأكيد',
    'export': 'تصدير',
    'from': 'من',
    'to': 'إلى',

    // Auth
    'login': 'تسجيل الدخول',
    'logout': 'تسجيل الخروج',
    'employee.id': 'رقم الموظف',
    'password': 'كلمة المرور',
    'forgot.password': 'نسيت كلمة المرور؟',
    'login.welcome': 'مرحباً بك في',
    'login.subtitle': 'نظام متطور لمتابعة الحضور والانصراف بناءً على الموقع الجغرافي.',

    // Navigation
    'nav.dashboard': 'لوحة التحكم',
    'nav.departments': 'الأقسام',
    'nav.locations': 'المواقع والشيفتات',
    'nav.employees': 'الموظفين',
    'nav.attendance': 'سجل الحضور',
    'nav.settings': 'الإعدادات',

    // Dashboard
    'dashboard.title': 'لوحة التحكم',
    'dashboard.welcome': 'مرحباً',
    'dashboard.today.stats': 'إحصائيات اليوم',
    'dashboard.total.employees': 'إجمالي الموظفين',
    'dashboard.present.today': 'الحاضرين اليوم',
    'dashboard.absent.today': 'الغائبين اليوم',
    'dashboard.late.today': 'المتأخرين اليوم',
    'dashboard.recent.activity': 'آخر الحركات',

    // Departments
    'departments.title': 'الأقسام',
    'departments.subtitle': 'إدارة الأقسام والمناطق',
    'departments.add': 'إضافة قسم',
    'departments.name': 'اسم القسم',
    'departments.region': 'المنطقة',
    'departments.kiosk.link': 'رابط الكيوسك',

    // Locations & Shifts
    'locations.title': 'المواقع',
    'locations.subtitle': 'إدارة مواقع العمل',
    'locations.add': 'إضافة موقع',
    'locations.name': 'اسم الموقع',
    'locations.latitude': 'خط العرض',
    'locations.longitude': 'خط الطول',
    'locations.radius': 'النطاق (متر)',
    'shifts.title': 'الشيفتات',
    'shifts.subtitle': 'إدارة أوقات العمل',
    'shifts.add': 'إضافة شيفت',
    'shifts.name': 'اسم الشيفت',
    'shifts.start': 'وقت البداية',
    'shifts.end': 'وقت النهاية',
    'shifts.grace.in': 'فترة السماح للدخول (دقيقة)',
    'shifts.grace.out': 'فترة السماح للخروج (دقيقة)',
    'shifts.required.hours': 'الساعات المطلوبة',
    'shifts.work.days': 'أيام العمل',
    'shifts.flexible': 'شيفت مرن',
    'shifts.flexible.desc': 'الموظف يدخل ويخرج أي وقت خلال اليوم (المهم يكمّل الساعات)',
    'shifts.overtime': 'السماح بـ Overtime',

    // Employees
    'employees.title': 'الموظفين',
    'employees.subtitle': 'إدارة بيانات الموظفين',
    'employees.add': 'إضافة موظف',
    'employees.name': 'الاسم',
    'employees.email': 'البريد الإلكتروني',
    'employees.role': 'الدور',
    'employees.department': 'القسم',
    'employees.location': 'الموقع',
    'employees.shift': 'الشيفت',
    'employees.role.admin': 'مدير',
    'employees.role.supervisor': 'مشرف',
    'employees.role.employee': 'موظف',

    // Attendance
    'attendance.title': 'سجل الحضور',
    'attendance.subtitle': 'متابعة حضور وانصراف الموظفين',
    'attendance.check.in': 'تسجيل دخول',
    'attendance.check.out': 'تسجيل خروج',
    'attendance.date': 'التاريخ',
    'attendance.time': 'الوقت',
    'attendance.status': 'الحالة',
    'attendance.worked.hours': 'ساعات العمل',
    'attendance.required.hours': 'المطلوب',
    'attendance.export': 'تصدير Excel',

    // Status
    'status.success': 'ناجح',
    'status.complete': 'مكتمل',
    'status.overtime': 'وقت إضافي',
    'status.early': 'خروج مبكر',
    'status.incomplete': 'ناقص',
    'status.absent': 'غياب',
    'status.late': 'متأخر',
    'status.out.of.bounds': 'خارج النطاق',

    // Employee Dashboard
    'employee.dashboard.title': 'لوحة الموظف',
    'employee.dashboard.today.status': 'حالة اليوم',
    'employee.dashboard.check.in.time': 'وقت الدخول',
    'employee.dashboard.check.out.time': 'وقت الخروج',
    'employee.dashboard.worked': 'ساعات العمل',
    'employee.dashboard.required': 'المطلوب',
    'employee.dashboard.remaining': 'المتبقي',
    'employee.dashboard.status': 'الحالة',
    'employee.dashboard.shift.info': 'معلومات الشيفت',
    'employee.dashboard.location.status': 'حالة الموقع',
    'employee.dashboard.inside.zone': 'داخل النطاق',
    'employee.dashboard.outside.zone': 'خارج النطاق',
    'employee.dashboard.btn.check.in': 'تسجيل الدخول',
    'employee.dashboard.btn.check.out': 'تسجيل الخروج',
    'employee.dashboard.btn.done': 'تم التسجيل ✓',

    // Days
    'day.saturday': 'السبت',
    'day.sunday': 'الأحد',
    'day.monday': 'الإثنين',
    'day.tuesday': 'الثلاثاء',
    'day.wednesday': 'الأربعاء',
    'day.thursday': 'الخميس',
    'day.friday': 'الجمعة',

    // Settings
    'settings.title': 'الإعدادات',
    'settings.app.name': 'اسم التطبيق',
    'settings.logo': 'الشعار',
  },

  en: {
    // General
    'app.name': 'Attendance System',
    'loading': 'Loading...',
    'save': 'Save',
    'cancel': 'Cancel',
    'delete': 'Delete',
    'edit': 'Edit',
    'add': 'Add',
    'search': 'Search',
    'filter': 'Filter',
    'clear': 'Clear',
    'actions': 'Actions',
    'all': 'All',
    'none': 'None',
    'yes': 'Yes',
    'no': 'No',
    'confirm': 'Confirm',
    'export': 'Export',
    'from': 'From',
    'to': 'To',

    // Auth
    'login': 'Login',
    'logout': 'Sign Out',
    'employee.id': 'Employee ID',
    'password': 'Password',
    'forgot.password': 'Forgot Password?',
    'login.welcome': 'Welcome to',
    'login.subtitle': 'Advanced geolocation-based attendance tracking system.',

    // Navigation
    'nav.dashboard': 'Dashboard',
    'nav.departments': 'Departments',
    'nav.locations': 'Locations & Shifts',
    'nav.employees': 'Employees',
    'nav.attendance': 'Attendance Logs',
    'nav.settings': 'Settings',

    // Dashboard
    'dashboard.title': 'Dashboard',
    'dashboard.welcome': 'Welcome',
    'dashboard.today.stats': 'Today\'s Statistics',
    'dashboard.total.employees': 'Total Employees',
    'dashboard.present.today': 'Present Today',
    'dashboard.absent.today': 'Absent Today',
    'dashboard.late.today': 'Late Today',
    'dashboard.recent.activity': 'Recent Activity',

    // Departments
    'departments.title': 'Departments',
    'departments.subtitle': 'Manage organizational departments and regions',
    'departments.add': 'Add Department',
    'departments.name': 'Department Name',
    'departments.region': 'Region',
    'departments.kiosk.link': 'Kiosk Link',

    // Locations & Shifts
    'locations.title': 'Locations',
    'locations.subtitle': 'Manage work locations',
    'locations.add': 'Add Location',
    'locations.name': 'Location Name',
    'locations.latitude': 'Latitude',
    'locations.longitude': 'Longitude',
    'locations.radius': 'Radius (m)',
    'shifts.title': 'Shifts',
    'shifts.subtitle': 'Manage work schedules',
    'shifts.add': 'Add Shift',
    'shifts.name': 'Shift Name',
    'shifts.start': 'Start Time',
    'shifts.end': 'End Time',
    'shifts.grace.in': 'Grace In (min)',
    'shifts.grace.out': 'Grace Out (min)',
    'shifts.required.hours': 'Required Hours',
    'shifts.work.days': 'Work Days',
    'shifts.flexible': 'Flexible Shift',
    'shifts.flexible.desc': 'Employee can check in/out anytime (must complete required hours)',
    'shifts.overtime': 'Allow Overtime',

    // Employees
    'employees.title': 'Employees',
    'employees.subtitle': 'Manage staff access, departments, and assignments',
    'employees.add': 'Add Employee',
    'employees.name': 'Name',
    'employees.email': 'Email',
    'employees.role': 'Role',
    'employees.department': 'Department',
    'employees.location': 'Location',
    'employees.shift': 'Shift',
    'employees.role.admin': 'Admin',
    'employees.role.supervisor': 'Supervisor',
    'employees.role.employee': 'Employee',

    // Attendance
    'attendance.title': 'Attendance Logs',
    'attendance.subtitle': 'Track employee attendance',
    'attendance.check.in': 'Check In',
    'attendance.check.out': 'Check Out',
    'attendance.date': 'Date',
    'attendance.time': 'Time',
    'attendance.status': 'Status',
    'attendance.worked.hours': 'Worked Hours',
    'attendance.required.hours': 'Required',
    'attendance.export': 'Export to Excel',

    // Status
    'status.success': 'Success',
    'status.complete': 'Complete',
    'status.overtime': 'Overtime',
    'status.early': 'Early Out',
    'status.incomplete': 'Incomplete',
    'status.absent': 'Absent',
    'status.late': 'Late',
    'status.out.of.bounds': 'Out of Bounds',

    // Employee Dashboard
    'employee.dashboard.title': 'Employee Dashboard',
    'employee.dashboard.today.status': 'Today\'s Status',
    'employee.dashboard.check.in.time': 'Check In Time',
    'employee.dashboard.check.out.time': 'Check Out Time',
    'employee.dashboard.worked': 'Worked Hours',
    'employee.dashboard.required': 'Required',
    'employee.dashboard.remaining': 'Remaining',
    'employee.dashboard.status': 'Status',
    'employee.dashboard.shift.info': 'Shift Information',
    'employee.dashboard.location.status': 'Location Status',
    'employee.dashboard.inside.zone': 'Inside Zone',
    'employee.dashboard.outside.zone': 'Outside Zone',
    'employee.dashboard.btn.check.in': 'Check In',
    'employee.dashboard.btn.check.out': 'Check Out',
    'employee.dashboard.btn.done': 'Done ✓',

    // Days
    'day.saturday': 'Saturday',
    'day.sunday': 'Sunday',
    'day.monday': 'Monday',
    'day.tuesday': 'Tuesday',
    'day.wednesday': 'Wednesday',
    'day.thursday': 'Thursday',
    'day.friday': 'Friday',

    // Settings
    'settings.title': 'Settings',
    'settings.app.name': 'App Name',
    'settings.logo': 'Logo',
  }
};

export const useLanguage = create<LanguageStore>()(
  persist(
    (set, get) => ({
      language: 'ar',
      setLanguage: (lang) => set({ language: lang }),
      t: (key) => {
        const { language } = get();
        return translations[language][key] || key;
      },
    }),
    {
      name: 'language-storage',
    }
  )
);

// Helper hook for direction
export const useDirection = () => {
  const { language } = useLanguage();
  return language === 'ar' ? 'rtl' : 'ltr';
};
