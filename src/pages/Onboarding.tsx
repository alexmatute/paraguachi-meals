import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ChefHat, Loader2, Minus, Plus, Upload, Camera, Image, X, Check } from "lucide-react";
import { toast } from "sonner";
import {
  proteinasAnimales, proteinasVegetales, lacteos, granos, vegetales, frutas, condimentos,
  goals, alergias, dietas, salud, preferenciasComida, tiemposCocina, equipamiento, mealTimes,
} from "@/lib/onboarding-data";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import LangSwitcher from "@/components/LangSwitcher";

const TOTAL_STEPS = 8;

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

      const ingredientes = [...selectedFoods, ...manualIngredients.split("\n").filter(Boolean)].join(", ");
      const diasSolicitados = selectedDays === "auto" ? 28 : parseInt(selectedDays);

      const { data, error } = await supabase.functions.invoke("generate-plan", {
        body: { ingredientes, preferencias: prefs, usuario_id: user.id, dias_solicitados: diasSolicitados, idioma: lang },
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

  const FoodCategory = ({ title, items }: { title: string; items: string[] }) => (
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
          <ChefHat className="mx-auto h-8 w-8 text-primary" />
          <h1 className="mt-2 font-heading text-xl font-bold">{t("onboarding.title")}</h1>
        </div>

        <div className="mb-8 flex gap-1">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i < step ? "bg-primary" : "bg-border"}`} />
          ))}
        </div>
        <p className="mb-6 text-sm text-muted-foreground text-center">{t("onboarding.step")} {step} {t("onboarding.of")} {TOTAL_STEPS}</p>

        <div className="card-surface p-6">
          {step === 1 && (
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
                              <span key={i} className="rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs text-primary font-medium">
                                {ing}
                              </span>
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

          {step === 2 && (
            <div className="max-h-[60vh] overflow-y-auto pr-2">
              <h2 className="font-heading text-lg font-bold mb-4">{t("onboarding.step2.title")}</h2>
              <FoodCategory title={t("onboarding.step2.animalProteins")} items={proteinasAnimales} />
              <FoodCategory title={t("onboarding.step2.plantProteins")} items={proteinasVegetales} />
              <FoodCategory title={t("onboarding.step2.dairy")} items={lacteos} />
              <FoodCategory title={t("onboarding.step2.grains")} items={granos} />
              <FoodCategory title={t("onboarding.step2.veggies")} items={vegetales} />
              <FoodCategory title={t("onboarding.step2.fruits")} items={frutas} />
              <FoodCategory title={t("onboarding.step2.spices")} items={condimentos} />
            </div>
          )}

          {step === 3 && (
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

          {step === 4 && (
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

          {step === 5 && (
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

          {step === 6 && (
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

          {step === 7 && (
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

          {step === 8 && (
            <div>
              <h2 className="font-heading text-lg font-bold mb-4">{t("onboarding.step8.title")}</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between border-b border-border pb-2"><span className="text-muted-foreground">{t("onboarding.step8.people")}</span><span>{personas}</span></div>
                <div className="flex justify-between border-b border-border pb-2"><span className="text-muted-foreground">{t("onboarding.step8.meals")}</span><span>{selectedMeals.join(", ")}</span></div>
                <div className="flex justify-between border-b border-border pb-2"><span className="text-muted-foreground">{t("onboarding.step8.goal")}</span><span>{localGoals.find(g => g.id === selectedGoal)?.label || "—"}</span></div>
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
          {step < TOTAL_STEPS && (
            <Button onClick={() => setStep(s => s + 1)} className="bg-primary text-primary-foreground">{t("common.next")}</Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
