import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ChefHat, Clock, Flame, Loader2, ArrowLeft, ShoppingCart, BookOpen } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const proteinColors: Record<string, string> = {
  pollo: "bg-primary/20 text-primary",
  res: "bg-secondary/20 text-secondary",
  cerdo: "bg-secondary/20 text-secondary",
  pescado: "bg-red-500/20 text-red-400",
  vegetariano: "bg-emerald-500/20 text-emerald-400",
};

const PlanViewer = () => {
  const { id } = useParams();
  const [plan, setPlan] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("planes")
        .select("*")
        .eq("id", id)
        .single();
      setPlan(data);
      setLoading(false);
    };
    if (id) load();
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!plan?.plan_json) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <ChefHat className="mx-auto h-12 w-12 text-muted-foreground" />
          <h2 className="mt-4 font-heading text-xl font-bold">Plan no encontrado</h2>
          <Link to="/dashboard" className="mt-4 inline-block text-sm text-primary hover:underline">← Volver al dashboard</Link>
        </div>
      </div>
    );
  }

  const planData = plan.plan_json;
  const weeks = planData.semanas || [];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 py-4">
        <div className="container flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="flex items-center gap-2">
              <ChefHat className="h-6 w-6 text-primary" />
              <span className="font-heading text-lg font-bold text-primary">Plan de comidas</span>
            </div>
          </div>
          <span className="text-xs text-muted-foreground">
            {new Date(plan.creado_en).toLocaleDateString("es-ES", { year: "numeric", month: "long", day: "numeric" })}
          </span>
        </div>
      </header>

      <main className="container py-6">
        <Tabs defaultValue="1">
          <TabsList className="mb-6 bg-card border border-border">
            {weeks.map((_: any, i: number) => (
              <TabsTrigger key={i} value={String(i + 1)} className="font-heading data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                Semana {i + 1}
              </TabsTrigger>
            ))}
          </TabsList>

          {weeks.map((week: any, wi: number) => (
            <TabsContent key={wi} value={String(wi + 1)}>
              {/* Recipe cards */}
              <div className="space-y-6">
                {(week.dias || []).map((day: any, di: number) => (
                  <div key={di}>
                    <h3 className="font-heading text-base font-bold mb-3 text-primary">Día {day.numero || di + 1}</h3>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {(day.comidas || []).map((meal: any, mi: number) => (
                        <div key={mi} className="card-surface p-4 space-y-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{meal.tipo}</span>
                              <h4 className="font-heading text-sm font-bold mt-0.5">{meal.nombre}</h4>
                            </div>
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${proteinColors[meal.tipo_proteina] || "bg-muted text-muted-foreground"}`}>
                              {meal.tipo_proteina}
                            </span>
                          </div>
                          <div className="flex gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{meal.tiempo_prep + (meal.tiempo_coccion || 0)} min</span>
                            <span className="flex items-center gap-1"><Flame className="h-3 w-3" />{meal.calorias} kcal</span>
                          </div>
                          {/* Macros */}
                          <div className="grid grid-cols-3 gap-2 text-center">
                            <div className="rounded-md bg-muted/50 py-1"><p className="text-[10px] text-muted-foreground">Prot</p><p className="text-xs font-semibold">{meal.proteinas}g</p></div>
                            <div className="rounded-md bg-muted/50 py-1"><p className="text-[10px] text-muted-foreground">Carbs</p><p className="text-xs font-semibold">{meal.carbohidratos}g</p></div>
                            <div className="rounded-md bg-muted/50 py-1"><p className="text-[10px] text-muted-foreground">Grasas</p><p className="text-xs font-semibold">{meal.grasas}g</p></div>
                          </div>
                          {/* Ingredients */}
                          <div className="flex flex-wrap gap-1">
                            {(meal.ingredientes || []).map((ing: any, ii: number) => (
                              <span key={ii} className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">{ing.cantidad} {ing.nombre}</span>
                            ))}
                          </div>
                          {/* Steps */}
                          <details className="group">
                            <summary className="text-xs text-primary cursor-pointer font-medium">Ver pasos</summary>
                            <ol className="mt-2 space-y-1.5">
                              {(meal.pasos || []).map((paso: any, pi: number) => (
                                <li key={pi} className="flex gap-2 text-xs text-muted-foreground">
                                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] text-primary font-bold">{paso.numero}</span>
                                  {paso.instruccion}
                                </li>
                              ))}
                            </ol>
                          </details>
                          {/* Storage */}
                          {meal.almacenamiento && (
                            <p className="text-[10px] text-muted-foreground italic">💡 {meal.almacenamiento.meal_prep || meal.almacenamiento.refrigerador}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Shopping List */}
              {week.lista_compras && (
                <div className="mt-8 card-surface p-6">
                  <h3 className="font-heading text-base font-bold mb-4 flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4 text-primary" /> Lista de compras — Semana {wi + 1}
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {Object.entries(week.lista_compras).map(([cat, items]: [string, any]) => (
                      <div key={cat}>
                        <h4 className="text-xs font-semibold text-primary capitalize mb-1">{cat}</h4>
                        <ul className="space-y-0.5">
                          {(items || []).map((item: string, i: number) => (
                            <li key={i} className="text-xs text-muted-foreground">• {item}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Meal Prep Guide */}
              {week.guia_meal_prep && (
                <div className="mt-4 card-surface p-6">
                  <h3 className="font-heading text-base font-bold mb-2 flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-primary" /> Guía de Meal Prep
                  </h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-line">{week.guia_meal_prep}</p>
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </main>
    </div>
  );
};

export default PlanViewer;
