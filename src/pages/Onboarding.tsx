import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ChefHat, Loader2, Minus, Plus, Upload } from "lucide-react";
import { toast } from "sonner";
import {
  proteinasAnimales, proteinasVegetales, lacteos, granos, vegetales, frutas, condimentos,
  goals, alergias, dietas, salud, preferenciasComida, tiemposCocina, equipamiento, mealTimes,
} from "@/lib/onboarding-data";
import { supabase } from "@/integrations/supabase/client";

const TOTAL_STEPS = 8;

const dayOptions = [
  { id: "auto", label: "Auto (máximo)", emoji: "✨" },
  { id: "7", label: "7 días", emoji: "📅" },
  { id: "14", label: "14 días", emoji: "📅" },
  { id: "21", label: "21 días", emoji: "📅" },
  { id: "28", label: "28 días", emoji: "📅" },
];

const inputMethods = [
  { id: "foto-recibo", label: "Foto del Recibo", emoji: "🧾" },
  { id: "foto-nevera", label: "Foto de Nevera", emoji: "🧊" },
  { id: "lista-manual", label: "Lista Manual", emoji: "📝" },
  { id: "ayuda-comprar", label: "Ayúdame a Comprar", emoji: "🛒" },
];

const Onboarding = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Step 1
  const [inputMethod, setInputMethod] = useState("");
  const [manualIngredients, setManualIngredients] = useState("");

  // Step 2
  const [selectedFoods, setSelectedFoods] = useState<string[]>([]);

  // Step 3
  const [personas, setPersonas] = useState(2);
  const [selectedMeals, setSelectedMeals] = useState<string[]>(["Desayuno", "Almuerzo", "Cena"]);

  // Step 4
  const [selectedGoal, setSelectedGoal] = useState("");

  // Step 5
  const [restrictions, setRestrictions] = useState<string[]>([]);

  // Step 6
  const [cookingTime, setCookingTime] = useState("");
  const [skillLevel, setSkillLevel] = useState("Principiante");
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([]);

  // Step 7 - meal count
  const [selectedDays, setSelectedDays] = useState("28");

  const toggleItem = (list: string[], setList: React.Dispatch<React.SetStateAction<string[]>>, item: string) => {
    setList(prev => prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]);
  };

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error("Debes iniciar sesión"); setLoading(false); return; }

      // Save preferences
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
        body: { ingredientes, preferencias: prefs, usuario_id: user.id, dias_solicitados: diasSolicitados },
      });

      if (error) throw error;

      toast.success("¡Plan generado exitosamente!");
      navigate(`/plan/${data.plan_id}`);
    } catch (err: any) {
      toast.error("Error al generar el plan: " + (err.message || "Intenta de nuevo"));
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
        {/* Header */}
        <div className="mb-8 text-center">
          <ChefHat className="mx-auto h-8 w-8 text-primary" />
          <h1 className="mt-2 font-heading text-xl font-bold">Personaliza tu plan</h1>
        </div>

        {/* Progress */}
        <div className="mb-8 flex gap-1">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i < step ? "bg-primary" : "bg-border"}`} />
          ))}
        </div>
        <p className="mb-6 text-sm text-muted-foreground text-center">Paso {step} de {TOTAL_STEPS}</p>

        {/* Steps */}
        <div className="card-surface p-6">
          {step === 1 && (
            <div>
              <h2 className="font-heading text-lg font-bold mb-4">¿Cómo quieres ingresar tus ingredientes?</h2>
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
                <div className="mt-4 rounded-xl border-2 border-dashed border-border p-8 text-center">
                  <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
                  <p className="mt-2 text-sm text-muted-foreground">Sube tu foto aquí</p>
                </div>
              )}
              {(inputMethod === "lista-manual" || inputMethod === "ayuda-comprar") && (
                <Textarea placeholder="Escribe tus ingredientes, uno por línea..." value={manualIngredients} onChange={e => setManualIngredients(e.target.value)} className="mt-4 bg-background border-border min-h-[120px]" />
              )}
            </div>
          )}

          {step === 2 && (
            <div className="max-h-[60vh] overflow-y-auto pr-2">
              <h2 className="font-heading text-lg font-bold mb-4">Selecciona tus alimentos</h2>
              <FoodCategory title="🥩 Proteínas Animales" items={proteinasAnimales} />
              <FoodCategory title="🌱 Proteínas Vegetales" items={proteinasVegetales} />
              <FoodCategory title="🧀 Lácteos" items={lacteos} />
              <FoodCategory title="🌾 Granos" items={granos} />
              <FoodCategory title="🥬 Vegetales" items={vegetales} />
              <FoodCategory title="🍎 Frutas" items={frutas} />
              <FoodCategory title="🧂 Condimentos" items={condimentos} />
            </div>
          )}

          {step === 3 && (
            <div>
              <h2 className="font-heading text-lg font-bold mb-4">¿Para cuántas personas?</h2>
              <div className="flex items-center justify-center gap-4 mb-8">
                <button onClick={() => setPersonas(Math.max(1, personas - 1))} className="rounded-full border border-border p-2 hover:border-primary"><Minus className="h-5 w-5" /></button>
                <span className="font-heading text-4xl font-bold text-primary">{personas}</span>
                <button onClick={() => setPersonas(Math.min(12, personas + 1))} className="rounded-full border border-border p-2 hover:border-primary"><Plus className="h-5 w-5" /></button>
              </div>
              <h3 className="font-heading text-base font-semibold mb-3">Comidas del día</h3>
              <div className="flex flex-wrap gap-2">
                {mealTimes.map(meal => (
                  <button key={meal} onClick={() => toggleItem(selectedMeals, setSelectedMeals, meal)}
                    className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${selectedMeals.includes(meal) ? "bg-primary/20 border-primary text-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}>
                    {meal}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 4 && (
            <div>
              <h2 className="font-heading text-lg font-bold mb-4">¿Cuál es tu objetivo?</h2>
              <div className="grid grid-cols-2 gap-3">
                {goals.map(g => (
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
              <h2 className="font-heading text-lg font-bold mb-4">Restricciones y preferencias</h2>
              <h3 className="text-sm font-semibold text-primary mb-2">Alergias</h3>
              <TagToggle items={alergias} selected={restrictions} setSelected={setRestrictions} />
              <h3 className="text-sm font-semibold text-primary mb-2 mt-4">Dietas</h3>
              <TagToggle items={dietas} selected={restrictions} setSelected={setRestrictions} />
              <h3 className="text-sm font-semibold text-primary mb-2 mt-4">Salud</h3>
              <TagToggle items={salud} selected={restrictions} setSelected={setRestrictions} />
              <h3 className="text-sm font-semibold text-primary mb-2 mt-4">Preferencias</h3>
              <TagToggle items={preferenciasComida} selected={restrictions} setSelected={setRestrictions} />
            </div>
          )}

          {step === 6 && (
            <div>
              <h2 className="font-heading text-lg font-bold mb-4">Tu cocina</h2>
              <h3 className="text-sm font-semibold text-primary mb-2">Tiempo de cocina</h3>
              <div className="grid grid-cols-2 gap-3 mb-4">
                {tiemposCocina.map(t => (
                  <button key={t.id} onClick={() => setCookingTime(t.id)}
                    className={`rounded-xl border p-3 text-center transition-colors ${cookingTime === t.id ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/50"}`}>
                    <span className="text-xl">{t.emoji}</span>
                    <p className="mt-1 text-xs font-medium">{t.label}</p>
                  </button>
                ))}
              </div>
              <h3 className="text-sm font-semibold text-primary mb-2">Nivel culinario</h3>
              <select value={skillLevel} onChange={e => setSkillLevel(e.target.value)} className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground">
                {["Principiante", "Básico", "Intermedio", "Avanzado"].map(l => <option key={l} value={l}>{l}</option>)}
              </select>
              <h3 className="text-sm font-semibold text-primary mb-2 mt-4">Equipamiento</h3>
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
              <h2 className="font-heading text-lg font-bold mb-4">¿Cuántas comidas quieres preparar?</h2>
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
                <p className="text-sm text-muted-foreground">Basado en tus ingredientes, podemos generar aproximadamente:</p>
                <p className="mt-1 font-heading text-lg font-bold text-primary">
                  🍽️ Hasta {(selectedDays === "auto" ? 28 : parseInt(selectedDays)) * selectedMeals.length} recetas únicas
                </p>
              </div>
            </div>
          )}

          {step === 8 && (
            <div>
              <h2 className="font-heading text-lg font-bold mb-4">Resumen</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between border-b border-border pb-2"><span className="text-muted-foreground">Personas</span><span>{personas}</span></div>
                <div className="flex justify-between border-b border-border pb-2"><span className="text-muted-foreground">Comidas</span><span>{selectedMeals.join(", ")}</span></div>
                <div className="flex justify-between border-b border-border pb-2"><span className="text-muted-foreground">Objetivo</span><span>{goals.find(g => g.id === selectedGoal)?.label || "—"}</span></div>
                <div className="flex justify-between border-b border-border pb-2"><span className="text-muted-foreground">Restricciones</span><span>{restrictions.join(", ") || "Ninguna"}</span></div>
                <div className="flex justify-between border-b border-border pb-2"><span className="text-muted-foreground">Tiempo</span><span>{tiemposCocina.find(t => t.id === cookingTime)?.label || "—"}</span></div>
                <div className="flex justify-between border-b border-border pb-2"><span className="text-muted-foreground">Nivel</span><span>{skillLevel}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Equipamiento</span><span>{selectedEquipment.join(", ") || "—"}</span></div>
              </div>
              {!loading ? (
                <Button onClick={handleGenerate} className="w-full mt-6 bg-primary text-primary-foreground font-heading font-semibold h-12">
                  🚀 Generar mi plan de {selectedDays === "auto" ? "28" : selectedDays} días
                </Button>
              ) : (
                <div className="mt-6 text-center">
                  <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
                  <p className="mt-3 text-sm text-muted-foreground animate-pulse-glow">Generando tu plan personalizado...</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="mt-6 flex justify-between">
          {step > 1 ? (
            <Button variant="ghost" onClick={() => setStep(s => s - 1)} className="text-muted-foreground">← Anterior</Button>
          ) : <div />}
          {step < TOTAL_STEPS && (
            <Button onClick={() => setStep(s => s + 1)} className="bg-primary text-primary-foreground">Siguiente →</Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
