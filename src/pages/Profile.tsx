import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChefHat, Camera, Loader2, ArrowLeft, Shield, MessageCircle, CreditCard, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { alergias, dietas, salud, preferenciasComida } from "@/lib/onboarding-data";
import { useI18n } from "@/lib/i18n";
import LangSwitcher from "@/components/LangSwitcher";

const problemasSalud = [
  "Diabetes tipo 1", "Diabetes tipo 2", "Hipertensión", "Colesterol alto",
  "Hipotiroidismo", "Hipertiroidismo", "Enfermedad celíaca",
  "Síndrome de colon irritable", "Enfermedad renal", "Enfermedad cardíaca",
];

const Profile = () => {
  const navigate = useNavigate();
  const { t, lang } = useI18n();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [profile, setProfile] = useState<any>({});
  const [restrictions, setRestrictions] = useState<string[]>([]);
  const locale = lang === "es" ? "es-ES" : "en-US";

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/login"); return; }
    loadProfile();
  }, [user, authLoading]);

  const loadProfile = async () => {
    const { data } = await supabase.from("profiles").select("*").eq("id", user!.id).single();
    if (data) setProfile(data);
    const { data: prefs } = await supabase.from("preferencias").select("restricciones").eq("usuario_id", user!.id).maybeSingle();
    if (prefs?.restricciones) setRestrictions(prefs.restricciones);
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      nombre: profile.nombre, telefono: profile.telefono, fecha_nacimiento: profile.fecha_nacimiento,
      ciudad: profile.ciudad, pais: profile.pais, peso_kg: profile.peso_kg, altura_cm: profile.altura_cm,
      problemas_salud: profile.problemas_salud || [],
    }).eq("id", user!.id);
    await supabase.from("preferencias").upsert({ usuario_id: user!.id, restricciones: restrictions }, { onConflict: "usuario_id" });
    setSaving(false);
    if (error) toast.error(t("profile.saveError"));
    else toast.success(t("profile.saved"));
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const path = `${user!.id}/avatar.${file.name.split('.').pop()}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (error) { toast.error(t("profile.photoError")); setUploading(false); return; }
    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
    await supabase.from("profiles").update({ foto_perfil: publicUrl }).eq("id", user!.id);
    setProfile((p: any) => ({ ...p, foto_perfil: publicUrl }));
    setUploading(false);
    toast.success(t("profile.photoUpdated"));
  };

  const handleChangePassword = async () => {
    const { error } = await supabase.auth.resetPasswordForEmail(user!.email!, { redirectTo: `${window.location.origin}/reset-password` });
    if (error) toast.error(error.message);
    else toast.success(t("profile.passwordEmail"));
  };

  const toggleItem = (list: string[], item: string) => list.includes(item) ? list.filter(i => i !== item) : [...list, item];

  if (loading || authLoading) return <div className="flex min-h-screen items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 py-4">
        <div className="container flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/dashboard")} className="text-muted-foreground hover:text-foreground"><ArrowLeft className="h-5 w-5" /></button>
            <ChefHat className="h-6 w-6 text-primary" />
            <span className="font-heading text-lg font-bold text-primary">{t("profile.title")}</span>
          </div>
          <LangSwitcher />
        </div>
      </header>

      <main className="container py-8 max-w-2xl space-y-6">
        <div className="card-surface p-6">
          <h2 className="font-heading text-base font-bold mb-4">{t("profile.photo")}</h2>
          <div className="flex items-center gap-6">
            <div className="relative">
              <div className="h-24 w-24 rounded-full bg-muted flex items-center justify-center overflow-hidden border-2 border-border">
                {profile.foto_perfil ? <img src={profile.foto_perfil} alt="Avatar" className="h-full w-full object-cover" /> : <span className="text-2xl font-heading font-bold text-muted-foreground">{(profile.nombre || "U")[0]?.toUpperCase()}</span>}
              </div>
              <label className="absolute bottom-0 right-0 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground">
                {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Camera className="h-3 w-3" />}
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={uploading} />
              </label>
            </div>
            <div className="flex-1 space-y-3">
              <div><Label>{t("profile.fullName")}</Label><Input value={profile.nombre || ""} onChange={e => setProfile((p: any) => ({ ...p, nombre: e.target.value }))} className="mt-1 bg-background border-border" /></div>
              <div><Label>{t("login.email")}</Label><Input value={profile.email || ""} disabled className="mt-1 bg-muted border-border text-muted-foreground" /></div>
              <div><Label>{t("profile.phone")}</Label><Input value={profile.telefono || ""} onChange={e => setProfile((p: any) => ({ ...p, telefono: e.target.value }))} className="mt-1 bg-background border-border" /></div>
            </div>
          </div>
        </div>

        <div className="card-surface p-6">
          <h2 className="font-heading text-base font-bold mb-4">{t("profile.personal")}</h2>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>{t("profile.birthdate")}</Label><Input type="date" value={profile.fecha_nacimiento || ""} onChange={e => setProfile((p: any) => ({ ...p, fecha_nacimiento: e.target.value }))} className="mt-1 bg-background border-border" /></div>
            <div><Label>{t("profile.city")}</Label><Input value={profile.ciudad || ""} onChange={e => setProfile((p: any) => ({ ...p, ciudad: e.target.value }))} className="mt-1 bg-background border-border" /></div>
            <div><Label>{t("profile.country")}</Label><Input value={profile.pais || ""} onChange={e => setProfile((p: any) => ({ ...p, pais: e.target.value }))} className="mt-1 bg-background border-border" /></div>
            <div><Label>{t("profile.weight")}</Label><Input type="number" value={profile.peso_kg || ""} onChange={e => setProfile((p: any) => ({ ...p, peso_kg: parseFloat(e.target.value) || null }))} className="mt-1 bg-background border-border" /></div>
            <div><Label>{t("profile.height")}</Label><Input type="number" value={profile.altura_cm || ""} onChange={e => setProfile((p: any) => ({ ...p, altura_cm: parseFloat(e.target.value) || null }))} className="mt-1 bg-background border-border" /></div>
          </div>
        </div>

        <div className="card-surface p-6">
          <h2 className="font-heading text-base font-bold mb-4">{t("profile.healthTitle")}</h2>
          <h3 className="text-sm font-semibold text-primary mb-2">{t("profile.dietRestrictions")}</h3>
          <div className="flex flex-wrap gap-2 mb-4">
            {[...alergias, ...dietas, ...salud, ...preferenciasComida].map(item => (
              <button key={item} onClick={() => setRestrictions(prev => toggleItem(prev, item))}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${restrictions.includes(item) ? "bg-primary/20 border-primary text-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}>
                {item}
              </button>
            ))}
          </div>
          <h3 className="text-sm font-semibold text-primary mb-2">{t("profile.healthProblems")}</h3>
          <div className="flex flex-wrap gap-2">
            {problemasSalud.map(item => (
              <button key={item} onClick={() => setProfile((p: any) => ({ ...p, problemas_salud: toggleItem(p.problemas_salud || [], item) }))}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${(profile.problemas_salud || []).includes(item) ? "bg-secondary/20 border-secondary text-secondary" : "border-border text-muted-foreground hover:border-secondary/50"}`}>
                {item}
              </button>
            ))}
          </div>
        </div>

        <div className="card-surface p-6">
          <h2 className="font-heading text-base font-bold mb-4 flex items-center gap-2"><CreditCard className="h-4 w-4" /> {t("profile.subscription")}</h2>
          <div className="flex items-center gap-3 mb-4">
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${profile.suscripcion_activa ? "bg-primary/20 text-primary" : "bg-destructive/20 text-destructive"}`}>
              {profile.suscripcion_activa ? t("common.active").toUpperCase() : t("common.inactive").toUpperCase()}
            </span>
          </div>
          {profile.suscripcion_hasta && (
            <p className="text-xs text-muted-foreground mb-4">{t("profile.nextCharge")} {new Date(profile.suscripcion_hasta).toLocaleDateString(locale)}</p>
          )}
          {profile.suscripcion_activa && (
            <Button
              variant="outline"
              className="border-border text-foreground"
              onClick={async () => {
                try {
                  const { data, error } = await supabase.functions.invoke("customer-portal");
                  if (error) throw error;
                  if (data?.url) window.open(data.url, "_blank");
                } catch {
                  toast.error(t("profile.portalError"));
                }
              }}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              {t("checkout.manage")}
            </Button>
          )}
        </div>

        <div className="card-surface p-6">
          <h2 className="font-heading text-base font-bold mb-4 flex items-center gap-2"><Shield className="h-4 w-4" /> {t("profile.security")}</h2>
          <Button variant="outline" onClick={handleChangePassword} className="border-border text-foreground">{t("profile.changePassword")}</Button>
        </div>

        <div className="card-surface p-6">
          <h2 className="font-heading text-base font-bold mb-4 flex items-center gap-2"><MessageCircle className="h-4 w-4" /> {t("profile.telegram")}</h2>
          {profile.telegram_id ? (
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-primary/20 px-3 py-1 text-xs text-primary font-medium">{t("profile.connected")}</span>
              <span className="text-sm text-muted-foreground">ID: {profile.telegram_id}</span>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t("profile.notConnected")}</p>
          )}
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full bg-primary text-primary-foreground font-semibold h-12">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : t("common.save")}
        </Button>
      </main>
    </div>
  );
};

export default Profile;
