import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ChefHat, TrendingUp, Recycle, DollarSign, Brain, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface RecipeStats {
  totalPlans: number;
  totalRecipes: number;
  uniqueRecipes: number;
  reuseRate: number;
  topRecipes: { nombre: string; veces_generada: number; tipo_proteina: string }[];
  topProteins: { type: string; count: number }[];
  topObjectives: { objective: string; count: number }[];
  totalCost: number;
  avgCostPerPlan: number;
}

interface AIPrediction {
  loading: boolean;
  result: string | null;
}

const AdminRecipes = () => {
  const [stats, setStats] = useState<RecipeStats | null>(null);
  const [recentPlans, setRecentPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [prediction, setPrediction] = useState<AIPrediction>({ loading: false, result: null });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);

    const [plansCount, recipesData, tokenData, recentData] = await Promise.all([
      supabase.from("planes").select("*", { count: "exact", head: true }),
      supabase.from("recetas_catalogo").select("nombre, veces_generada, tipo_proteina, objetivo").order("veces_generada", { ascending: false }),
      supabase.from("token_usage").select("costo_usd"),
      supabase.from("planes").select("id, creado_en, ingredientes, semanas, usuario_id, plan_json").order("creado_en", { ascending: false }).limit(20),
    ]);

    const recipes = recipesData.data || [];
    const tokens = tokenData.data || [];
    const totalCost = tokens.reduce((s, t) => s + (t.costo_usd || 0), 0);
    const totalPlans = plansCount.count || 0;

    // Top proteins
    const proteinMap: Record<string, number> = {};
    recipes.forEach((r) => {
      const p = r.tipo_proteina || "otro";
      proteinMap[p] = (proteinMap[p] || 0) + (r.veces_generada || 1);
    });
    const topProteins = Object.entries(proteinMap)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Top objectives
    const objMap: Record<string, number> = {};
    recipes.forEach((r) => {
      const o = r.objetivo || "general";
      objMap[o] = (objMap[o] || 0) + 1;
    });
    const topObjectives = Object.entries(objMap)
      .map(([objective, count]) => ({ objective, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Reuse rate
    const totalGenerated = recipes.reduce((s, r) => s + (r.veces_generada || 1), 0);
    const reuseRate = recipes.length > 0 ? Math.round(((totalGenerated - recipes.length) / totalGenerated) * 100) : 0;

    setStats({
      totalPlans,
      totalRecipes: totalGenerated,
      uniqueRecipes: recipes.length,
      reuseRate,
      topRecipes: recipes.slice(0, 10) as any,
      topProteins,
      topObjectives,
      totalCost,
      avgCostPerPlan: totalPlans > 0 ? totalCost / totalPlans : 0,
    });

    setRecentPlans(recentData.data || []);
    setLoading(false);
  };

  const runPrediction = async () => {
    if (!stats) return;
    setPrediction({ loading: true, result: null });

    try {
      const context = {
        total_plans: stats.totalPlans,
        unique_recipes: stats.uniqueRecipes,
        reuse_rate: stats.reuseRate,
        top_proteins: stats.topProteins,
        top_objectives: stats.topObjectives,
        total_cost_usd: stats.totalCost.toFixed(4),
        avg_cost_per_plan: stats.avgCostPerPlan.toFixed(4),
        top_recipes: stats.topRecipes.slice(0, 5).map((r) => `${r.nombre} (${r.veces_generada}x)`),
      };

      const { data, error } = await supabase.functions.invoke("generate-html", {
        body: {
          mode: "ai_prediction",
          context: JSON.stringify(context),
        },
      });

      if (error) throw error;
      setPrediction({ loading: false, result: data?.prediction || "No se pudo generar predicción." });
    } catch (e) {
      console.error(e);
      toast.error("Error al generar predicción");
      setPrediction({ loading: false, result: null });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold">Recetas & Inteligencia</h1>
        <Button onClick={runPrediction} disabled={prediction.loading} className="gap-2">
          {prediction.loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Brain className="h-4 w-4" />}
          Predecir comportamiento
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card-surface p-5">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <ChefHat className="h-4 w-4" /> Planes generados
          </div>
          <p className="font-heading text-2xl font-bold text-primary">{stats.totalPlans}</p>
        </div>
        <div className="card-surface p-5">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Sparkles className="h-4 w-4" /> Recetas únicas
          </div>
          <p className="font-heading text-2xl font-bold">{stats.uniqueRecipes}</p>
          <p className="text-xs text-muted-foreground">{stats.totalRecipes} total generadas</p>
        </div>
        <div className="card-surface p-5">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Recycle className="h-4 w-4" /> Tasa de reutilización
          </div>
          <p className="font-heading text-2xl font-bold text-primary">{stats.reuseRate}%</p>
          <p className="text-xs text-muted-foreground">Ahorro por caché</p>
        </div>
        <div className="card-surface p-5">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <DollarSign className="h-4 w-4" /> Costo AI total
          </div>
          <p className="font-heading text-2xl font-bold">${stats.totalCost.toFixed(4)}</p>
          <p className="text-xs text-muted-foreground">${stats.avgCostPerPlan.toFixed(4)} / plan</p>
        </div>
      </div>

      {/* AI Prediction */}
      {prediction.result && (
        <div className="card-surface border-primary/20 bg-primary/5 p-6">
          <div className="flex items-center gap-2 mb-3">
            <Brain className="h-5 w-5 text-primary" />
            <h2 className="font-heading font-semibold">Predicción de comportamiento</h2>
          </div>
          <div className="prose prose-sm max-w-none text-foreground whitespace-pre-wrap">
            {prediction.result}
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top Recipes */}
        <div className="card-surface overflow-hidden">
          <div className="flex items-center gap-2 border-b p-4">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h2 className="font-heading font-semibold">Top recetas populares</h2>
          </div>
          <div className="divide-y">
            {stats.topRecipes.map((r, i) => (
              <div key={i} className="flex items-center justify-between p-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-sm font-medium">{r.nombre}</p>
                    <p className="text-xs text-muted-foreground">{r.tipo_proteina}</p>
                  </div>
                </div>
                <Badge variant="outline">{r.veces_generada}x</Badge>
              </div>
            ))}
            {stats.topRecipes.length === 0 && (
              <p className="p-4 text-center text-sm text-muted-foreground">Sin datos aún</p>
            )}
          </div>
        </div>

        {/* Insights */}
        <div className="space-y-6">
          {/* Top Proteins */}
          <div className="card-surface overflow-hidden">
            <div className="border-b p-4">
              <h2 className="font-heading font-semibold text-sm">Proteínas más usadas</h2>
            </div>
            <div className="p-4 space-y-2">
              {stats.topProteins.map((p) => {
                const maxCount = stats.topProteins[0]?.count || 1;
                return (
                  <div key={p.type} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="capitalize">{p.type}</span>
                      <span className="text-muted-foreground">{p.count}</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${(p.count / maxCount) * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top Objectives */}
          <div className="card-surface overflow-hidden">
            <div className="border-b p-4">
              <h2 className="font-heading font-semibold text-sm">Objetivos populares</h2>
            </div>
            <div className="p-4 space-y-2">
              {stats.topObjectives.map((o) => (
                <div key={o.objective} className="flex items-center justify-between text-sm">
                  <span className="capitalize">{o.objective}</span>
                  <Badge variant="secondary">{o.count}</Badge>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Plans */}
      <div className="card-surface overflow-hidden">
        <div className="border-b p-4">
          <h2 className="font-heading font-semibold">Planes recientes</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left p-3 text-xs text-muted-foreground font-medium">Fecha</th>
                <th className="text-left p-3 text-xs text-muted-foreground font-medium">Ingredientes</th>
                <th className="text-left p-3 text-xs text-muted-foreground font-medium">Semanas</th>
                <th className="text-left p-3 text-xs text-muted-foreground font-medium">Recetas</th>
              </tr>
            </thead>
            <tbody>
              {recentPlans.map((p) => {
                const recipeCount = (p.plan_json as any)?.semanas?.reduce(
                  (s: number, sem: any) => s + (sem.dias?.reduce((d: number, dia: any) => d + (dia.comidas?.length || 0), 0) || 0),
                  0
                ) || "—";
                return (
                  <tr key={p.id} className="border-b border-border/50">
                    <td className="p-3 text-xs text-muted-foreground">
                      {new Date(p.creado_en).toLocaleDateString("es-ES")}
                    </td>
                    <td className="p-3 text-xs truncate max-w-xs">{p.ingredientes?.slice(0, 80) || "—"}</td>
                    <td className="p-3 text-xs">{p.semanas}</td>
                    <td className="p-3 text-xs">{recipeCount}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminRecipes;
