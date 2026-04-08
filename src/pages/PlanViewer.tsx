import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Clock, Flame, Loader2, ArrowLeft, ShoppingCart, BookOpen, Download, Share2, FileText } from "lucide-react";
import Logo from "@/components/Logo";
import { generatePlanPDF } from "@/lib/pdf-export";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import LangSwitcher from "@/components/LangSwitcher";

const proteinColors: Record<string, string> = {
  pollo: "bg-primary/20 text-primary",
  res: "bg-secondary/20 text-secondary",
  cerdo: "bg-secondary/20 text-secondary",
  pescado: "bg-red-500/20 text-red-400",
  vegetariano: "bg-emerald-500/20 text-emerald-400",
};

const PlanViewer = () => {
  const { id } = useParams();
  const { t, lang } = useI18n();
  const [plan, setPlan] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const locale = lang === "es" ? "es-ES" : "en-US";

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("planes").select("*").eq("id", id).single();
      setPlan(data);
      setLoading(false);
    };
    if (id) load();
  }, [id]);

  const handleExportHTML = async () => {
    setExporting(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-html", { body: { plan_id: id } });
      if (error) throw error;
      const blob = new Blob([data.html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `plan-paraguachi-${(id || "").substring(0, 8)}.html`; a.click();
      URL.revokeObjectURL(url);
      toast.success(t("dashboard.htmlDownloaded"));
    } catch { toast.error(t("dashboard.htmlError")); } finally { setExporting(false); }
  };

  const handleShare = () => {
    if (!plan?.public_token) return;
    navigator.clipboard.writeText(`${window.location.origin}/ver-plan/${plan.public_token}`);
    toast.success(t("dashboard.linkCopied"));
  };

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  if (!plan?.plan_json) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <Logo className="mx-auto opacity-50" />
          <h2 className="mt-4 font-heading text-xl font-bold">{t("plan.notFound")}</h2>
          <Link to="/dashboard" className="mt-4 inline-block text-sm text-primary hover:underline">{t("plan.backDashboard")}</Link>
        </div>
      </div>
    );
  }

  const planData = plan.plan_json;
  const weeks = planData.semanas || [];
  const analysis = planData.analisis;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 py-4">
        <div className="container flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="text-muted-foreground hover:text-foreground"><ArrowLeft className="h-5 w-5" /></Link>
            <div className="flex items-center gap-2">
              <Logo />
              <span className="font-heading text-lg font-bold text-primary">{t("plan.title")}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <LangSwitcher />
            <Button variant="outline" size="sm" onClick={handleExportHTML} disabled={exporting} className="gap-1 border-border text-xs">
              {exporting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />} HTML
            </Button>
            <Button variant="outline" size="sm" disabled={exportingPdf} className="gap-1 border-border text-xs"
              onClick={() => {
                setExportingPdf(true);
                try {
                  const pdf = await generatePlanPDF(planData, lang);
                  pdf.save(`plan-paraguachi-${(id || "").substring(0, 8)}.pdf`);
                  toast.success(t("plan.pdfDownloaded"));
                } catch { toast.error(t("plan.pdfError")); }
                finally { setExportingPdf(false); }
              }}>
              {exportingPdf ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileText className="h-3 w-3" />} PDF
            </Button>
            {plan.public_token && (
              <Button variant="outline" size="sm" onClick={handleShare} className="gap-1 border-border text-xs"><Share2 className="h-3 w-3" /> {t("common.share")}</Button>
            )}
            <span className="text-xs text-muted-foreground hidden sm:inline">
              {new Date(plan.creado_en).toLocaleDateString(locale, { year: "numeric", month: "long", day: "numeric" })}
            </span>
          </div>
        </div>
      </header>

      <main className="container py-6">
        {analysis && (
          <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="card-surface p-4 border-primary/30">
              <p className="text-xs text-muted-foreground">{t("plan.ingredients")}</p>
              <p className="font-heading text-lg font-bold text-primary">{analysis.ingredientes_detectados?.length || 0}</p>
            </div>
            <div className="card-surface p-4">
              <p className="text-xs text-muted-foreground">{t("plan.generated")}</p>
              <p className="font-heading text-lg font-bold">{analysis.recetas_posibles || "—"}</p>
            </div>
            {analysis.advertencias?.length > 0 && (
              <div className="card-surface p-4 border-secondary/30">
                <p className="text-xs text-secondary font-medium mb-1">{t("plan.warnings")}</p>
                {analysis.advertencias.map((a: string, i: number) => <p key={i} className="text-xs text-muted-foreground">{a}</p>)}
              </div>
            )}
          </div>
        )}

        {analysis?.ingredientes_sugeridos?.length > 0 && (
          <div className="mb-6 card-surface p-4">
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-2">{t("plan.suggestions")}</h3>
            <div className="flex flex-wrap gap-2">
              {analysis.ingredientes_sugeridos.map((s: any, i: number) => (
                <span key={i} className="rounded-full border border-secondary/30 bg-secondary/10 px-3 py-1 text-xs text-secondary" title={s.razon}>
                  {s.ingrediente} (+{s.recetas_adicionales} {t("plan.additionalRecipes")})
                </span>
              ))}
            </div>
          </div>
        )}

        <Tabs defaultValue="1">
          <TabsList className="mb-6 bg-card border border-border">
            {weeks.map((_: any, i: number) => (
              <TabsTrigger key={i} value={String(i + 1)} className="font-heading data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                {t("plan.week")} {i + 1}
              </TabsTrigger>
            ))}
          </TabsList>

          {weeks.map((week: any, wi: number) => (
            <TabsContent key={wi} value={String(wi + 1)}>
              <div className="space-y-6">
                {(week.dias || []).map((day: any, di: number) => (
                  <div key={di}>
                    <h3 className="font-heading text-base font-bold mb-3 text-primary">{t("plan.day")} {day.numero || di + 1}</h3>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {(day.comidas || []).map((meal: any, mi: number) => (
                        <div key={mi} className="card-surface p-4 space-y-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{meal.tipo}</span>
                              <h4 className="font-heading text-sm font-bold mt-0.5">{meal.nombre}</h4>
                            </div>
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${proteinColors[meal.tipo_proteina] || "bg-muted text-muted-foreground"}`}>{meal.tipo_proteina}</span>
                          </div>
                          <div className="flex gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{(meal.tiempo_prep || 0) + (meal.tiempo_coccion || 0)} min</span>
                            <span className="flex items-center gap-1"><Flame className="h-3 w-3" />{meal.calorias} kcal</span>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-center">
                            <div className="rounded-md bg-muted/50 py-1"><p className="text-[10px] text-muted-foreground">Prot</p><p className="text-xs font-semibold">{meal.proteinas}g</p></div>
                            <div className="rounded-md bg-muted/50 py-1"><p className="text-[10px] text-muted-foreground">Carbs</p><p className="text-xs font-semibold">{meal.carbohidratos}g</p></div>
                            <div className="rounded-md bg-muted/50 py-1"><p className="text-[10px] text-muted-foreground">Fat</p><p className="text-xs font-semibold">{meal.grasas}g</p></div>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {(meal.ingredientes || []).map((ing: any, ii: number) => (
                              <span key={ii} className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">{ing.cantidad} {ing.nombre}</span>
                            ))}
                          </div>
                          <details>
                            <summary className="text-xs text-primary cursor-pointer font-medium">{t("plan.viewSteps")}</summary>
                            <ol className="mt-2 space-y-1.5">
                              {(meal.pasos || []).map((paso: any, pi: number) => (
                                <li key={pi} className="flex gap-2 text-xs text-muted-foreground">
                                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] text-primary font-bold">{paso.numero}</span>
                                  {paso.instruccion}
                                </li>
                              ))}
                            </ol>
                          </details>
                          {meal.almacenamiento && (
                            <p className="text-[10px] text-muted-foreground italic">💡 {meal.almacenamiento.meal_prep || meal.almacenamiento.refrigerador}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {week.lista_compras && (
                <div className="mt-8 card-surface p-6">
                  <h3 className="font-heading text-base font-bold mb-4 flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4 text-primary" /> {t("plan.shopping")} — {t("plan.week")} {wi + 1}
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {Object.entries(week.lista_compras).map(([cat, items]: [string, any]) => (
                      <div key={cat}><h4 className="text-xs font-semibold text-primary capitalize mb-1">{cat}</h4>
                        <ul className="space-y-0.5">{(items || []).map((item: string, i: number) => <li key={i} className="text-xs text-muted-foreground">• {item}</li>)}</ul>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {week.guia_meal_prep && (
                <div className="mt-4 card-surface p-6">
                  <h3 className="font-heading text-base font-bold mb-2 flex items-center gap-2"><BookOpen className="h-4 w-4 text-primary" /> {t("plan.mealPrep")}</h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-line">{week.guia_meal_prep}</p>
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </main>

      <footer className="border-t border-border/50 py-6 mt-8">
        <div className="container text-center">
          <p className="text-[11px] text-muted-foreground">{t("footer.credits")}</p>
          <Link to="/dashboard" className="mt-2 inline-block text-xs text-primary hover:underline">{t("plan.backDashboard")}</Link>
        </div>
      </footer>
    </div>
  );
};

export default PlanViewer;
