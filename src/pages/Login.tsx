import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import Logo from "@/components/Logo";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import LangSwitcher from "@/components/LangSwitcher";

const Login = () => {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error(t("login.error") + error.message);
    } else {
      navigate("/dashboard");
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      toast.error(t("login.email"));
      return;
    }
    setForgotLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setForgotLoading(false);
    if (error) {
      toast.error(t("login.forgotError") + error.message);
    } else {
      toast.success(t("login.forgotSent"));
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="flex justify-center mb-4"><LangSwitcher /></div>
          <Link to="/" className="inline-block">
            <Logo />
          </Link>
          <h1 className="mt-6 font-heading text-2xl font-bold">{t("login.title")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t("login.subtitle")}</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <Label htmlFor="email">{t("login.email")}</Label>
            <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required className="mt-1 bg-card border-border" />
          </div>
          <div>
            <Label htmlFor="password">{t("login.password")}</Label>
            <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required className="mt-1 bg-card border-border" />
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleForgotPassword}
              disabled={forgotLoading}
              className="text-sm text-primary hover:underline disabled:opacity-50"
            >
              {forgotLoading ? <Loader2 className="inline h-3 w-3 animate-spin mr-1" /> : null}
              {t("login.forgot")}
            </button>
          </div>
          <Button type="submit" className="w-full bg-primary text-primary-foreground font-semibold" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("login.button")}
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          {t("login.noAccount")}{" "}
          <Link to="/register" className="text-primary hover:underline">{t("login.register")}</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
