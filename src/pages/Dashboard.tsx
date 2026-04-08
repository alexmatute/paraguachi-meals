import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ChefHat, LogOut, Plus, Calendar, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Plan {
  id: string;
  creado_en: string;
  semanas: number;
  ingredientes: string;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("");

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/login"); return; }
      setUserName(user.user_metadata?.nombre || user.email || "Usuario");

      const { data } = await supabase
        .from("planes")
        .select("id, creado_en, semanas, ingredientes")
        .eq("usuario_id", user.id)
        .order("creado_en", { ascending: false });

      setPlans((data as Plan[]) || []);
      setLoading(false);
    };
    load();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 py-4">
        <div className="container flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ChefHat className="h-6 w-6 text-primary" />
            <span className="font-heading text-lg font-bold text-primary">Paraguachi</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-sm text-muted-foreground">Hola, {userName}</span>
            <span className="rounded-full bg-primary/20 px-2.5 py-0.5 text-xs font-medium text-primary">Activa</span>
            <button onClick={handleLogout} className="text-muted-foreground hover:text-foreground">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="container py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="font-heading text-2xl font-bold">Mis planes</h1>
          <Link to="/onboarding">
            <Button className="bg-primary text-primary-foreground font-semibold gap-2">
              <Plus className="h-4 w-4" /> Generar nuevo plan
            </Button>
          </Link>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : plans.length === 0 ? (
          <div className="card-surface p-12 text-center">
            <ChefHat className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 font-heading text-lg font-semibold">Sin planes aún</h3>
            <p className="mt-2 text-sm text-muted-foreground">Genera tu primer plan de comidas personalizado</p>
            <Link to="/onboarding" className="block mt-6">
              <Button className="bg-primary text-primary-foreground font-semibold">Comenzar →</Button>
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {plans.map(plan => (
              <Link key={plan.id} to={`/plan/${plan.id}`} className="card-surface p-5 hover:border-primary/50 transition-colors group">
                <div className="flex items-center gap-2 text-muted-foreground mb-3">
                  <Calendar className="h-4 w-4" />
                  <span className="text-xs">{new Date(plan.creado_en).toLocaleDateString("es-ES", { year: "numeric", month: "long", day: "numeric" })}</span>
                </div>
                <h3 className="font-heading font-semibold group-hover:text-primary transition-colors">Plan de {plan.semanas} semanas</h3>
                <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{plan.ingredientes}</p>
                <div className="mt-4">
                  <span className="text-xs text-primary font-medium">Ver plan completo →</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
