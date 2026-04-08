import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChefHat, LogOut, Plus, Calendar, Loader2, User, Download, Share2, FileText, Lightbulb, MessageCircle } from "lucide-react";
import { toast } from "sonner";

interface Plan {
  id: string;
  creado_en: string;
  semanas: number;
  ingredientes: string;
  dias_generados?: number;
  public_token?: string;
}

interface Profile {
  nombre: string;
  foto_perfil: string | null;
  suscripcion_activa: boolean;
  creado_en: string | null;
  telegram_id: number | null;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [exporting, setExporting] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/login"); return; }

      const [{ data: profileData }, { data: plansData }] = await Promise.all([
        supabase.from("profiles").select("nombre, foto_perfil, suscripcion_activa, creado_en, telegram_id").eq("id", user.id).single(),
        supabase.from("planes").select("id, creado_en, semanas, ingredientes, dias_generados, public_token").eq("usuario_id", user.id).order("creado_en", { ascending: false }),
      ]);

      setProfile(profileData as Profile | null);
      setPlans((plansData as Plan[]) || []);
      setLoading(false);
    };
    load();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const handleExportHTML = async (planId: string) => {
    setExporting(planId);
    try {
      const { data, error } = await supabase.functions.invoke("generate-html", { body: { plan_id: planId } });
      if (error) throw error;
      const blob = new Blob([data.html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `plan-paraguachi-${planId.substring(0, 8)}.html`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("HTML descargado");
    } catch {
      toast.error("Error al exportar HTML");
    } finally {
      setExporting(null);
    }
  };

  const handleShare = (publicToken?: string) => {
    if (!publicToken) return;
    const url = `${window.location.origin}/ver-plan/${publicToken}`;
    navigator.clipboard.writeText(url);
    toast.success("Enlace copiado al portapapeles");
  };

  const userName = profile?.nombre || "Usuario";
  const totalRecipes = plans.reduce((acc, p) => acc + (p.semanas || 4) * 7 * 3, 0);
  const memberSince = profile?.creado_en ? new Date(profile.creado_en).toLocaleDateString("es-ES", { month: "long", year: "numeric" }) : "";

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 py-4">
        <div className="container flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ChefHat className="h-6 w-6 text-primary" />
            <span className="font-heading text-lg font-bold text-primary">Paraguachi</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/perfil">
              <Avatar className="h-8 w-8 border border-border">
                <AvatarImage src={profile?.foto_perfil || undefined} />
                <AvatarFallback className="bg-primary/20 text-primary text-xs">{userName.charAt(0)}</AvatarFallback>
              </Avatar>
            </Link>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${profile?.suscripcion_activa ? "bg-primary/20 text-primary" : "bg-destructive/20 text-destructive"}`}>
              {profile?.suscripcion_activa ? "Activa" : "Inactiva"}
            </span>
            <button onClick={handleLogout} className="text-muted-foreground hover:text-foreground"><LogOut className="h-4 w-4" /></button>
          </div>
        </div>
      </header>

      <main className="container py-8">
        {/* Welcome */}
        <div className="mb-8">
          <h1 className="font-heading text-2xl font-bold">Hola, {userName} 👋</h1>
          <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
            <span>{plans.length} planes generados</span>
            <span>~{totalRecipes} recetas únicas</span>
            {memberSince && <span>Miembro desde {memberSince}</span>}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-8 flex flex-wrap gap-3">
          <Link to="/onboarding">
            <Button className="bg-primary text-primary-foreground font-semibold gap-2"><Plus className="h-4 w-4" /> Nuevo plan</Button>
          </Link>
          {plans.length > 0 && (
            <Link to={`/plan/${plans[0].id}`}>
              <Button variant="outline" className="gap-2 border-border"><FileText className="h-4 w-4" /> Mi último plan</Button>
            </Link>
          )}
        </div>

        {/* Telegram widget */}
        {!profile?.telegram_id && (
          <div className="mb-6 card-surface p-4 flex items-center gap-4">
            <MessageCircle className="h-8 w-8 text-blue-400 shrink-0" />
            <div className="flex-1">
              <h3 className="font-heading text-sm font-semibold">Conecta Telegram</h3>
              <p className="text-xs text-muted-foreground">Recibe tus planes y recordatorios por Telegram</p>
            </div>
            <Link to="/perfil"><Button size="sm" variant="outline" className="border-border text-xs">Conectar</Button></Link>
          </div>
        )}
        {profile?.telegram_id && (
          <div className="mb-6 card-surface p-4 flex items-center gap-3">
            <MessageCircle className="h-5 w-5 text-primary" />
            <span className="text-xs text-primary font-medium">✅ Telegram conectado</span>
          </div>
        )}

        {/* Plans */}
        <h2 className="font-heading text-lg font-bold mb-4">Mis planes</h2>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : plans.length === 0 ? (
          <div className="card-surface p-12 text-center">
            <ChefHat className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 font-heading text-lg font-semibold">Sin planes aún</h3>
            <p className="mt-2 text-sm text-muted-foreground">Genera tu primer plan de comidas personalizado</p>
            <Link to="/onboarding" className="block mt-6"><Button className="bg-primary text-primary-foreground font-semibold">Comenzar →</Button></Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {plans.map(plan => (
              <div key={plan.id} className="card-surface p-5 group">
                <Link to={`/plan/${plan.id}`} className="block">
                  <div className="flex items-center gap-2 text-muted-foreground mb-3">
                    <Calendar className="h-4 w-4" />
                    <span className="text-xs">{new Date(plan.creado_en).toLocaleDateString("es-ES", { year: "numeric", month: "long", day: "numeric" })}</span>
                  </div>
                  <h3 className="font-heading font-semibold group-hover:text-primary transition-colors">
                    Plan de {plan.dias_generados || plan.semanas * 7} días
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{plan.ingredientes}</p>
                </Link>
                <div className="mt-4 flex gap-2">
                  <Link to={`/plan/${plan.id}`} className="text-xs text-primary font-medium hover:underline">Ver plan →</Link>
                  <button onClick={() => handleExportHTML(plan.id)} disabled={exporting === plan.id} className="text-xs text-muted-foreground hover:text-primary disabled:opacity-50 flex items-center gap-1">
                    {exporting === plan.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />} HTML
                  </button>
                  {plan.public_token && (
                    <button onClick={() => handleShare(plan.public_token)} className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1">
                      <Share2 className="h-3 w-3" /> Compartir
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Suggestions widget */}
        {plans.length > 0 && (
          <div className="mt-8 card-surface p-5">
            <h3 className="font-heading text-sm font-semibold flex items-center gap-2 mb-3">
              <Lightbulb className="h-4 w-4 text-secondary" /> Para tu próximo plan, considera agregar:
            </h3>
            <div className="flex flex-wrap gap-2">
              {["Aguacate", "Quinoa", "Camote", "Yogurt griego", "Espinaca"].map(item => (
                <span key={item} className="rounded-full border border-secondary/30 bg-secondary/10 px-3 py-1 text-xs text-secondary">{item}</span>
              ))}
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-border/50 py-6">
        <p className="text-center text-[11px] text-muted-foreground">
          Paraguachi Meals Prep · Ing. Chef Alexander Matute & Ing. Nelly Rendón, Especialista en Manipulación y Conservación de Alimentos · Los Angeles, CA
        </p>
      </footer>
    </div>
  );
};

export default Dashboard;
