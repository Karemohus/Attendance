import { useState, useEffect, useRef, useMemo } from "react";
import { EmployeeLayout } from "@/components/layout/employee-layout";
import { useAuth } from "@/hooks/use-auth";
import { useAttendanceLogs, useRecordAttendance } from "@/hooks/use-attendance";
import { useLocations } from "@/hooks/use-locations";
import { useShifts } from "@/hooks/use-shifts";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Navigation, Clock, Key, Camera, LogIn, LogOut, CheckCircle2, AlertCircle, Timer, AlertTriangle } from "lucide-react";
import { format, isSameDay } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { apiRequest } from "@/lib/queryClient";
import { api } from "@shared/routes";
import { MapContainer, TileLayer, Marker, Circle, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useLanguage } from "@/lib/i18n";

// Fix for default Leaflet markers in React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

const blueIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const greenIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const { data: logs, refetch: refetchLogs } = useAttendanceLogs();
  const { data: locations } = useLocations();
  const { data: shifts } = useShifts();
  const recordAttendance = useRecordAttendance();
  const { toast } = useToast();
  const { language } = useLanguage();
  const lang = language;

  const [locationState, setLocationState] = useState<{
    lat: number | null;
    lng: number | null;
    error: string | null;
    isFetching: boolean;
  }>({
    lat: null, lng: null, error: null, isFetching: false
  });

  const [cameraOpen, setCameraOpen] = useState(false);
  const [pendingType, setPendingType] = useState<'check-in' | 'check-out' | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // جلب شيفت الموظف
  const myShift = useMemo(() => {
    if (!shifts || !user) return null;
    // الأولوية للشيفت المحدد، ثم شيفت القسم
    if ((user as any).shiftId) {
      return shifts.find(s => s.id === (user as any).shiftId) || null;
    }
    if (user.departmentId) {
      return shifts.find(s => s.departmentId === user.departmentId) || null;
    }
    return null;
  }, [shifts, user]);

  // حساب بصمات اليوم
  const todayLogs = useMemo(() => {
    if (!logs || !user) return { checkIn: null, checkOut: null };
    
    const today = new Date();
    const todayUserLogs = logs.filter(log => {
      const logDate = new Date(log.timestamp);
      return log.userId === user.id && isSameDay(logDate, today);
    });
    
    const checkInLog = todayUserLogs.find(l => l.type === 'check-in');
    const checkOutLog = todayUserLogs.find(l => l.type === 'check-out');
    
    return {
      checkIn: checkInLog || null,
      checkOut: checkOutLog || null
    };
  }, [logs, user]);

  // حساب ساعات العمل والحالة
  const workStatus = useMemo(() => {
    const requiredHours = myShift?.requiredHours || 8;
    
    if (!todayLogs.checkIn) {
      return {
        workedHours: 0,
        workedMinutes: 0,
        requiredHours,
        status: 'absent' as const,
        statusLabel: lang === 'ar' ? 'غياب' : 'Absent',
        statusColor: 'text-red-500',
        statusBg: 'bg-red-100'
      };
    }

    if (!todayLogs.checkOut) {
      return {
        workedHours: 0,
        workedMinutes: 0,
        requiredHours,
        status: 'incomplete' as const,
        statusLabel: lang === 'ar' ? 'في انتظار الخروج' : 'Waiting for checkout',
        statusColor: 'text-yellow-600',
        statusBg: 'bg-yellow-100'
      };
    }

    const checkInTime = new Date(todayLogs.checkIn.timestamp);
    const checkOutTime = new Date(todayLogs.checkOut.timestamp);
    const diffMs = checkOutTime.getTime() - checkInTime.getTime();
    const totalMinutes = Math.floor(diffMs / (1000 * 60));
    const workedHours = Math.floor(totalMinutes / 60);
    const workedMinutes = totalMinutes % 60;
    const requiredMinutes = requiredHours * 60;

    let status: 'complete' | 'overtime' | 'early' | 'incomplete';
    let statusLabel: string;
    let statusColor: string;
    let statusBg: string;

    // تحديد الحالة بناءً على الخروج status أو حساب الساعات
    if (todayLogs.checkOut.status === 'overtime' || totalMinutes > requiredMinutes + 15) {
      status = 'overtime';
      statusLabel = lang === 'ar' ? 'وقت إضافي' : 'Overtime';
      statusColor = 'text-purple-600';
      statusBg = 'bg-purple-100';
    } else if (todayLogs.checkOut.status === 'early' || totalMinutes < requiredMinutes - 15) {
      status = 'early';
      statusLabel = lang === 'ar' ? 'خروج مبكر' : 'Early Out';
      statusColor = 'text-orange-600';
      statusBg = 'bg-orange-100';
    } else {
      status = 'complete';
      statusLabel = lang === 'ar' ? 'مكتمل' : 'Complete';
      statusColor = 'text-emerald-600';
      statusBg = 'bg-emerald-100';
    }

    return {
      workedHours,
      workedMinutes,
      requiredHours,
      status,
      statusLabel,
      statusColor,
      statusBg
    };
  }, [todayLogs, myShift, lang]);

  // هل الأزرار متاحة؟
  const canCheckIn = !todayLogs.checkIn;
  const canCheckOut = !todayLogs.checkOut;

  const requestLocation = () => {
    setLocationState(s => ({ ...s, isFetching: true, error: null }));
    if (!navigator.geolocation) {
      setLocationState(s => ({ ...s, isFetching: false, error: "Geolocation not supported" }));
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      (pos) => setLocationState({ lat: pos.coords.latitude, lng: pos.coords.longitude, error: null, isFetching: false }),
      (err) => setLocationState({ lat: null, lng: null, error: err.message, isFetching: false }),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  useEffect(() => { requestLocation(); }, []);

  const startCamera = async (type: 'check-in' | 'check-out') => {
    if (!locationState.lat || !locationState.lng) {
      toast({ variant: "destructive", title: t.locReq[lang] });
      return;
    }
    setPendingType(type);
    setCameraOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      toast({ variant: "destructive", title: t.camErr[lang], description: t.noCam[lang] });
      setCameraOpen(false);
    }
  };

  const captureAndSubmit = async () => {
    if (!videoRef.current || !canvasRef.current || !pendingType) return;
    
    const context = canvasRef.current.getContext('2d');
    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;
    context?.drawImage(videoRef.current, 0, 0);
    const selfie = canvasRef.current.toDataURL('image/jpeg', 0.7);

    const stream = videoRef.current.srcObject as MediaStream;
    stream?.getTracks().forEach(track => track.stop());
    setCameraOpen(false);

    try {
      await recordAttendance.mutateAsync({
        latitude: locationState.lat!,
        longitude: locationState.lng!,
        type: pendingType,
        selfie
      });
      await refetchLogs();
      toast({ title: t.success[lang], description: pendingType === 'check-in' ? t.checkInSuccess[lang] : t.checkOutSuccess[lang] });
    } catch (error: any) {
      toast({ variant: "destructive", title: t.fail[lang], description: error.message });
    }
  };

  const t = {
    welcome: { ar: "مرحباً", en: "Welcome" },
    changePassword: { ar: "تغيير كلمة المرور", en: "Change Password" },
    newPassword: { ar: "كلمة المرور الجديدة", en: "New Password" },
    update: { ar: "تحديث", en: "Update" },
    shiftDetails: { ar: "معلومات الشيفت", en: "Shift Details" },
    checkInTime: { ar: "بداية الدوام", en: "Shift Start" },
    checkOutTime: { ar: "نهاية الدوام", en: "Shift End" },
    requiredHours: { ar: "الساعات المطلوبة", en: "Required Hours" },
    hours: { ar: "ساعة", en: "hours" },
    acquiring: { ar: "جاري تحديد الموقع...", en: "Acquiring location..." },
    locked: { ar: "تم تحديد الموقع بنجاح", en: "Location acquired" },
    refresh: { ar: "تحديث الموقع", en: "Refresh Location" },
    currentLocation: { ar: "موقعك الحالي", en: "Your current location" },
    checkInBtn: { ar: "تسجيل دخول", en: "Check In" },
    checkOutBtn: { ar: "تسجيل خروج", en: "Check Out" },
    captureSubmit: { ar: "التقاط وإرسال", en: "Capture & Submit" },
    locReq: { ar: "الموقع مطلوب", en: "Location required" },
    camErr: { ar: "خطأ في الكاميرا", en: "Camera Error" },
    noCam: { ar: "لا يمكن الوصول للكاميرا", en: "Could not access camera" },
    success: { ar: "تم بنجاح", en: "Success" },
    fail: { ar: "فشل العملية", en: "Failed" },
    checkInSuccess: { ar: "تم تسجيل الدخول بنجاح", en: "Check-in recorded" },
    checkOutSuccess: { ar: "تم تسجيل الخروج بنجاح", en: "Check-out recorded" },
    todayStatus: { ar: "حالة اليوم", en: "Today's Status" },
    checkedInAt: { ar: "وقت الدخول", en: "Check-in" },
    checkedOutAt: { ar: "وقت الخروج", en: "Check-out" },
    notCheckedIn: { ar: "لم تسجل دخول بعد", en: "Not checked in" },
    notCheckedOut: { ar: "لم تسجل خروج بعد", en: "Not checked out" },
    alreadyCheckedIn: { ar: "تم الدخول ✓", en: "Checked in ✓" },
    alreadyCheckedOut: { ar: "تم الخروج ✓", en: "Checked out ✓" },
    workedHours: { ar: "ساعات العمل", en: "Worked Hours" },
    status: { ar: "الحالة", en: "Status" },
    noShift: { ar: "لا يوجد شيفت محدد", en: "No shift assigned" },
  };

  const [passOpen, setPassOpen] = useState(false);
  const [newPass, setNewPass] = useState("");

  const handleChangePass = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest("POST", api.auth.changePassword.path, { password: newPass });
      toast({ title: "Success", description: "Password updated" });
      setPassOpen(false);
      setNewPass("");
    } catch (err) {
      toast({ variant: "destructive", title: "Error", description: "Failed" });
    }
  };

  const myLocation = user?.locationId ? locations?.find(l => l.id === user.locationId) : null;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'complete': return <CheckCircle2 className="h-5 w-5" />;
      case 'overtime': return <Timer className="h-5 w-5" />;
      case 'early': return <AlertTriangle className="h-5 w-5" />;
      case 'incomplete': return <Clock className="h-5 w-5" />;
      default: return <AlertCircle className="h-5 w-5" />;
    }
  };

  return (
    <EmployeeLayout>
      <div className="space-y-6 max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-bold">{t.welcome[lang]}, {user?.name}</h1>
          <Dialog open={passOpen} onOpenChange={setPassOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="rounded-lg">
                <Key className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-2xl">
              <DialogHeader><DialogTitle>{t.changePassword[lang]}</DialogTitle></DialogHeader>
              <form onSubmit={handleChangePass} className="space-y-4">
                <Input type="password" value={newPass} onChange={e => setNewPass(e.target.value)} placeholder={t.newPassword[lang]} required className="rounded-xl" />
                <Button type="submit" className="w-full rounded-xl">{t.update[lang]}</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Today's Status Card - Enhanced */}
        <Card className="p-5 rounded-2xl border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            {t.todayStatus[lang]}
          </h3>
          
          {/* Check In/Out Grid */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            {/* Check In Status */}
            <div className={`p-4 rounded-xl transition-all ${
              todayLogs.checkIn 
                ? 'bg-emerald-100 dark:bg-emerald-900/30 border-2 border-emerald-500' 
                : 'bg-muted/50 border-2 border-dashed border-muted-foreground/20'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                {todayLogs.checkIn ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                ) : (
                  <LogIn className="h-5 w-5 text-muted-foreground" />
                )}
                <span className="text-sm font-medium">{t.checkedInAt[lang]}</span>
              </div>
              {todayLogs.checkIn ? (
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                  {format(new Date(todayLogs.checkIn.timestamp), 'hh:mm a')}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">{t.notCheckedIn[lang]}</p>
              )}
            </div>
            
            {/* Check Out Status */}
            <div className={`p-4 rounded-xl transition-all ${
              todayLogs.checkOut 
                ? 'bg-orange-100 dark:bg-orange-900/30 border-2 border-orange-500' 
                : 'bg-muted/50 border-2 border-dashed border-muted-foreground/20'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                {todayLogs.checkOut ? (
                  <CheckCircle2 className="h-5 w-5 text-orange-600" />
                ) : (
                  <LogOut className="h-5 w-5 text-muted-foreground" />
                )}
                <span className="text-sm font-medium">{t.checkedOutAt[lang]}</span>
              </div>
              {todayLogs.checkOut ? (
                <p className="text-2xl font-bold text-orange-600 dark:text-orange-400 font-mono">
                  {format(new Date(todayLogs.checkOut.timestamp), 'hh:mm a')}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">{t.notCheckedOut[lang]}</p>
              )}
            </div>
          </div>

          {/* Work Hours & Status Summary */}
          <div className="grid grid-cols-3 gap-3 p-3 bg-muted/30 rounded-xl">
            {/* Worked Hours */}
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">{t.workedHours[lang]}</p>
              <p className="text-lg font-bold font-mono">
                {workStatus.workedHours > 0 || workStatus.workedMinutes > 0 
                  ? `${workStatus.workedHours}:${workStatus.workedMinutes.toString().padStart(2, '0')}`
                  : '--:--'
                }
              </p>
            </div>
            
            {/* Required Hours */}
            <div className="text-center border-x border-border/50">
              <p className="text-xs text-muted-foreground mb-1">{t.requiredHours[lang]}</p>
              <p className="text-lg font-bold font-mono">{workStatus.requiredHours}:00</p>
            </div>
            
            {/* Status */}
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">{t.status[lang]}</p>
              <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${workStatus.statusBg} ${workStatus.statusColor}`}>
                {getStatusIcon(workStatus.status)}
                <span>{workStatus.statusLabel}</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Main Attendance Card */}
        <Card className="p-6 rounded-2xl shadow-lg">
          {/* Shift Info */}
          {myShift ? (
            <div className="mb-6 p-4 rounded-xl bg-muted/30 border border-border/50">
              <p className="font-semibold text-sm text-primary mb-3">{t.shiftDetails[lang]}</p>
              <div className="grid grid-cols-3 gap-3">
                <div className="flex items-center gap-2 p-3 bg-background rounded-lg">
                  <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t.checkInTime[lang]}</p>
                    <p className="font-mono font-semibold">{myShift.startTime}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-3 bg-background rounded-lg">
                  <div className="w-2 h-2 rounded-full bg-red-500"></div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t.checkOutTime[lang]}</p>
                    <p className="font-mono font-semibold">{myShift.endTime}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-3 bg-background rounded-lg">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t.requiredHours[lang]}</p>
                    <p className="font-mono font-semibold">{myShift.requiredHours || 8} {t.hours[lang]}</p>
                  </div>
                </div>
              </div>
              {(myShift as any).isFlexible && (
                <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {lang === 'ar' ? 'شيفت مرن - يمكنك الدخول والخروج في أي وقت' : 'Flexible shift - check in/out anytime'}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="mb-6 p-4 rounded-xl bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200">
              <p className="text-sm text-yellow-700 dark:text-yellow-400">{t.noShift[lang]}</p>
            </div>
          )}

          {/* Location Status */}
          <div className="text-center mb-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted/50 text-sm">
              {locationState.isFetching ? (
                <>
                  <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></div>
                  <span>{t.acquiring[lang]}</span>
                </>
              ) : locationState.error ? (
                <>
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  <span className="text-destructive">{locationState.error}</span>
                </>
              ) : (
                <>
                  <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                  <span className="text-emerald-600">{t.locked[lang]}</span>
                </>
              )}
            </div>
            <Button variant="ghost" size="sm" onClick={requestLocation} className="mt-2 text-xs">
              <Navigation className="h-3 w-3 mr-1" /> {t.refresh[lang]}
            </Button>
          </div>

          {/* Map */}
          {locationState.lat && locationState.lng && (
            <div className="mb-6 rounded-xl overflow-hidden h-[180px] border border-border/50">
              <MapContainer 
                center={[locationState.lat, locationState.lng]} 
                zoom={16} 
                style={{ height: '100%', width: '100%', zIndex: 0 }}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; OpenStreetMap'
                />
                <Marker position={[locationState.lat, locationState.lng]} icon={blueIcon}>
                  <Popup>{t.currentLocation[lang]}</Popup>
                </Marker>
                {myLocation && (
                  <>
                    <Marker position={[Number(myLocation.latitude), Number(myLocation.longitude)]} icon={greenIcon}>
                      <Popup>{myLocation.name}</Popup>
                    </Marker>
                    <Circle 
                      center={[Number(myLocation.latitude), Number(myLocation.longitude)]} 
                      radius={myLocation.radius} 
                      pathOptions={{ color: 'green', fillColor: 'green', fillOpacity: 0.15 }} 
                    />
                  </>
                )}
              </MapContainer>
            </div>
          )}

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <Button 
              size="lg" 
              className={`h-14 rounded-xl font-semibold ${!canCheckIn ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' : ''}`}
              onClick={() => startCamera('check-in')} 
              disabled={recordAttendance.isPending || !locationState.lat || !canCheckIn}
            >
              <LogIn className="h-5 w-5 mr-2" />
              {canCheckIn ? t.checkInBtn[lang] : t.alreadyCheckedIn[lang]}
            </Button>
            <Button 
              size="lg" 
              variant={canCheckOut ? "outline" : "ghost"}
              className={`h-14 rounded-xl font-semibold border-2 ${!canCheckOut ? 'bg-orange-100 text-orange-700 hover:bg-orange-100 border-orange-200' : 'border-primary'}`}
              onClick={() => startCamera('check-out')} 
              disabled={recordAttendance.isPending || !locationState.lat || !canCheckOut}
            >
              <LogOut className="h-5 w-5 mr-2" />
              {canCheckOut ? t.checkOutBtn[lang] : t.alreadyCheckedOut[lang]}
            </Button>
          </div>
        </Card>

        {/* Camera Dialog */}
        <Dialog open={cameraOpen} onOpenChange={(open) => {
          if (!open && videoRef.current?.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
          }
          setCameraOpen(open);
        }}>
          <DialogContent className="rounded-2xl sm:max-w-md p-0 overflow-hidden">
            <video ref={videoRef} autoPlay playsInline className="w-full h-auto" />
            <canvas ref={canvasRef} className="hidden" />
            <div className="p-4 bg-background">
              <Button onClick={captureAndSubmit} className="w-full rounded-xl h-12" disabled={recordAttendance.isPending}>
                <Camera className="mr-2 h-5 w-5" /> {t.captureSubmit[lang]}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </EmployeeLayout>
  );
}
