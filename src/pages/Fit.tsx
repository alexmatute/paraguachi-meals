import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Loader2, Dumbbell, Plus, Sparkles, Image as ImageIcon, Watch, Camera, Trash2, ArrowLeft, Lock, Play, Flame, Clock, Target, ExternalLink, Repeat, Timer, Zap } from "lucide-react";
import Logo from "@/components/Logo";
import LangSwitcher from "@/components/LangSwitcher";
import { toast } from "sonner";

const ACTIVITY_TYPES = [
  "walking", "running", "cycling", "swimming", "weights", "calisthenics",
  "hiit", "crossfit", "yoga", "pilates", "stretching", "dance", "boxing",
  "rowing", "elliptical", "stairs", "hike", "football", "basketball",
  "tennis", "functional", "other",
];

interface Routine {
  id: string;
  objetivo: string;
  dias_semana: number;
  duracion_dias: number;
  plan_json: any;
  creado_en: string;
}

interface Session {
  id: string;
  fecha: string;
  tipo: string | null;
  duracion_min: number | null;
  kcal: number | null;
  distancia_km: number | null;
  dispositivo: string | null;
  foto_url: string | null;
  notas: string | null;
}

interface ProgressPhoto {
  id: string;
  fecha: string;
  tipo: string;
  foto_url: string;
  peso_kg: number | null;
  cintura_cm: number | null;
  notas: string | null;
}

const parsePlanCandidate = (value: unknown): any => {
  if (typeof value !== "string") return value;

  const trimmed = value.trim();
  if (!trimmed) return value;

  const unfenced = trimmed
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/, "");

  try {
    const parsed = JSON.parse(unfenced);
    if (typeof parsed === "string") {
      try {
        return JSON.parse(parsed);
      } catch {
        return parsed;
      }
    }
    return parsed;
  } catch {
    return value;
  }
};

const normalizeRoutinePlan = (rawPlan: unknown) => {
  let parsed = parsePlanCandidate(rawPlan);

  if (parsed && typeof parsed === "object" && "resumen" in parsed) {
    const nested = parsePlanCandidate((parsed as Record<string, unknown>).resumen);
    if (nested && typeof nested === "object" && Array.isArray((nested as Record<string, unknown>).semanas)) {
      parsed = nested;
    }
  }

  return parsed && typeof parsed === "object" ? parsed : null;
};

// Map muscle group → MuscleWiki body-part slug (browse pages exist & don't 404)
const MUSCLEWIKI_MUSCLE_MAP: Record<string, string> = {
  pecho: "chest", chest: "chest",
  espalda: "back", back: "back", lats: "back", dorsal: "back",
  hombros: "shoulders", shoulders: "shoulders", deltoides: "shoulders",
  biceps: "biceps", bíceps: "biceps",
  triceps: "triceps", tríceps: "triceps",
  antebrazo: "forearms", forearms: "forearms",
  abdomen: "abdominals", abs: "abdominals", core: "abdominals", abdominales: "abdominals",
  cuadriceps: "quadriceps", cuádriceps: "quadriceps", quads: "quadriceps", piernas: "quadriceps",
  isquios: "hamstrings", hamstrings: "hamstrings", femoral: "hamstrings",
  gluteos: "glutes", glúteos: "glutes", glutes: "glutes",
  pantorrillas: "calves", calves: "calves", gemelos: "calves",
  trapecio: "traps", traps: "traps",
};

const buildMuscleWikiUrl = (muscle: string | undefined, lang: string) => {
  const key = (muscle || "").toLowerCase().replace(/\s+/g, "_");
  const slug = MUSCLEWIKI_MUSCLE_MAP[key] ?? "";
  const prefix = lang === "es" ? "https://musclewiki.com/es-es" : "https://musclewiki.com";
  return slug ? `${prefix}/exercises/male/${slug}` : `${prefix}/exercises`;
};

const buildYouTubeSearchUrl = (exerciseName: string, lang: string) => {
  const q = lang === "es"
    ? `cómo hacer ${exerciseName} técnica correcta`
    : `how to do ${exerciseName} proper form`;
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;
};

