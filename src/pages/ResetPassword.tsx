import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle } from "lucide-react";
import Logo from "@/components/Logo";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";

const ResetPassword = () => {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [valid, setValid] = useState(false);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) {
      setValid(true);
    } else {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) setValid(true);
      });
    }
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      toast.error(t("reset.mismatch"));
      return;
    }
    if (password.length < 6) {
      toast.error(t("reset.tooShort"));
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast.error(t("reset.error") + error.message);
    } else {
      setDone(true);
      toast.success(t("reset.success"));
      setTimeout(() => navigate("/dashboard"), 2000);
    }
  };

  if (!valid) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-sm text-center">
          <Logo size={56} className="mx-auto" />
          <p className="mt-4 text-muted-foreground">{t("reset.invalid")}</p>
          <Button variant="link" onClick={() => navigate("/login")} className="mt-4 text-primary">
            {t("nav.login")}
          </Button>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-sm text-center">
          <CheckCircle className="mx-auto h-12 w-12 text-primary" />
          <h1 className="mt-6 font-heading text-2xl font-bold">{t("reset.doneTitle")}</h1>
          <p className="mt-2 text-muted-foreground">{t("reset.doneDesc")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Logo size={56} className="mx-auto" />
          <h1 className="mt-6 font-heading text-2xl font-bold">{t("reset.title")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t("reset.subtitle")}</p>
        </div>
        <form onSubmit={handleReset} className="space-y-4">
          <div>
            <Label htmlFor="password">{t("reset.newPassword")}</Label>
            <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} className="mt-1 bg-card border-border" />
          </div>
          <div>
            <Label htmlFor="confirm">{t("reset.confirmPassword")}</Label>
            <Input id="confirm" type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required minLength={6} className="mt-1 bg-card border-border" />
          </div>
          <Button type="submit" className="w-full bg-primary text-primary-foreground font-semibold" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("reset.button")}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
