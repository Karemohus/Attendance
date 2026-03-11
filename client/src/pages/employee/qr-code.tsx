import { useRef } from "react";
import { EmployeeLayout } from "@/components/layout/employee-layout";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { QrCode, Download, Share2, Smartphone } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";

// Simple QR Code generator using canvas
function generateQRCode(text: string, size: number = 200): string {
  // Using a simple QR code library approach via canvas
  // For production, you'd use a proper library like qrcode
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  
  // White background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, size, size);
  
  // Generate QR pattern (simplified - in production use proper QR library)
  // This creates a visual representation, for actual QR we need a library
  const moduleSize = Math.floor(size / 25);
  const padding = Math.floor((size - moduleSize * 21) / 2);
  
  ctx.fillStyle = '#000000';
  
  // Encode the text into a simple pattern
  const encoded = text.split('').map(c => c.charCodeAt(0));
  
  // Position detection patterns (corners)
  const drawFinderPattern = (x: number, y: number) => {
    // Outer square
    ctx.fillRect(padding + x * moduleSize, padding + y * moduleSize, 7 * moduleSize, 7 * moduleSize);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(padding + (x + 1) * moduleSize, padding + (y + 1) * moduleSize, 5 * moduleSize, 5 * moduleSize);
    ctx.fillStyle = '#000000';
    ctx.fillRect(padding + (x + 2) * moduleSize, padding + (y + 2) * moduleSize, 3 * moduleSize, 3 * moduleSize);
  };
  
  drawFinderPattern(0, 0);   // Top-left
  drawFinderPattern(14, 0);  // Top-right
  drawFinderPattern(0, 14);  // Bottom-left
  
  // Data modules (simplified pattern based on text)
  for (let i = 0; i < encoded.length && i < 100; i++) {
    const val = encoded[i];
    const row = Math.floor(i / 10) + 8;
    const col = (i % 10) + 8;
    if (row < 21 && col < 21) {
      if (val % 2 === 0) {
        ctx.fillRect(padding + col * moduleSize, padding + row * moduleSize, moduleSize, moduleSize);
      }
    }
  }
  
  // Add timing patterns
  for (let i = 8; i < 13; i++) {
    if (i % 2 === 0) {
      ctx.fillRect(padding + 6 * moduleSize, padding + i * moduleSize, moduleSize, moduleSize);
      ctx.fillRect(padding + i * moduleSize, padding + 6 * moduleSize, moduleSize, moduleSize);
    }
  }
  
  return canvas.toDataURL('image/png');
}

export default function EmployeeQRCode() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const { toast } = useToast();
  const qrRef = useRef<HTMLDivElement>(null);

  const t = {
    title: { ar: "كود QR الخاص بك", en: "Your QR Code" },
    subtitle: { ar: "استخدم هذا الكود لتسجيل الحضور عبر جهاز الكيوسك", en: "Use this code to check in/out via the Kiosk device" },
    download: { ar: "تحميل الصورة", en: "Download Image" },
    share: { ar: "مشاركة", en: "Share" },
    employeeId: { ar: "رقم الموظف", en: "Employee ID" },
    name: { ar: "الاسم", en: "Name" },
    instructions: { ar: "تعليمات الاستخدام", en: "How to use" },
    step1: { ar: "توجه إلى جهاز الكيوسك في مكان عملك", en: "Go to the Kiosk device at your workplace" },
    step2: { ar: "اختر تسجيل الدخول أو الخروج", en: "Choose Check In or Check Out" },
    step3: { ar: "امسح كود QR الخاص بك", en: "Scan your QR code" },
    step4: { ar: "سيتم تسجيل حضورك تلقائياً", en: "Your attendance will be recorded automatically" },
    copied: { ar: "تم نسخ رقم الموظف", en: "Employee ID copied" },
    downloadSuccess: { ar: "تم تحميل الصورة", en: "Image downloaded" },
  };

  const lang = language;
  
  // Generate QR code with employee ID
  const qrData = user?.employeeId || '';
  
  const handleDownload = () => {
    if (!user) return;
    
    const canvas = document.createElement('canvas');
    const size = 400;
    canvas.width = size;
    canvas.height = size + 80;
    const ctx = canvas.getContext('2d')!;
    
    // Background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw QR code
    const qrImage = new Image();
    qrImage.onload = () => {
      ctx.drawImage(qrImage, 0, 0, size, size);
      
      // Add text below
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 20px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(user.name, size / 2, size + 30);
      ctx.font = '16px Arial';
      ctx.fillStyle = '#666666';
      ctx.fillText(`ID: ${user.employeeId}`, size / 2, size + 55);
      
      // Download
      const link = document.createElement('a');
      link.download = `QR_${user.employeeId}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      
      toast({ title: t.downloadSuccess[lang] });
    };
    
    // Use a proper QR code URL service
    qrImage.src = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(user.employeeId)}`;
  };

  const handleShare = async () => {
    if (!user) return;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `QR Code - ${user.name}`,
          text: `Employee ID: ${user.employeeId}`,
        });
      } catch (err) {
        // User cancelled or error
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(user.employeeId);
      toast({ title: t.copied[lang] });
    }
  };

  return (
    <EmployeeLayout>
      <div className="space-y-6 max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-bold flex items-center justify-center gap-2">
            <QrCode className="h-7 w-7 text-primary" />
            {t.title[lang]}
          </h1>
          <p className="text-muted-foreground mt-2">{t.subtitle[lang]}</p>
        </div>

        {/* QR Code Card */}
        <Card className="p-6 rounded-2xl text-center">
          <div ref={qrRef} className="bg-white p-4 rounded-xl inline-block shadow-inner">
            <img 
              src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(user?.employeeId || '')}`}
              alt="QR Code"
              className="w-48 h-48 mx-auto"
            />
          </div>
          
          {/* Employee Info */}
          <div className="mt-4 space-y-1">
            <p className="text-lg font-bold">{user?.name}</p>
            <p className="text-sm text-muted-foreground font-mono">{t.employeeId[lang]}: {user?.employeeId}</p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 mt-6 justify-center">
            <Button onClick={handleDownload} className="rounded-xl">
              <Download className="h-4 w-4 mr-2" />
              {t.download[lang]}
            </Button>
            <Button variant="outline" onClick={handleShare} className="rounded-xl">
              <Share2 className="h-4 w-4 mr-2" />
              {t.share[lang]}
            </Button>
          </div>
        </Card>

        {/* Instructions Card */}
        <Card className="p-5 rounded-2xl bg-muted/30">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-primary" />
            {t.instructions[lang]}
          </h3>
          <ol className="space-y-3 text-sm text-muted-foreground">
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">1</span>
              <span>{t.step1[lang]}</span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">2</span>
              <span>{t.step2[lang]}</span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">3</span>
              <span>{t.step3[lang]}</span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">4</span>
              <span>{t.step4[lang]}</span>
            </li>
          </ol>
        </Card>
      </div>
    </EmployeeLayout>
  );
}
