import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Dumbbell, Plus, Sparkles, Image as ImageIcon, Watch, Camera, Trash2, ArrowLeft, Lock } from "lucide-react";
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

const Fit = () => {
  const navigate = useNavigate();
  const { t, lang } = useI18n();
  const { user, loading, hasFitAccess, isMonthly, isAdmin } = useAuth();

  const [routine, setRoutine] = useState<Routine | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [diasSemana, setDiasSemana] = useState(3);

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
    const [{ data: r }, { data: s }, { data: p }] = await Promise.all([
      supabase.from("rutinas_fit").select("*").eq("usuario_id", user!.id).eq("activa", true).order("creado_en", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("sesiones_entrenamiento").select("*").eq("usuario_id", user!.id).order("fecha", { ascending: false }).limit(50),
      supabase.from("fotos_progreso").select("*").eq("usuario_id", user!.id).order("fecha", { ascending: false }).limit(50),
    ]);
    setRoutine(r as Routine | null);
    setSessions((s as Session[]) || []);
    setPhotos((p as ProgressPhoto[]) || []);
    setLoadingData(false);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-routine", {
        body: { dias_semana: diasSemana, duracion_dias: 28, lang },
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

  const plan = routine?.plan_json;

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
                <div className="flex items-center justify-center gap-3 mb-4">
                  <Label className="text-xs">{t("fit.daysWeek")}:</Label>
                  <Select value={String(diasSemana)} onValueChange={v => setDiasSemana(Number(v))}>
                    <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[2, 3, 4, 5, 6].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleGenerate} disabled={generating} className="bg-primary text-primary-foreground">
                  {generating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t("fit.generating")}</> : <><Sparkles className="h-4 w-4 mr-2" />{t("fit.activate")}</>}
                </Button>
              </div>
            ) : (
              <>
                <div className="card-surface p-5 flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">{t("fit.duration")}: {routine.duracion_dias} días • {routine.dias_semana} {t("fit.daysWeek")}</p>
                    {plan?.resumen && <p className="text-sm mt-1">{plan.resumen}</p>}
                  </div>
                  <Button variant="outline" size="sm" onClick={handleGenerate} disabled={generating}>
                    {generating ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : <Sparkles className="h-3 w-3 mr-2" />}
                    {t("fit.regenerate")}
                  </Button>
                </div>

                {plan?.semanas?.map((semana: any) => (
                  <div key={semana.numero} className="card-surface p-5">
                    <h3 className="font-heading font-semibold mb-3">{t("fit.week")} {semana.numero} {semana.enfoque && <span className="text-xs text-muted-foreground font-normal">— {semana.enfoque}</span>}</h3>
                    <div className="grid gap-3 md:grid-cols-2">
                      {semana.sesiones?.map((ses: any, i: number) => (
                        <div key={i} className="rounded-lg border border-border/50 p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium text-primary">Día {ses.dia} • {ses.tipo}</span>
                            <span className="text-xs text-muted-foreground">{ses.duracion_min} {t("fit.minutes")} · {ses.kcal_objetivo} {t("fit.kcal")}</span>
                          </div>
                          <p className="font-medium text-sm">{ses.nombre}</p>
                          {ses.calentamiento?.length > 0 && (
                            <p className="text-[11px] text-muted-foreground mt-1"><strong>{t("fit.warmup")}:</strong> {ses.calentamiento.join(", ")}</p>
                          )}
                          {ses.ejercicios?.length > 0 && (
                            <ul className="mt-2 space-y-0.5 text-[11px]">
                              {ses.ejercicios.map((ej: any, j: number) => (
                                <li key={j}>• {ej.nombre} — {ej.series}×{ej.reps} {ej.descanso_seg && `(${ej.descanso_seg}s)`}</li>
                              ))}
                            </ul>
                          )}
                          {ses.ajuste_macros && (
                            <p className="text-[11px] mt-2 p-2 rounded bg-secondary/10 text-secondary"><strong>{t("fit.macroAdjust")}:</strong> {ses.ajuste_macros}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

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

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
                <div><Label className="text-xs">{t("fit.type")}</Label><Input value={sessionForm.tipo} onChange={e => setSessionForm(s => ({ ...s, tipo: e.target.value }))} placeholder="correr, fuerza..." /></div>
                <div><Label className="text-xs">{t("fit.minutes")}</Label><Input type="number" value={sessionForm.duracion_min} onChange={e => setSessionForm(s => ({ ...s, duracion_min: e.target.value }))} /></div>
                <div><Label className="text-xs">{t("fit.kcal")}</Label><Input type="number" value={sessionForm.kcal} onChange={e => setSessionForm(s => ({ ...s, kcal: e.target.value }))} /></div>
                <div><Label className="text-xs">{t("fit.km")}</Label><Input type="number" step="0.01" value={sessionForm.distancia_km} onChange={e => setSessionForm(s => ({ ...s, distancia_km: e.target.value }))} /></div>
                <div className="col-span-2"><Label className="text-xs">{t("fit.device")}</Label><Input value={sessionForm.dispositivo} onChange={e => setSessionForm(s => ({ ...s, dispositivo: e.target.value }))} placeholder="Apple Watch, Fitbit..." /></div>
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
    </div>
  );
};

export default Fit;
