import { useI18n, Lang } from "@/lib/i18n";
import { Globe } from "lucide-react";

const LangSwitcher = () => {
  const { lang, setLang } = useI18n();

  const toggle = () => setLang(lang === "es" ? "en" : "es");

  return (
    <button
      onClick={toggle}
      className="flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
      title={lang === "es" ? "Switch to English" : "Cambiar a Español"}
    >
      <Globe className="h-3.5 w-3.5" />
      {lang === "es" ? "EN" : "ES"}
    </button>
  );
};

export default LangSwitcher;
