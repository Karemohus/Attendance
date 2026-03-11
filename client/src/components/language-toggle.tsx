import { useLanguage } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Globe } from "lucide-react";

export function LanguageToggle() {
  const { language, setLanguage } = useLanguage();

  const toggleLanguage = () => {
    setLanguage(language === 'ar' ? 'en' : 'ar');
    // تحديث اتجاه الصفحة
    document.documentElement.dir = language === 'ar' ? 'ltr' : 'rtl';
    document.documentElement.lang = language === 'ar' ? 'en' : 'ar';
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleLanguage}
      className="flex items-center gap-2 rounded-xl"
    >
      <Globe className="h-4 w-4" />
      <span className="text-sm font-medium">
        {language === 'ar' ? 'EN' : 'عربي'}
      </span>
    </Button>
  );
}
