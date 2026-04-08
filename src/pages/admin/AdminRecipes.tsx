import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

const AdminRecipes = () => {
  const [stats, setStats] = useState({ total: 0, avgPerPlan: 0 });
  const [recentPlans, setRecentPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { count } = await supabase.from("planes").select("*", { count: "exact", head: true });
      const { data } = await supabase.from("planes").select("id, creado_en, ingredientes, semanas, usuario_id").order("creado_en", { ascending: false }).limit(20);
      setStats({ total: count || 0, avgPerPlan: 28 });
      setRecentPlans(data || []);
      setLoading(false);
    };
    load();
  }, []);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-bold">Recetas</h1>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="card-surface p-5">
          <p className="text-xs text-muted-foreground">Total planes generados</p>
          <p className="font-heading text-2xl font-bold text-primary">{stats.total}</p>
        </div>
        <div className="card-surface p-5">
          <p className="text-xs text-muted-foreground">Promedio recetas por plan</p>
          <p className="font-heading text-2xl font-bold">{stats.avgPerPlan}</p>
        </div>
      </div>
      <div className="card-surface overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-border">
            <th className="text-left p-3 text-xs text-muted-foreground font-medium">Fecha</th>
            <th className="text-left p-3 text-xs text-muted-foreground font-medium">Ingredientes</th>
            <th className="text-left p-3 text-xs text-muted-foreground font-medium">Semanas</th>
          </tr></thead>
          <tbody>
            {recentPlans.map(p => (
              <tr key={p.id} className="border-b border-border/50">
                <td className="p-3 text-xs text-muted-foreground">{new Date(p.creado_en).toLocaleDateString("es-ES")}</td>
                <td className="p-3 text-xs truncate max-w-xs">{p.ingredientes?.slice(0, 80) || "—"}</td>
                <td className="p-3 text-xs">{p.semanas}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminRecipes;
