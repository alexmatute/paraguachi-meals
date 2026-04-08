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

const Register = () => {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nombre, setNombre] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { nombre }, emailRedirectTo: window.location.origin },
    });
    setLoading(false);
    if (error) {
      toast.error(t("register.error") + error.message);
    } else {
      toast.success(t("register.success"));
      navigate("/checkout");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="flex justify-center mb-4"><LangSwitcher /></div>
          <Link to="/" className="inline-flex items-center gap-3">
            <Logo size={48} />
            <span className="font-heading text-xl font-bold text-primary">Meal Prep</span>
          </Link>
          <h1 className="mt-6 font-heading text-2xl font-bold">{t("register.title")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t("register.subtitle")}</p>
        </div>
        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <Label htmlFor="nombre">{t("register.name")}</Label>
            <Input id="nombre" value={nombre} onChange={e => setNombre(e.target.value)} required className="mt-1 bg-card border-border" />
          </div>
          <div>
            <Label htmlFor="email">{t("login.email")}</Label>
            <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required className="mt-1 bg-card border-border" />
          </div>
          <div>
            <Label htmlFor="password">{t("login.password")}</Label>
            <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} className="mt-1 bg-card border-border" />
          </div>
          <Button type="submit" className="w-full bg-primary text-primary-foreground font-semibold" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("register.button")}
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          {t("register.hasAccount")}{" "}
          <Link to="/login" className="text-primary hover:underline">{t("register.login")}</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
