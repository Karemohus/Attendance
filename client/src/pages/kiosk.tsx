import { useState, useRef, useEffect } from "react";
import { useParams } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Camera, CheckCircle, XCircle, Clock, QrCode, User, LogIn, LogOut } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";
import QrScanner from "qr-scanner";

type KioskStep = "scan" | "select" | "capture" | "success" | "error";

export default function KioskPage() {
  const { departmentId } = useParams<{ departmentId: string }>();
  const [step, setStep] = useState<KioskStep>("scan");
  const [employee, setEmployee] = useState<any>(null);
  const [attendanceType, setAttendanceType] = useState<"check-in" | "check-out">("check-in");
  const [message, setMessage] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [todayLogs, setTodayLogs] = useState<{ hasCheckIn: boolean; hasCheckOut: boolean }>({ hasCheckIn: false, hasCheckOut: false });
  
  const qrVideoRef = useRef<HTMLVideoElement>(null);
  const selfieVideoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const qrScannerRef = useRef<QrScanner | null>(null);
  
  const { toast } = useToast();

  const { data: departments } = useQuery({ 
    queryKey: [api.departments.list.path],
    queryFn: async () => {
      const res = await fetch(api.departments.list.path);
      return res.json();
    }
  });
  const { data: settings } = useQuery({ 
    queryKey: [api.settings.get.path],
    queryFn: async () => {
      const res = await fetch(api.settings.get.path);
      return res.json();
    }
  });

  const department = departments?.find((d: any) => d.id.toString() === departmentId);

  // Initialize QR Scanner
  useEffect(() => {
    if (step === "scan" && qrVideoRef.current) {
      qrScannerRef.current = new QrScanner(
        qrVideoRef.current,
        (result) => handleQrScan(result.data),
        {
          highlightScanRegion: true,
          highlightCodeOutline: true,
        }
      );
      qrScannerRef.current.start();
    }

    return () => {
      qrScannerRef.current?.stop();
      qrScannerRef.current?.destroy();
    };
  }, [step]);

  // Initialize Selfie Camera
  useEffect(() => {
    if (step === "capture" && selfieVideoRef.current) {
      navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } })
        .then((stream) => {
          if (selfieVideoRef.current) {
            selfieVideoRef.current.srcObject = stream;
          }
        })
        .catch((err) => {
          console.error("Camera error:", err);
          toast({ variant: "destructive", title: "خطأ في الكاميرا" });
        });
    }

    return () => {
      if (selfieVideoRef.current?.srcObject) {
        const tracks = (selfieVideoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach(track => track.stop());
      }
    };
  }, [step]);

  const handleQrScan = async (data: string) => {
    qrScannerRef.current?.stop();
    
    try {
      // البحث عن الموظف
      const response = await fetch(`/api/employees/by-id/${data}`);
      if (!response.ok) {
        toast({ variant: "destructive", title: "الموظف غير موجود" });
        resetKiosk();
        return;
      }
      
      const emp = await response.json();

      if (emp.departmentId?.toString() !== departmentId) {
        toast({ variant: "destructive", title: "الموظف ليس من هذا القسم" });
        resetKiosk();
        return;
      }

      // التحقق من سجلات اليوم
      const logsResponse = await fetch(`/api/attendance/today/${emp.id}`);
      let logs = { hasCheckIn: false, hasCheckOut: false };
      if (logsResponse.ok) {
        logs = await logsResponse.json();
      }
      
      setTodayLogs(logs);
      setEmployee(emp);
      
      // لو سجل الدخول والخروج
      if (logs.hasCheckIn && logs.hasCheckOut) {
        setMessage("تم تسجيل حضورك اليوم بالكامل ✓");
        setStep("success");
        setTimeout(() => resetKiosk(), 5000);
        return;
      }
      
      // الانتقال لشاشة الاختيار
      setStep("select");
      
    } catch (err) {
      toast({ variant: "destructive", title: "خطأ في البحث عن الموظف" });
      resetKiosk();
    }
  };

  const selectAttendanceType = (type: "check-in" | "check-out") => {
    setAttendanceType(type);
    setStep("capture");
  };

  const captureSelfie = async () => {
    if (!selfieVideoRef.current || !canvasRef.current || !employee) return;

    setIsProcessing(true);

    const video = selfieVideoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx?.drawImage(video, 0, 0);

    const selfieBase64 = canvas.toDataURL("image/jpeg", 0.8);

    try {
      // Get location (optional for kiosk)
      let latitude = 0;
      let longitude = 0;
      
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
        });
        latitude = position.coords.latitude;
        longitude = position.coords.longitude;
      } catch (e) {
        // Location not available, use default
      }

      const response = await fetch("/api/attendance/kiosk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: employee.employeeId,
          type: attendanceType,
          selfie: selfieBase64,
          latitude,
          longitude,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "فشل في التسجيل");
      }

      setMessage(attendanceType === "check-in" ? "تم تسجيل الدخول بنجاح ✓" : "تم تسجيل الخروج بنجاح ✓");
      setStep("success");

      // Reset after 5 seconds
      setTimeout(() => {
        resetKiosk();
      }, 5000);

    } catch (err: any) {
      setMessage(err.message || "حدث خطأ");
      setStep("error");
      
      setTimeout(() => {
        resetKiosk();
      }, 5000);
    } finally {
      setIsProcessing(false);
    }
  };

  const resetKiosk = () => {
    setStep("scan");
    setEmployee(null);
    setMessage("");
    setTodayLogs({ hasCheckIn: false, hasCheckOut: false });
  };

  const currentTime = new Date().toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4" dir="rtl">
      <Card className="w-full max-w-lg p-8 rounded-3xl shadow-2xl bg-white/95 backdrop-blur-sm border-0">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-500/10 mb-4">
            <QrCode className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">{settings?.appName || "نظام الحضور"}</h1>
          <p className="text-slate-500 mt-1">{department?.name || "القسم"}</p>
          <div className="flex items-center justify-center gap-2 mt-3 text-xl font-mono text-blue-600 bg-blue-50 rounded-full px-4 py-2 inline-flex">
            <Clock className="w-5 h-5" />
            {currentTime}
          </div>
        </div>

        {/* Step: Scan QR */}
        {step === "scan" && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-slate-800 mb-2">امسح الـ QR الخاص بك</h2>
              <p className="text-slate-500 text-sm">ضع كرت الـ QR أمام الكاميرا</p>
            </div>
            
            <div className="relative aspect-square rounded-2xl overflow-hidden bg-black shadow-xl">
              <video 
                ref={qrVideoRef} 
                className="w-full h-full object-cover"
                autoPlay 
                playsInline 
                muted
              />
              <div className="absolute inset-4 border-4 border-blue-500/50 rounded-2xl pointer-events-none" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
            </div>
          </div>
        )}

        {/* Step: Select Action */}
        {step === "select" && employee && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 mb-4">
                <User className="w-8 h-8 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800">{employee.name}</h2>
              <p className="text-slate-500 text-sm mt-1">ID: {employee.employeeId}</p>
            </div>
            
            <div className="text-center mb-4">
              <p className="text-slate-600 font-medium">اختر نوع الحركة:</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <Button 
                onClick={() => selectAttendanceType("check-in")}
                disabled={todayLogs.hasCheckIn}
                className={`h-24 rounded-2xl text-lg font-bold flex flex-col gap-2 ${
                  todayLogs.hasCheckIn 
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed hover:bg-gray-100' 
                    : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/30'
                }`}
              >
                <LogIn className="w-8 h-8" />
                {todayLogs.hasCheckIn ? "تم الدخول ✓" : "تسجيل دخول"}
              </Button>
              
              <Button 
                onClick={() => selectAttendanceType("check-out")}
                disabled={todayLogs.hasCheckOut}
                className={`h-24 rounded-2xl text-lg font-bold flex flex-col gap-2 ${
                  todayLogs.hasCheckOut 
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed hover:bg-gray-100' 
                    : 'bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/30'
                }`}
              >
                <LogOut className="w-8 h-8" />
                {todayLogs.hasCheckOut ? "تم الخروج ✓" : "تسجيل خروج"}
              </Button>
            </div>
            
            <Button 
              variant="ghost" 
              onClick={resetKiosk}
              className="w-full mt-4 text-slate-500"
            >
              إلغاء والرجوع
            </Button>
          </div>
        )}

        {/* Step: Capture Selfie */}
        {step === "capture" && employee && (
          <div className="space-y-6">
            <div className="text-center">
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold ${
                attendanceType === "check-in" 
                  ? "bg-emerald-100 text-emerald-700" 
                  : "bg-orange-100 text-orange-700"
              }`}>
                {attendanceType === "check-in" ? <LogIn className="w-4 h-4" /> : <LogOut className="w-4 h-4" />}
                {attendanceType === "check-in" ? "تسجيل دخول" : "تسجيل خروج"} - {employee.name}
              </div>
            </div>
            
            <div className="relative aspect-square rounded-2xl overflow-hidden bg-black shadow-xl">
              <video 
                ref={selfieVideoRef} 
                className="w-full h-full object-cover mirror"
                autoPlay 
                playsInline 
                muted
              />
              <canvas ref={canvasRef} className="hidden" />
              <div className="absolute inset-0 border-4 border-white/30 rounded-2xl pointer-events-none" />
            </div>

            <Button 
              onClick={captureSelfie} 
              disabled={isProcessing}
              className={`w-full h-14 text-lg rounded-xl font-bold shadow-lg ${
                attendanceType === "check-in"
                  ? "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/30"
                  : "bg-orange-500 hover:bg-orange-600 shadow-orange-500/30"
              }`}
            >
              {isProcessing ? (
                "جاري التسجيل..."
              ) : (
                <>
                  <Camera className="w-5 h-5 ml-2" />
                  التقاط الصورة وتأكيد
                </>
              )}
            </Button>
            
            <Button 
              variant="ghost" 
              onClick={() => setStep("select")}
              className="w-full text-slate-500"
              disabled={isProcessing}
            >
              رجوع
            </Button>
          </div>
        )}

        {/* Step: Success */}
        {step === "success" && (
          <div className="text-center py-8 space-y-4">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-emerald-100 animate-pulse">
              <CheckCircle className="w-12 h-12 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-bold text-emerald-600">{message}</h2>
            {employee && <p className="text-slate-500 text-lg">{employee.name}</p>}
            <div className="flex items-center justify-center gap-2 text-slate-400 text-sm">
              <Clock className="w-4 h-4" />
              يرجع للشاشة الرئيسية تلقائياً...
            </div>
          </div>
        )}

        {/* Step: Error */}
        {step === "error" && (
          <div className="text-center py-8 space-y-4">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-red-100">
              <XCircle className="w-12 h-12 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-red-600">فشل التسجيل</h2>
            <p className="text-slate-500">{message}</p>
            <div className="flex items-center justify-center gap-2 text-slate-400 text-sm">
              <Clock className="w-4 h-4" />
              يرجع للشاشة الرئيسية تلقائياً...
            </div>
          </div>
        )}
      </Card>

      <style>{`
        .mirror {
          transform: scaleX(-1);
        }
      `}</style>
    </div>
  );
}