const Fit = () => {
  const navigate = useNavigate();
  const { t, lang } = useI18n();
  const { user, loading, hasFitAccess, isMonthly, isAdmin } = useAuth();

  const [routine, setRoutine] = useState<Routine | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
  const [prefs, setPrefs] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [diasSemana, setDiasSemana] = useState(3);
  const [duracionMin, setDuracionMin] = useState(45);
  const [activeWeek, setActiveWeek] = useState("1");
  const [demoExercise, setDemoExercise] = useState<{ nombre: string; descripcion?: string; musculo?: string; equipo?: string } | null>(null);

  // Session form
  const [sessionForm, setSessionForm] = useState({ tipo: "", ubicacion: "", intensidad: "", duracion_min: "", kcal: "", distancia_km: "", dispositivo: "", notas: "" });
  const [sessionFile, setSessionFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [savingSession, setSavingSession] = useState(false);

  // Photo form
  const [photoForm, setPhotoForm] = useState({ tipo: "progreso", peso_kg: "", cintura_cm: "", notas: "" });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [savingPhoto, setSavingPhoto] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate("/login");
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    void loadAll();
  }, [user]);

  const loadAll = async () => {
    setLoadingData(true);
    const [{ data: r }, { data: s }, { data: p }, { data: pref }, { data: prof }] = await Promise.all([
      supabase.from("rutinas_fit").select("*").eq("usuario_id", user!.id).eq("activa", true).order("creado_en", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("sesiones_entrenamiento").select("*").eq("usuario_id", user!.id).order("fecha", { ascending: false }).limit(50),
      supabase.from("fotos_progreso").select("*").eq("usuario_id", user!.id).order("fecha", { ascending: false }).limit(50),
      supabase.from("preferencias").select("*").eq("usuario_id", user!.id).maybeSingle(),
      supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle(),
    ]);
    setRoutine(r as Routine | null);
    setSessions((s as Session[]) || []);
    setPhotos((p as ProgressPhoto[]) || []);
    setPrefs(pref);
    setProfile(prof);
    setLoadingData(false);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-routine", {
        body: { dias_semana: diasSemana, duracion_dias: 28, duracion_min_sesion: duracionMin, lang },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(t("fit.generated"));
      await loadAll();
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || t("fit.error"));
    } finally {
      setGenerating(false);
    }
  };

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result as string);
      r.onerror = rej;
      r.readAsDataURL(file);
    });

  const handleSessionFileChange = async (file: File | null) => {
    setSessionFile(file);
    if (!file) return;
    setAnalyzing(true);
    try {
      const b64 = await fileToBase64(file);
      const { data, error } = await supabase.functions.invoke("analyze-workout", { body: { image_base64: b64, lang } });
      if (error) throw error;
      if (data?.data) {
        const d = data.data;
        setSessionForm({
          tipo: d.tipo || "",
          ubicacion: "",
          intensidad: "",
          duracion_min: d.duracion_min ? String(d.duracion_min) : "",
          kcal: d.kcal ? String(d.kcal) : "",
          distancia_km: d.distancia_km ? String(d.distancia_km) : "",
          dispositivo: d.dispositivo || "",
          notas: d.resumen || "",
        });
        toast.success(t("fit.aiDetected"));
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "AI error");
    } finally {
      setAnalyzing(false);
    }
  };

  const uploadFile = async (file: File, folder: string): Promise<string> => {
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${user!.id}/${folder}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("fit-uploads").upload(path, file, { upsert: false });
    if (error) throw error;
    const { data } = await supabase.storage.from("fit-uploads").createSignedUrl(path, 60 * 60 * 24 * 365);
    return data?.signedUrl || path;
  };

  const handleSaveSession = async () => {
    if (!sessionForm.tipo) { toast.error(t("fit.selectType")); return; }
    setSavingSession(true);
    try {
      let foto_url: string | null = null;
      if (sessionFile) foto_url = await uploadFile(sessionFile, "sessions");
      // Compose tipo with location + intensity for richer macro hints
      const tipoCompuesto = [
        sessionForm.tipo,
        sessionForm.ubicacion ? `(${sessionForm.ubicacion})` : "",
        sessionForm.intensidad ? `· ${sessionForm.intensidad}` : "",
      ].filter(Boolean).join(" ");
      const { error } = await supabase.from("sesiones_entrenamiento").insert({
        usuario_id: user!.id,
        tipo: tipoCompuesto || null,
        duracion_min: sessionForm.duracion_min ? Number(sessionForm.duracion_min) : null,
        kcal: sessionForm.kcal ? Number(sessionForm.kcal) : null,
        distancia_km: sessionForm.distancia_km ? Number(sessionForm.distancia_km) : null,
        dispositivo: sessionForm.dispositivo || null,
        notas: sessionForm.notas || null,
        foto_url,
      });
      if (error) throw error;
      toast.success(t("fit.savedSession"));
      setSessionForm({ tipo: "", ubicacion: "", intensidad: "", duracion_min: "", kcal: "", distancia_km: "", dispositivo: "", notas: "" });
      setSessionFile(null);
      await loadAll();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSavingSession(false);
    }
  };

  const handleSavePhoto = async () => {
    if (!photoFile) { toast.error("Selecciona una foto"); return; }
    setSavingPhoto(true);
    try {
      const foto_url = await uploadFile(photoFile, "progress");
      const { error } = await supabase.from("fotos_progreso").insert({
        usuario_id: user!.id,
        tipo: photoForm.tipo,
        foto_url,
        peso_kg: photoForm.peso_kg ? Number(photoForm.peso_kg) : null,
        cintura_cm: photoForm.cintura_cm ? Number(photoForm.cintura_cm) : null,
        notas: photoForm.notas || null,
      });
      if (error) throw error;
      toast.success(t("fit.savedPhoto"));
      setPhotoForm({ tipo: "progreso", peso_kg: "", cintura_cm: "", notas: "" });
      setPhotoFile(null);
      await loadAll();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSavingPhoto(false);
    }
  };

  const deleteSession = async (id: string) => {
    await supabase.from("sesiones_entrenamiento").delete().eq("id", id);
    setSessions(prev => prev.filter(s => s.id !== id));
  };
  const deletePhoto = async (id: string) => {
    await supabase.from("fotos_progreso").delete().eq("id", id);
    setPhotos(prev => prev.filter(p => p.id !== id));
  };

  if (loading || loadingData) {
    return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  // Gating: only monthly subscribers (or admins) can use Fit
  if (!hasFitAccess) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border/50 py-4">
          <div className="container flex items-center justify-between">
            <Logo />
            <LangSwitcher />
          </div>
        </header>
        <main className="container py-16 max-w-xl text-center">
          <Lock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h1 className="font-heading text-2xl font-bold mb-2">{t("fit.title")}</h1>
          <p className="text-muted-foreground mb-6">{t("fit.monthlyOnly")}</p>
          <Link to="/checkout"><Button className="bg-primary text-primary-foreground">{t("fit.upgrade")}</Button></Link>
          <div className="mt-4">
            <Link to="/dashboard" className="text-xs text-muted-foreground hover:text-primary">← Dashboard</Link>
          </div>
        </main>
      </div>
    );
  }

  const plan = normalizeRoutinePlan(routine?.plan_json);
  const summaryIsJsonBlob = typeof plan?.resumen === "string" && /^[\[{]/.test(plan.resumen.trim());

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 py-4">
        <div className="container flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-3">
            <LangSwitcher />
            <Link to="/dashboard" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
              <ArrowLeft className="h-3 w-3" /> Dashboard
            </Link>
          </div>
        </div>
      </header>

      <main className="container py-8 max-w-5xl">
        <div className="mb-8 flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="font-heading text-3xl font-bold flex items-center gap-2">
              <Dumbbell className="h-7 w-7 text-primary" /> {t("fit.title")}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">{t("fit.subtitle")}</p>
            {isAdmin && !isMonthly && (
              <span className="inline-block mt-2 text-[10px] px-2 py-0.5 rounded-full bg-primary/20 text-primary">Admin access</span>
            )}
          </div>
        </div>

        <Tabs defaultValue="routine" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="routine">{t("fit.tabRoutine")}</TabsTrigger>
            <TabsTrigger value="sessions">{t("fit.tabSessions")}</TabsTrigger>
            <TabsTrigger value="progress">{t("fit.tabProgress")}</TabsTrigger>
          </TabsList>

          {/* ROUTINE TAB */}
          <TabsContent value="routine" className="space-y-6">
            {!routine ? (
              <div className="card-surface p-8 text-center">
                <Sparkles className="h-10 w-10 mx-auto text-primary mb-4" />
                <h3 className="font-heading text-lg font-semibold">{t("fit.activate")}</h3>
                <p className="text-sm text-muted-foreground mt-2 mb-6">{t("fit.subtitle")}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md mx-auto mb-6">
                  <div>
                    <Label className="text-xs">{t("fit.daysWeek")}</Label>
                    <Select value={String(diasSemana)} onValueChange={v => setDiasSemana(Number(v))}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {[2, 3, 4, 5, 6].map(n => <SelectItem key={n} value={String(n)}>{n} {t("fit.daysWeek")}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">{t("fit.sessionDuration")}</Label>
                    <Select value={String(duracionMin)} onValueChange={v => setDuracionMin(Number(v))}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {[15, 20, 30, 45, 60, 90].map(n => <SelectItem key={n} value={String(n)}>{n} {t("fit.minutes")}{n <= 20 ? ` · ${t("fit.express")}` : ""}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button onClick={handleGenerate} disabled={generating} className="bg-primary text-primary-foreground">
                  {generating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t("fit.generating")}</> : <><Sparkles className="h-4 w-4 mr-2" />{t("fit.activate")}</>}
                </Button>
              </div>
            ) : (
              <>
                {/* Header rutina */}
                <div className="card-surface p-5">
                  <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <Badge variant="secondary" className="capitalize"><Target className="h-3 w-3 mr-1" />{routine.objetivo}</Badge>
                        <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />{plan?.duracion_min_sesion || duracionMin} {t("fit.minutes")}</Badge>
                        <Badge variant="outline">{routine.dias_semana} {t("fit.daysWeek")}</Badge>
                        <Badge variant="outline">{routine.duracion_dias} {t("fit.days")}</Badge>
                      </div>
                      {plan?.resumen && !summaryIsJsonBlob && <p className="text-sm text-muted-foreground">{plan.resumen}</p>}
                    </div>
                  </div>
                  {/* Regenerar con nuevos parámetros */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-border/50">
                    <div>
                      <Label className="text-xs">{t("fit.daysWeek")}</Label>
                      <Select value={String(diasSemana)} onValueChange={v => setDiasSemana(Number(v))}>
                        <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {[2, 3, 4, 5, 6].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">{t("fit.sessionDuration")}</Label>
                      <Select value={String(duracionMin)} onValueChange={v => setDuracionMin(Number(v))}>
                        <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {[15, 20, 30, 45, 60, 90].map(n => <SelectItem key={n} value={String(n)}>{n} min{n <= 20 ? ` · ${t("fit.express")}` : ""}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-end">
                      <Button variant="outline" size="sm" onClick={handleGenerate} disabled={generating} className="w-full h-9">
                        {generating ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : <Sparkles className="h-3 w-3 mr-2" />}
                        {t("fit.regenerate")}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Tabs por semana */}
                {plan?.semanas?.length > 0 && (
                  <Tabs value={activeWeek} onValueChange={setActiveWeek}>
                    <TabsList className="w-full grid" style={{ gridTemplateColumns: `repeat(${plan.semanas.length}, 1fr)` }}>
                      {plan.semanas.map((s: any) => (
                        <TabsTrigger key={s.numero} value={String(s.numero)} className="text-xs sm:text-sm">
                          {t("fit.week")} {s.numero}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                    {plan.semanas.map((semana: any) => (
                      <TabsContent key={semana.numero} value={String(semana.numero)} className="space-y-3 mt-4">
                        {semana.enfoque && (
                          <p className="text-xs text-muted-foreground italic px-1">→ {semana.enfoque}</p>
                        )}
                        <Accordion type="single" collapsible defaultValue={`s-${semana.numero}-0`} className="space-y-3">
                          {semana.sesiones?.map((ses: any, i: number) => (
                            <AccordionItem
                              key={i}
                              value={`s-${semana.numero}-${i}`}
                              className="card-surface border border-border/60 rounded-xl px-5 data-[state=open]:border-primary/50 data-[state=open]:shadow-[0_0_0_1px_hsl(var(--primary)/0.15)] transition-all"
                            >
                              <AccordionTrigger className="hover:no-underline py-5">
                                <div className="flex flex-1 items-center justify-between gap-4 pr-2">
                                  <div className="flex items-center gap-4 min-w-0">
                                    <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary border border-primary/20">
                                      <span className="text-[9px] font-medium uppercase tracking-wider opacity-70 leading-none">Día</span>
                                      <span className="font-bold text-base leading-tight">{ses.dia}</span>
                                    </div>
                                    <div className="text-left min-w-0">
                                      <p className="font-semibold text-base truncate">{ses.nombre}</p>
                                      <p className="text-xs text-muted-foreground capitalize mt-0.5">
                                        {ses.tipo} · {ses.ejercicios?.length || 0} {t("fit.exercises").toLowerCase()}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="hidden sm:flex items-center gap-2 shrink-0">
                                    <div className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-muted/50 border border-border/40">
                                      <Clock className="h-3 w-3 text-primary" />
                                      <span className="font-medium">{ses.duracion_min}min</span>
                                    </div>
                                    <div className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-muted/50 border border-border/40">
                                      <Flame className="h-3 w-3 text-secondary" />
                                      <span className="font-medium">{ses.kcal_objetivo}kcal</span>
                                    </div>
                                  </div>
                                </div>
                              </AccordionTrigger>
                              <AccordionContent className="pb-5 space-y-5">
                                <div className="flex sm:hidden items-center gap-2 flex-wrap">
                                  <div className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-muted/50 border border-border/40">
                                    <Clock className="h-3 w-3 text-primary" /><span className="font-medium">{ses.duracion_min}min</span>
                                  </div>
                                  <div className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-muted/50 border border-border/40">
                                    <Flame className="h-3 w-3 text-secondary" /><span className="font-medium">{ses.kcal_objetivo}kcal</span>
                                  </div>
                                </div>

                                {ses.calentamiento?.length > 0 && (
                                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                      <Zap className="h-4 w-4 text-primary" />
                                      <p className="text-xs font-bold uppercase tracking-wider text-primary">{t("fit.warmup")}</p>
                                    </div>
                                    <ul className="text-sm text-foreground/80 space-y-1">
                                      {ses.calentamiento.map((c: string, k: number) => (
                                        <li key={k} className="flex gap-2"><span className="text-primary">•</span>{c}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}

                                {ses.ejercicios?.length > 0 && (
                                  <div>
                                    <div className="flex items-center gap-2 mb-3">
                                      <Dumbbell className="h-4 w-4 text-primary" />
                                      <p className="text-xs font-bold uppercase tracking-wider text-primary">{t("fit.exercises")} ({ses.ejercicios.length})</p>
                                    </div>
                                    <div className="space-y-3">
                                      {ses.ejercicios.map((ej: any, j: number) => {
                                        const muscle = ej.musculo_principal || "full_body";
                                        return (
                                          <div key={j} className="rounded-xl border border-border bg-card hover:border-primary/40 transition-colors overflow-hidden">
                                            <div className="p-4">
                                              <div className="flex items-start justify-between gap-3 mb-3">
                                                <div className="flex items-start gap-3 flex-1 min-w-0">
                                                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary text-sm font-bold">
                                                    {j + 1}
                                                  </div>
                                                  <div className="flex-1 min-w-0">
                                                    <p className="font-semibold text-base leading-tight">{ej.nombre}</p>
                                                    <div className="flex flex-wrap gap-1.5 mt-2">
                                                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/15 text-primary capitalize font-medium">
                                                        {muscle.replace(/_/g, " ")}
                                                      </span>
                                                      {ej.equipo && (
                                                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground capitalize font-medium">
                                                          {ej.equipo.replace(/_/g, " ")}
                                                        </span>
                                                      )}
                                                    </div>
                                                  </div>
                                                </div>
                                              </div>

                                              {/* Stats grid: series · reps · descanso */}
                                              <div className="grid grid-cols-3 gap-2 mb-3">
                                                <div className="rounded-lg bg-muted/40 border border-border/40 p-2 text-center">
                                                  <div className="flex items-center justify-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">
                                                    <Repeat className="h-2.5 w-2.5" /> Series
                                                  </div>
                                                  <p className="font-bold text-base text-foreground">{ej.series}</p>
                                                </div>
                                                <div className="rounded-lg bg-muted/40 border border-border/40 p-2 text-center">
                                                  <div className="flex items-center justify-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">
                                                    <Target className="h-2.5 w-2.5" /> Reps
                                                  </div>
                                                  <p className="font-bold text-base text-foreground">{ej.reps}</p>
                                                </div>
                                                <div className="rounded-lg bg-muted/40 border border-border/40 p-2 text-center">
                                                  <div className="flex items-center justify-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">
                                                    <Timer className="h-2.5 w-2.5" /> {t("fit.rest")}
                                                  </div>
                                                  <p className="font-bold text-base text-foreground">{ej.descanso_seg || 60}s</p>
                                                </div>
                                              </div>

                                              {ej.descripcion && (
                                                <p className="text-xs text-muted-foreground leading-relaxed mb-3 pl-1 border-l-2 border-primary/30 pl-3">
                                                  {ej.descripcion}
                                                </p>
                                              )}

                                              <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => setDemoExercise({ nombre: ej.nombre, descripcion: ej.descripcion, musculo: muscle, equipo: ej.equipo })}
                                                className="w-full h-9 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors"
                                              >
                                                <Play className="h-3.5 w-3.5 mr-2 fill-current" />
                                                {t("fit.watchDemo")}
                                              </Button>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}

                                {ses.enfriamiento?.length > 0 && (
                                  <div className="rounded-lg border border-border/60 bg-muted/20 p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                      <span className="text-base">🧘</span>
                                      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t("fit.cooldown")}</p>
                                    </div>
                                    <ul className="text-sm text-foreground/70 space-y-1">
                                      {ses.enfriamiento.map((c: string, k: number) => (
                                        <li key={k} className="flex gap-2"><span className="text-muted-foreground">•</span>{c}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}

                                {ses.ajuste_macros && (
                                  <div className="rounded-lg p-4 bg-secondary/10 border border-secondary/40">
                                    <div className="flex items-start gap-2">
                                      <span className="text-base">🥗</span>
                                      <div>
                                        <p className="text-xs font-bold uppercase tracking-wider text-secondary mb-1">{t("fit.macroAdjust")}</p>
                                        <p className="text-sm text-foreground/80">{ses.ajuste_macros}</p>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </AccordionContent>
                            </AccordionItem>
                          ))}
                        </Accordion>
                      </TabsContent>
                    ))}
                  </Tabs>
                )}

                {plan?.consejos_generales?.length > 0 && (
                  <div className="card-surface p-5">
                    <h3 className="font-heading font-semibold mb-2 text-sm">{t("fit.tips")}</h3>
                    <ul className="space-y-1 text-xs text-muted-foreground">
                      {plan.consejos_generales.map((c: string, i: number) => <li key={i}>• {c}</li>)}
                    </ul>
                  </div>
                )}
              </>
            )}
          </TabsContent>


          {/* SESSIONS TAB */}
          <TabsContent value="sessions" className="space-y-6">
            <div className="card-surface p-5">
              <h3 className="font-heading font-semibold mb-3 flex items-center gap-2"><Plus className="h-4 w-4" />{t("fit.logSession")}</h3>
              <p className="text-xs text-muted-foreground mb-3">{t("fit.uploadAnyDevice")}</p>

              <div className="mb-4">
                <Label className="text-xs">{t("fit.uploadScreenshot")}</Label>
                <Input type="file" accept="image/*" onChange={e => handleSessionFileChange(e.target.files?.[0] || null)} disabled={analyzing} className="mt-1" />
                {analyzing && <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" />{t("fit.analyzing")}</p>}
              </div>

              <p className="text-[11px] text-muted-foreground mb-2">{t("fit.manualHint")}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                <div>
                  <Label className="text-xs">{t("fit.type")} *</Label>
                  <Select value={sessionForm.tipo} onValueChange={v => setSessionForm(s => ({ ...s, tipo: v }))}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder={t("fit.selectType")} /></SelectTrigger>
                    <SelectContent className="max-h-72">
                      {ACTIVITY_TYPES.map(k => (
                        <SelectItem key={k} value={k}>{t(`type.${k}`)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">{t("fit.location")}</Label>
                  <Select value={sessionForm.ubicacion} onValueChange={v => setSessionForm(s => ({ ...s, ubicacion: v }))}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="indoor">{t("fit.indoor")}</SelectItem>
                      <SelectItem value="outdoor">{t("fit.outdoor")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">{t("fit.intensity")}</Label>
                  <Select value={sessionForm.intensidad} onValueChange={v => setSessionForm(s => ({ ...s, intensidad: v }))}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="baja">{t("fit.intLow")}</SelectItem>
                      <SelectItem value="moderada">{t("fit.intModerate")}</SelectItem>
                      <SelectItem value="alta">{t("fit.intHigh")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">{t("fit.device")}</Label>
                  <Input value={sessionForm.dispositivo} onChange={e => setSessionForm(s => ({ ...s, dispositivo: e.target.value }))} placeholder="Apple Watch, Fitbit..." className="mt-1" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-3">
                <div><Label className="text-xs">{t("fit.minutes")}</Label><Input type="number" value={sessionForm.duracion_min} onChange={e => setSessionForm(s => ({ ...s, duracion_min: e.target.value }))} className="mt-1" /></div>
                <div><Label className="text-xs">{t("fit.kcal")}</Label><Input type="number" value={sessionForm.kcal} onChange={e => setSessionForm(s => ({ ...s, kcal: e.target.value }))} className="mt-1" /></div>
                <div><Label className="text-xs">{t("fit.km")}</Label><Input type="number" step="0.01" value={sessionForm.distancia_km} onChange={e => setSessionForm(s => ({ ...s, distancia_km: e.target.value }))} className="mt-1" /></div>
              </div>
              <Textarea placeholder={t("fit.notes")} value={sessionForm.notas} onChange={e => setSessionForm(s => ({ ...s, notas: e.target.value }))} className="mb-3" />
              <Button onClick={handleSaveSession} disabled={savingSession} className="bg-primary text-primary-foreground">
                {savingSession ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}{t("fit.save")}
              </Button>
            </div>

            <div className="card-surface p-5">
              <h3 className="font-heading font-semibold mb-3 text-sm flex items-center gap-2"><Watch className="h-4 w-4" />{t("fit.deviceConnect")}</h3>
              <p className="text-xs text-muted-foreground">{t("fit.deviceComingSoon")}</p>
              <div className="mt-3 flex gap-2 flex-wrap">
                {["Apple Watch", "Fitbit", "Garmin", "Strava"].map(d => (
                  <span key={d} className="rounded-full border border-border bg-muted/50 px-3 py-1 text-[11px] text-muted-foreground">{d}</span>
                ))}
              </div>
            </div>

            {sessions.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">{t("fit.noSessions")}</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {sessions.map(s => (
                  <div key={s.id} className="card-surface p-4 group relative">
                    <button onClick={() => deleteSession(s.id)} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition"><Trash2 className="h-3 w-3" /></button>
                    {s.foto_url && <img src={s.foto_url} alt="" className="w-full h-32 object-cover rounded mb-2" />}
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-primary">{s.tipo || "—"}</span>
                      <span className="text-[11px] text-muted-foreground">{new Date(s.fecha).toLocaleDateString(lang === "es" ? "es-ES" : "en-US")}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                      {s.duracion_min && <span>{s.duracion_min} {t("fit.minutes")}</span>}
                      {s.kcal && <span>{s.kcal} {t("fit.kcal")}</span>}
                      {s.distancia_km && <span>{s.distancia_km} {t("fit.km")}</span>}
                      {s.dispositivo && <span>· {s.dispositivo}</span>}
                    </div>
                    {s.notas && <p className="text-[11px] text-muted-foreground mt-2 line-clamp-2">{s.notas}</p>}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* PROGRESS TAB */}
          <TabsContent value="progress" className="space-y-6">
            <div className="card-surface p-5">
              <h3 className="font-heading font-semibold mb-3 flex items-center gap-2"><Camera className="h-4 w-4" />{t("fit.uploadProgress")}</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                <div className="col-span-2 sm:col-span-1">
                  <Label className="text-xs">{t("fit.photoType")}</Label>
                  <Select value={photoForm.tipo} onValueChange={v => setPhotoForm(p => ({ ...p, tipo: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="inicio">{t("fit.photoStart")}</SelectItem>
                      <SelectItem value="progreso">{t("fit.photoProgress")}</SelectItem>
                      <SelectItem value="actual">{t("fit.photoCurrent")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label className="text-xs">{t("fit.weight")}</Label><Input type="number" step="0.1" value={photoForm.peso_kg} onChange={e => setPhotoForm(p => ({ ...p, peso_kg: e.target.value }))} /></div>
                <div><Label className="text-xs">{t("fit.waist")}</Label><Input type="number" step="0.1" value={photoForm.cintura_cm} onChange={e => setPhotoForm(p => ({ ...p, cintura_cm: e.target.value }))} /></div>
                <div className="col-span-2 sm:col-span-4">
                  <Label className="text-xs">Foto</Label>
                  <Input type="file" accept="image/*" onChange={e => setPhotoFile(e.target.files?.[0] || null)} />
                </div>
              </div>
              <Textarea placeholder={t("fit.notes")} value={photoForm.notas} onChange={e => setPhotoForm(p => ({ ...p, notas: e.target.value }))} className="mb-3" />
              <Button onClick={handleSavePhoto} disabled={savingPhoto || !photoFile} className="bg-primary text-primary-foreground">
                {savingPhoto ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ImageIcon className="h-4 w-4 mr-2" />}{t("fit.save")}
              </Button>
            </div>

            {photos.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">{t("fit.noPhotos")}</p>
            ) : (
              <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
                {photos.map(p => (
                  <div key={p.id} className="card-surface p-2 group relative">
                    <button onClick={() => deletePhoto(p.id)} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-white bg-destructive/80 rounded p-1 transition z-10"><Trash2 className="h-3 w-3" /></button>
                    <img src={p.foto_url} alt="" className="w-full aspect-square object-cover rounded" />
                    <div className="p-2">
                      <span className="text-[10px] uppercase tracking-wider text-primary font-medium">{p.tipo}</span>
                      <p className="text-[11px] text-muted-foreground">{new Date(p.fecha).toLocaleDateString(lang === "es" ? "es-ES" : "en-US")}</p>
                      <div className="mt-1 flex gap-2 text-[10px] text-muted-foreground">
                        {p.peso_kg && <span>{p.peso_kg}kg</span>}
                        {p.cintura_cm && <span>{p.cintura_cm}cm</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Exercise demo modal with embedded YouTube */}
      <Dialog open={!!demoExercise} onOpenChange={(o) => !o && setDemoExercise(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Play className="h-4 w-4 text-primary fill-current" />
              {demoExercise?.nombre}
            </DialogTitle>
            <DialogDescription className="flex flex-wrap gap-2 pt-2">
              {demoExercise?.musculo && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/15 text-primary capitalize font-medium">
                  {demoExercise.musculo.replace(/_/g, " ")}
                </span>
              )}
              {demoExercise?.equipo && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground capitalize font-medium">
                  {demoExercise.equipo.replace(/_/g, " ")}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          {demoExercise && (
            <div className="space-y-4">
              <div className="aspect-video w-full rounded-lg overflow-hidden bg-muted border border-border">
                <iframe
                  src={`https://www.youtube.com/embed?listType=search&list=${encodeURIComponent(`how to do ${demoExercise.nombre} proper form technique`)}`}
                  title={demoExercise.nombre}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
              {demoExercise.descripcion && (
                <p className="text-sm text-muted-foreground leading-relaxed">{demoExercise.descripcion}</p>
              )}
              <div className="flex gap-2">
                <a
                  href={`https://musclewiki.com/Search?q=${encodeURIComponent(demoExercise.nombre)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 inline-flex items-center justify-center gap-2 text-xs px-3 py-2 rounded-md border border-border hover:border-primary hover:text-primary transition"
                >
                  <ExternalLink className="h-3 w-3" /> MuscleWiki
                </a>
                <a
                  href={`https://www.youtube.com/results?search_query=${encodeURIComponent(`how to ${demoExercise.nombre} proper form`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 inline-flex items-center justify-center gap-2 text-xs px-3 py-2 rounded-md border border-border hover:border-primary hover:text-primary transition"
                >
                  <ExternalLink className="h-3 w-3" /> YouTube
                </a>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Fit;
