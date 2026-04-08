import { useState, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Minus, Plus, Upload, Camera, Image, X, Check } from "lucide-react";
import Logo from "@/components/Logo";
import { toast } from "sonner";
import {
  proteinasAnimales, proteinasVegetales, lacteos, granos, vegetales, frutas, condimentos,
  goals, alergias, dietas, salud, preferenciasComida, tiemposCocina, equipamiento, mealTimes,
} from "@/lib/onboarding-data";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import LangSwitcher from "@/components/LangSwitcher";

const BODY_GOALS = ["perder", "musculo", "mantener", "rendimiento"];

const Onboarding = () => {
  const navigate = useNavigate();
  const { t, lang } = useI18n();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [recognizing, setRecognizing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [recognizedIngredients, setRecognizedIngredients] = useState<string[]>([]);
  const [recognitionNotes, setRecognitionNotes] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [inputMethod, setInputMethod] = useState("");
  const [manualIngredients, setManualIngredients] = useState("");
  const [selectedFoods, setSelectedFoods] = useState<string[]>([]);
  const [personas, setPersonas] = useState(2);
  const [selectedMeals, setSelectedMeals] = useState<string[]>(["Desayuno", "Almuerzo", "Cena"]);
  const [selectedGoal, setSelectedGoal] = useState("");
  const [restrictions, setRestrictions] = useState<string[]>([]);
  const [cookingTime, setCookingTime] = useState("");
  const [skillLevel, setSkillLevel] = useState("Principiante");
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([]);
  const [selectedDays, setSelectedDays] = useState("28");

  // Body metrics state
  const [bodyWeight, setBodyWeight] = useState("");
  const [bodyHeight, setBodyHeight] = useState("");
  const [bodyAge, setBodyAge] = useState("");
  const [bodySex, setBodySex] = useState<"male" | "female">("male");
  const [activityLevel, setActivityLevel] = useState("moderate");
  const [goalWeight, setGoalWeight] = useState("");
  const [dietType, setDietType] = useState<"kcal" | "portion">("kcal");

  // Dynamic steps: insert body step after goal if goal is body-related
  const needsBodyStep = BODY_GOALS.includes(selectedGoal);
  const steps = useMemo(() => {
    const base = ["input", "foods", "household", "goal"];
    if (needsBodyStep) base.push("body");
    base.push("restrictions", "kitchen", "days", "summary");
    return base;
  }, [needsBodyStep]);
  const totalSteps = steps.length;
  const currentStepId = steps[step - 1];

  // BMI calculation
  const bmi = useMemo(() => {
    const w = parseFloat(bodyWeight);
    const h = parseFloat(bodyHeight) / 100;
    if (w > 0 && h > 0) return w / (h * h);
    return null;
  }, [bodyWeight, bodyHeight]);

  const bmiCategory = useMemo(() => {
    if (!bmi) return "";
    if (bmi < 18.5) return t("onboarding.body.bmiUnderweight");
    if (bmi < 25) return t("onboarding.body.bmiNormal");
    if (bmi < 30) return t("onboarding.body.bmiOverweight");
    return t("onboarding.body.bmiObese");
  }, [bmi, t]);

  const bmiColor = useMemo(() => {
    if (!bmi) return "";
    if (bmi < 18.5) return "text-blue-500";
    if (bmi < 25) return "text-green-500";
    if (bmi < 30) return "text-yellow-500";
    return "text-red-500";
  }, [bmi]);

  // TDEE (Mifflin-St Jeor)
  const tdee = useMemo(() => {
    const w = parseFloat(bodyWeight);
    const h = parseFloat(bodyHeight);
    const a = parseFloat(bodyAge);
    if (!w || !h || !a) return null;
    let bmr = bodySex === "male"
      ? 10 * w + 6.25 * h - 5 * a + 5
      : 10 * w + 6.25 * h - 5 * a - 161;
    const multipliers: Record<string, number> = {
      sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, veryActive: 1.9,
    };
    return Math.round(bmr * (multipliers[activityLevel] || 1.55));
  }, [bodyWeight, bodyHeight, bodyAge, bodySex, activityLevel]);

  const inputMethods = [
    { id: "foto-recibo", label: t("onboarding.step1.receipt"), emoji: "🧾" },
    { id: "foto-nevera", label: t("onboarding.step1.fridge"), emoji: "🧊" },
    { id: "lista-manual", label: t("onboarding.step1.manual"), emoji: "📝" },
    { id: "ayuda-comprar", label: t("onboarding.step1.help"), emoji: "🛒" },
  ];

  const dayOptions = [
    { id: "auto", label: t("onboarding.step7.auto"), emoji: "✨" },
    { id: "7", label: `7 ${t("onboarding.step7.days")}`, emoji: "📅" },
    { id: "14", label: `14 ${t("onboarding.step7.days")}`, emoji: "📅" },
    { id: "21", label: `21 ${t("onboarding.step7.days")}`, emoji: "📅" },
    { id: "28", label: `28 ${t("onboarding.step7.days")}`, emoji: "📅" },
  ];

  const localGoals = goals.map(g => ({ ...g, label: t(`data.goal.${g.id}`) }));
  const localTimes = tiemposCocina.map(tc => ({ ...tc, label: t(`data.time.${tc.id}`) }));
  const skillLevels = [
    { value: "Principiante", label: t("data.skill.beginner") },
    { value: "Básico", label: t("data.skill.basic") },
    { value: "Intermedio", label: t("data.skill.intermediate") },
    { value: "Avanzado", label: t("data.skill.advanced") },
  ];
  const localMealTimes = mealTimes.map((m, i) => {
    const keys = ["breakfast", "midmorning", "lunch", "snack", "dinner", "nightsnack"];
    return { value: m, label: t(`data.meal.${keys[i]}`) };
  });

  const activityOptions = [
    { id: "sedentary", label: t("onboarding.body.sedentary"), emoji: "🪑" },
    { id: "light", label: t("onboarding.body.light"), emoji: "🚶" },
    { id: "moderate", label: t("onboarding.body.moderate"), emoji: "🏃" },
    { id: "active", label: t("onboarding.body.active"), emoji: "🏋️" },
    { id: "veryActive", label: t("onboarding.body.veryActive"), emoji: "⚡" },
  ];

  const toggleItem = (list: string[], setList: React.Dispatch<React.SetStateAction<string[]>>, item: string) => {
    setList(prev => prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]);
  };

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(",")[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error(lang === "en" ? "Image too large (max 10MB)" : "Imagen muy grande (máx 10MB)");
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setRecognizedIngredients([]);
    setRecognitionNotes("");
    setRecognizing(true);

    try {
      const base64 = await fileToBase64(file);
      const { data, error } = await supabase.functions.invoke("recognize-ingredients", {
        body: { image_base64: base64, type: inputMethod, idioma: lang },
      });
      if (error) throw error;
      setRecognizedIngredients(data.ingredientes || []);
      setRecognitionNotes(data.notas || "");
    } catch (err: any) {
      toast.error(lang === "en" ? "Could not recognize ingredients" : "No se pudieron reconocer los ingredientes");
      console.error(err);
    } finally {
      setRecognizing(false);
    }
  };

  const clearPhoto = () => {
    setPreviewUrl(null);
    setRecognizedIngredients([]);
    setRecognitionNotes("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error(t("onboarding.loginRequired")); setLoading(false); return; }

      const prefs = {
        usuario_id: user.id,
        personas,
        comidas: selectedMeals,
        objetivo: selectedGoal,
        restricciones: restrictions,
        tiempo_cocina: cookingTime,
        nivel_culinario: skillLevel,
        equipamiento: selectedEquipment,
      };

      await supabase.from("preferencias").upsert(prefs, { onConflict: "usuario_id" });

      // Save body metrics to profile if provided
      if (needsBodyStep && bodyWeight) {
        const birthYear = bodyAge ? new Date().getFullYear() - parseInt(bodyAge) : null;
        await supabase.from("profiles").update({
          peso_kg: parseFloat(bodyWeight) || null,
          altura_cm: bodyHeight ? parseFloat(bodyHeight) : null,
          fecha_nacimiento: birthYear ? `${birthYear}-01-01` : null,
        }).eq("id", user.id);
      }

      const ingredientes = [...selectedFoods, ...manualIngredients.split("\n").filter(Boolean)].join(", ");
      const diasSolicitados = selectedDays === "auto" ? 28 : parseInt(selectedDays);

      const bodyMetrics = needsBodyStep ? {
        peso_kg: parseFloat(bodyWeight) || null,
        altura_cm: parseFloat(bodyHeight) || null,
        edad: parseInt(bodyAge) || null,
        sexo: bodySex,
        actividad: activityLevel,
        peso_meta: parseFloat(goalWeight) || null,
        tipo_dieta: dietType,
        imc: bmi ? Math.round(bmi * 10) / 10 : null,
        tdee: tdee,
      } : null;

      const { data, error } = await supabase.functions.invoke("generate-plan", {
        body: {
          ingredientes,
          preferencias: prefs,
          usuario_id: user.id,
          dias_solicitados: diasSolicitados,
          idioma: lang,
          medidas_corporales: bodyMetrics,
        },
      });

      if (error) throw error;

      toast.success(t("onboarding.success"));
      navigate(`/plan/${data.plan_id}`);
    } catch (err: any) {
      toast.error(t("onboarding.error") + (err.message || ""));
    } finally {
      setLoading(false);
    }
  };

  const [customInputs, setCustomInputs] = useState<Record<string, string>>({});

  const addCustomItem = (category: string) => {
    const value = (customInputs[category] || "").trim();
    if (!value) return;
    if (!selectedFoods.includes(value)) {
      setSelectedFoods(prev => [...prev, value]);
    }
    setCustomInputs(prev => ({ ...prev, [category]: "" }));
  };

  const FoodCategory = ({ title, items, categoryKey }: { title: string; items: string[]; categoryKey: string }) => (
    <div className="mb-4">
      <h4 className="text-sm font-semibold text-primary mb-2">{title}</h4>
      <div className="flex flex-wrap gap-2">
        {items.map(item => (
          <label key={item} className={`flex items-center gap-2 cursor-pointer rounded-lg border px-3 py-1.5 text-xs transition-colors ${selectedFoods.includes(item) ? "bg-primary/20 border-primary text-primary" : "border-border bg-card text-muted-foreground hover:border-primary/50"}`}>
            <Checkbox checked={selectedFoods.includes(item)} onCheckedChange={() => toggleItem(selectedFoods, setSelectedFoods, item)} className="h-3 w-3" />
            {item}
          </label>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        <Input
          placeholder={`${t("onboarding.step2.addOther")}…`}
          value={customInputs[categoryKey] || ""}
          onChange={e => setCustomInputs(prev => ({ ...prev, [categoryKey]: e.target.value }))}
          onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addCustomItem(categoryKey))}
          className="h-8 text-xs bg-background border-border flex-1"
        />
        <Button size="sm" variant="outline" className="h-8 text-xs px-3" onClick={() => addCustomItem(categoryKey)}>
          <Plus className="h-3 w-3 mr-1" /> {t("onboarding.step2.add")}
        </Button>
      </div>
    </div>
  );

  const TagToggle = ({ items, selected, setSelected }: { items: string[]; selected: string[]; setSelected: React.Dispatch<React.SetStateAction<string[]>> }) => (
    <div className="flex flex-wrap gap-2">
      {items.map(item => (
        <button key={item} onClick={() => toggleItem(selected, setSelected, item)}
          className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${selected.includes(item) ? "bg-primary/20 border-primary text-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}>
          {item}
        </button>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 text-center">
          <div className="flex justify-center mb-4"><LangSwitcher /></div>
          <Logo className="mx-auto" />
          <h1 className="mt-2 font-heading text-xl font-bold">{t("onboarding.title")}</h1>
        </div>

        <div className="mb-8 flex gap-1">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i < step ? "bg-primary" : "bg-border"}`} />
          ))}
        </div>
        <p className="mb-6 text-sm text-muted-foreground text-center">{t("onboarding.step")} {step} {t("onboarding.of")} {totalSteps}</p>

        <div className="card-surface p-6">
          {currentStepId === "input" && (
            <div>
              <h2 className="font-heading text-lg font-bold mb-4">{t("onboarding.step1.title")}</h2>
              <div className="grid grid-cols-2 gap-3 mb-4">
                {inputMethods.map(m => (
                  <button key={m.id} onClick={() => setInputMethod(m.id)}
                    className={`rounded-xl border p-4 text-center transition-colors ${inputMethod === m.id ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/50"}`}>
                    <span className="text-2xl">{m.emoji}</span>
                    <p className="mt-1 text-xs font-medium">{m.label}</p>
                  </button>
                ))}
              </div>
              {(inputMethod === "foto-recibo" || inputMethod === "foto-nevera") && (
                <div className="mt-4 space-y-4">
                  <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handleFileSelect} />
                  <input type="file" ref={cameraInputRef} accept="image/*" capture="environment" className="hidden" onChange={handleFileSelect} />
                  {!previewUrl ? (
                    <div className="rounded-xl border-2 border-dashed border-border p-8 text-center space-y-4">
                      <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">{t("onboarding.step1.upload")}</p>
                      <div className="flex gap-3 justify-center">
                        <Button variant="outline" size="sm" onClick={() => cameraInputRef.current?.click()}>
                          <Camera className="h-4 w-4 mr-1" /> {t("onboarding.step1.camera")}
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                          <Image className="h-4 w-4 mr-1" /> {t("onboarding.step1.gallery")}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="relative rounded-xl overflow-hidden border border-border">
                        <img src={previewUrl} alt="Preview" className="w-full max-h-64 object-cover" />
                        <button onClick={clearPhoto} className="absolute top-2 right-2 rounded-full bg-background/80 p-1.5 hover:bg-background">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      {recognizing && (
                        <div className="flex items-center gap-2 justify-center text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" /> {t("onboarding.step1.analyzing")}
                        </div>
                      )}
                      {recognizedIngredients.length > 0 && (
                        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
                          <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                            <Check className="h-4 w-4" /> {t("onboarding.step1.detected")} ({recognizedIngredients.length})
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {recognizedIngredients.map((ing, i) => (
                              <span key={i} className="rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs text-primary font-medium">{ing}</span>
                            ))}
                          </div>
                          {recognitionNotes && <p className="text-xs text-muted-foreground">{recognitionNotes}</p>}
                          <Button size="sm" variant="outline" onClick={() => {
                            setManualIngredients(prev => {
                              const existing = prev.trim();
                              const newOnes = recognizedIngredients.join("\n");
                              return existing ? `${existing}\n${newOnes}` : newOnes;
                            });
                            toast.success(t("onboarding.step1.added"));
                          }}>
                            {t("onboarding.step1.addAll")}
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
              {(inputMethod === "lista-manual" || inputMethod === "ayuda-comprar") && (
                <Textarea placeholder={t("onboarding.step1.placeholder")} value={manualIngredients} onChange={e => setManualIngredients(e.target.value)} className="mt-4 bg-background border-border min-h-[120px]" />
              )}
            </div>
          )}

          {currentStepId === "foods" && (
            <div className="max-h-[60vh] overflow-y-auto pr-2">
              <h2 className="font-heading text-lg font-bold mb-4">{t("onboarding.step2.title")}</h2>
              <FoodCategory title={t("onboarding.step2.animalProteins")} items={proteinasAnimales} categoryKey="proteinas" />
              <FoodCategory title={t("onboarding.step2.plantProteins")} items={proteinasVegetales} categoryKey="protVeg" />
              <FoodCategory title={t("onboarding.step2.dairy")} items={lacteos} categoryKey="lacteos" />
              <FoodCategory title={t("onboarding.step2.grains")} items={granos} categoryKey="granos" />
              <FoodCategory title={t("onboarding.step2.veggies")} items={vegetales} categoryKey="vegetales" />
              <FoodCategory title={t("onboarding.step2.fruits")} items={frutas} categoryKey="frutas" />
              <FoodCategory title={t("onboarding.step2.spices")} items={condimentos} categoryKey="condimentos" />
            </div>
          )}

          {currentStepId === "household" && (
            <div>
              <h2 className="font-heading text-lg font-bold mb-4">{t("onboarding.step3.title")}</h2>
              <div className="flex items-center justify-center gap-4 mb-8">
                <button onClick={() => setPersonas(Math.max(1, personas - 1))} className="rounded-full border border-border p-2 hover:border-primary"><Minus className="h-5 w-5" /></button>
                <span className="font-heading text-4xl font-bold text-primary">{personas}</span>
                <button onClick={() => setPersonas(Math.min(12, personas + 1))} className="rounded-full border border-border p-2 hover:border-primary"><Plus className="h-5 w-5" /></button>
              </div>
              <h3 className="font-heading text-base font-semibold mb-3">{t("onboarding.step3.meals")}</h3>
              <div className="flex flex-wrap gap-2">
                {localMealTimes.map(meal => (
                  <button key={meal.value} onClick={() => toggleItem(selectedMeals, setSelectedMeals, meal.value)}
                    className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${selectedMeals.includes(meal.value) ? "bg-primary/20 border-primary text-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}>
                    {meal.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {currentStepId === "goal" && (
            <div>
              <h2 className="font-heading text-lg font-bold mb-4">{t("onboarding.step4.title")}</h2>
              <div className="grid grid-cols-2 gap-3">
                {localGoals.map(g => (
                  <button key={g.id} onClick={() => setSelectedGoal(g.id)}
                    className={`rounded-xl border p-4 text-center transition-colors ${selectedGoal === g.id ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/50"}`}>
                    <span className="text-2xl">{g.emoji}</span>
                    <p className="mt-1 text-sm font-medium">{g.label}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {currentStepId === "body" && (
            <div className="space-y-5">
              <div>
                <h2 className="font-heading text-lg font-bold">{t("onboarding.body.title")}</h2>
                <p className="text-xs text-muted-foreground mt-1">{t("onboarding.body.subtitle")}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">{t("onboarding.body.weight")}</label>
                  <Input type="number" value={bodyWeight} onChange={e => setBodyWeight(e.target.value)} placeholder="70" className="mt-1 bg-background border-border" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">{t("onboarding.body.height")}</label>
                  <Input type="number" value={bodyHeight} onChange={e => setBodyHeight(e.target.value)} placeholder="170" className="mt-1 bg-background border-border" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">{t("onboarding.body.age")}</label>
                  <Input type="number" value={bodyAge} onChange={e => setBodyAge(e.target.value)} placeholder="30" className="mt-1 bg-background border-border" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">{t("onboarding.body.sex")}</label>
                  <div className="flex gap-2 mt-1">
                    <button onClick={() => setBodySex("male")} className={`flex-1 rounded-lg border px-2 py-2 text-xs font-medium transition-colors ${bodySex === "male" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}>
                      ♂ {t("onboarding.body.male")}
                    </button>
                    <button onClick={() => setBodySex("female")} className={`flex-1 rounded-lg border px-2 py-2 text-xs font-medium transition-colors ${bodySex === "female" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}>
                      ♀ {t("onboarding.body.female")}
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground">{t("onboarding.body.activity")}</label>
                <div className="grid grid-cols-1 gap-2 mt-2">
                  {activityOptions.map(opt => (
                    <button key={opt.id} onClick={() => setActivityLevel(opt.id)}
                      className={`rounded-lg border px-3 py-2.5 text-left text-xs font-medium transition-colors ${activityLevel === opt.id ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}>
                      {opt.emoji} {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {(selectedGoal === "perder" || selectedGoal === "musculo") && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground">{t("onboarding.body.goalWeight")}</label>
                  <Input type="number" value={goalWeight} onChange={e => setGoalWeight(e.target.value)} placeholder="65" className="mt-1 bg-background border-border" />
                </div>
              )}

              <div>
                <label className="text-xs font-medium text-muted-foreground">{t("onboarding.body.dietType")}</label>
                <div className="flex gap-3 mt-2">
                  <button onClick={() => setDietType("kcal")} className={`flex-1 rounded-xl border p-3 text-center transition-colors ${dietType === "kcal" ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/50"}`}>
                    <span className="text-xl">🔢</span>
                    <p className="mt-1 text-xs font-medium">{t("onboarding.body.byKcal")}</p>
                  </button>
                  <button onClick={() => setDietType("portion")} className={`flex-1 rounded-xl border p-3 text-center transition-colors ${dietType === "portion" ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/50"}`}>
                    <span className="text-xl">⚖️</span>
                    <p className="mt-1 text-xs font-medium">{t("onboarding.body.byPortion")}</p>
                  </button>
                </div>
              </div>

              {(bmi || tdee) && (
                <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-2">
                  {bmi && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">{t("onboarding.body.bmi")}</span>
                      <span className={`text-lg font-bold ${bmiColor}`}>{bmi.toFixed(1)} <span className="text-xs font-normal">({bmiCategory})</span></span>
                    </div>
                  )}
                  {tdee && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">{t("onboarding.body.tdee")}</span>
                      <span className="text-lg font-bold text-primary">{tdee} <span className="text-xs font-normal">{t("onboarding.body.kcalDay")}</span></span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {currentStepId === "restrictions" && (
            <div>
              <h2 className="font-heading text-lg font-bold mb-4">{t("onboarding.step5.title")}</h2>
              <h3 className="text-sm font-semibold text-primary mb-2">{t("onboarding.step5.allergies")}</h3>
              <TagToggle items={alergias} selected={restrictions} setSelected={setRestrictions} />
              <h3 className="text-sm font-semibold text-primary mb-2 mt-4">{t("onboarding.step5.diets")}</h3>
              <TagToggle items={dietas} selected={restrictions} setSelected={setRestrictions} />
              <h3 className="text-sm font-semibold text-primary mb-2 mt-4">{t("onboarding.step5.health")}</h3>
              <TagToggle items={salud} selected={restrictions} setSelected={setRestrictions} />
              <h3 className="text-sm font-semibold text-primary mb-2 mt-4">{t("onboarding.step5.prefs")}</h3>
              <TagToggle items={preferenciasComida} selected={restrictions} setSelected={setRestrictions} />
            </div>
          )}

          {currentStepId === "kitchen" && (
            <div>
              <h2 className="font-heading text-lg font-bold mb-4">{t("onboarding.step6.title")}</h2>
              <h3 className="text-sm font-semibold text-primary mb-2">{t("onboarding.step6.time")}</h3>
              <div className="grid grid-cols-2 gap-3 mb-4">
                {localTimes.map(tc => (
                  <button key={tc.id} onClick={() => setCookingTime(tc.id)}
                    className={`rounded-xl border p-3 text-center transition-colors ${cookingTime === tc.id ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/50"}`}>
                    <span className="text-xl">{tc.emoji}</span>
                    <p className="mt-1 text-xs font-medium">{tc.label}</p>
                  </button>
                ))}
              </div>
              <h3 className="text-sm font-semibold text-primary mb-2">{t("onboarding.step6.level")}</h3>
              <select value={skillLevel} onChange={e => setSkillLevel(e.target.value)} className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground">
                {skillLevels.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
              <h3 className="text-sm font-semibold text-primary mb-2 mt-4">{t("onboarding.step6.equipment")}</h3>
              <div className="flex flex-wrap gap-2">
                {equipamiento.map(eq => (
                  <button key={eq} onClick={() => toggleItem(selectedEquipment, setSelectedEquipment, eq)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${selectedEquipment.includes(eq) ? "bg-primary/20 border-primary text-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}>
                    {eq}
                  </button>
                ))}
              </div>
            </div>
          )}

          {currentStepId === "days" && (
            <div>
              <h2 className="font-heading text-lg font-bold mb-4">{t("onboarding.step7.title")}</h2>
              <div className="grid grid-cols-2 gap-3 mb-4">
                {dayOptions.map(opt => (
                  <button key={opt.id} onClick={() => setSelectedDays(opt.id)}
                    className={`rounded-xl border p-4 text-center transition-colors ${selectedDays === opt.id ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/50"}`}>
                    <span className="text-xl">{opt.emoji}</span>
                    <p className="mt-1 text-sm font-medium">{opt.label}</p>
                  </button>
                ))}
              </div>
              <div className="card-surface p-4 border-primary/30 text-center">
                <p className="text-sm text-muted-foreground">{t("onboarding.step7.based")}</p>
                <p className="mt-1 font-heading text-lg font-bold text-primary">
                  {t("onboarding.step7.upTo")} {(selectedDays === "auto" ? 28 : parseInt(selectedDays)) * selectedMeals.length} {t("onboarding.step7.uniqueRecipes")}
                </p>
              </div>
            </div>
          )}

          {currentStepId === "summary" && (
            <div>
              <h2 className="font-heading text-lg font-bold mb-4">{t("onboarding.step8.title")}</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between border-b border-border pb-2"><span className="text-muted-foreground">{t("onboarding.step8.people")}</span><span>{personas}</span></div>
                <div className="flex justify-between border-b border-border pb-2"><span className="text-muted-foreground">{t("onboarding.step8.meals")}</span><span>{selectedMeals.join(", ")}</span></div>
                <div className="flex justify-between border-b border-border pb-2"><span className="text-muted-foreground">{t("onboarding.step8.goal")}</span><span>{localGoals.find(g => g.id === selectedGoal)?.label || "—"}</span></div>
                {needsBodyStep && bodyWeight && (
                  <>
                    <div className="flex justify-between border-b border-border pb-2"><span className="text-muted-foreground">{t("onboarding.step8.weight")}</span><span>{bodyWeight} kg</span></div>
                    <div className="flex justify-between border-b border-border pb-2"><span className="text-muted-foreground">{t("onboarding.step8.heightLabel")}</span><span>{bodyHeight} cm</span></div>
                    {bmi && <div className="flex justify-between border-b border-border pb-2"><span className="text-muted-foreground">{t("onboarding.step8.bmi")}</span><span className={bmiColor}>{bmi.toFixed(1)} ({bmiCategory})</span></div>}
                    {goalWeight && <div className="flex justify-between border-b border-border pb-2"><span className="text-muted-foreground">{t("onboarding.step8.goalWeight")}</span><span>{goalWeight} kg</span></div>}
                    {tdee && <div className="flex justify-between border-b border-border pb-2"><span className="text-muted-foreground">TDEE</span><span>{tdee} kcal/día</span></div>}
                    <div className="flex justify-between border-b border-border pb-2"><span className="text-muted-foreground">{t("onboarding.step8.dietType")}</span><span>{dietType === "kcal" ? t("onboarding.body.byKcal") : t("onboarding.body.byPortion")}</span></div>
                  </>
                )}
                <div className="flex justify-between border-b border-border pb-2"><span className="text-muted-foreground">{t("onboarding.step8.restrictions")}</span><span>{restrictions.join(", ") || t("common.none")}</span></div>
                <div className="flex justify-between border-b border-border pb-2"><span className="text-muted-foreground">{t("onboarding.step8.time")}</span><span>{localTimes.find(tc => tc.id === cookingTime)?.label || "—"}</span></div>
                <div className="flex justify-between border-b border-border pb-2"><span className="text-muted-foreground">{t("onboarding.step8.level")}</span><span>{skillLevels.find(l => l.value === skillLevel)?.label}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">{t("onboarding.step8.equipment")}</span><span>{selectedEquipment.join(", ") || "—"}</span></div>
              </div>
              {!loading ? (
                <Button onClick={handleGenerate} className="w-full mt-6 bg-primary text-primary-foreground font-heading font-semibold h-12">
                  {t("onboarding.generate")} {selectedDays === "auto" ? "28" : selectedDays} {t("onboarding.step7.days")}
                </Button>
              ) : (
                <div className="mt-6 text-center">
                  <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
                  <p className="mt-3 text-sm text-muted-foreground animate-pulse-glow">{t("onboarding.generating")}</p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-between">
          {step > 1 ? (
            <Button variant="ghost" onClick={() => setStep(s => s - 1)} className="text-muted-foreground">{t("common.prev")}</Button>
          ) : <div />}
          {step < totalSteps && (
            <Button onClick={() => setStep(s => s + 1)} className="bg-primary text-primary-foreground">{t("common.next")}</Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
