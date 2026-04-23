import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function parsePlanCandidate(value: unknown) {
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
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "No authorization" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json();
    const { dias_semana = 3, duracion_dias = 28, duracion_min_sesion = 45, lang = "es" } = body;

    // Cargar preferencias y perfil
    const { data: prefs } = await supabase
      .from("preferencias")
      .select("objetivo, equipamiento, nivel_experiencia, dias_ejercicio, tipo_ejercicio, duracion_ejercicio, edad, peso_kg, altura_cm, sexo, fase_entrenamiento, calorias_objetivo, proteina_g")
      .eq("usuario_id", user.id)
      .maybeSingle();

    const objetivo = prefs?.objetivo || "mantener";
    const equipamiento = prefs?.equipamiento?.length ? prefs.equipamiento : ["peso_corporal"];
    const nivel = prefs?.nivel_experiencia || "principiante";

    // Bloques de tiempo según duración total
    const warmupMin = duracion_min_sesion <= 20 ? 3 : 5;
    const cooldownMin = duracion_min_sesion <= 20 ? 2 : 5;
    const mainMin = duracion_min_sesion - warmupMin - cooldownMin;
    const numEjercicios = duracion_min_sesion <= 20 ? "4-5" : duracion_min_sesion <= 30 ? "5-6" : duracion_min_sesion <= 45 ? "6-8" : "8-10";

    const prompt = lang === "es"
      ? `Eres un entrenador personal certificado. Genera una rutina de entrenamiento de ${duracion_dias} días con ${dias_semana} sesiones por semana.
DURACIÓN OBLIGATORIA POR SESIÓN: ${duracion_min_sesion} minutos exactos (calentamiento ${warmupMin}min + principal ${mainMin}min + enfriamiento ${cooldownMin}min).
Si la duración es ≤20 min, prioriza circuitos HIIT/EMOM/Tabata para máxima eficiencia.
Cantidad de ejercicios por sesión: ${numEjercicios}.

Datos del cliente:
- Objetivo: ${objetivo}
- Nivel: ${nivel}
- Equipamiento disponible: ${equipamiento.join(", ")}
- Edad: ${prefs?.edad || "n/a"} años, ${prefs?.sexo || "n/a"}, ${prefs?.peso_kg || "n/a"}kg
- Calorías plan comida: ${prefs?.calorias_objetivo || "n/a"} kcal
- Proteína plan: ${prefs?.proteina_g || "n/a"}g

REGLAS:
1. Adapta la intensidad al nivel del usuario (progresión semanal).
2. Respeta el equipamiento (no inventes máquinas).
3. Para "perder" prioriza HIIT + fuerza compuesta. Para "ganar" prioriza hipertrofia (8-12 reps). Para "mantener" mezcla cardio+fuerza.
4. Para cada ejercicio incluye: nombre claro, series, reps, descanso_seg, musculo_principal (uno de: pecho, espalda, hombros, biceps, triceps, abdominales, gluteos, cuadriceps, isquiotibiales, gemelos, cardio, full_body), equipo (ej: peso_corporal, mancuernas, barra, kettlebell, banda, maquina), y descripcion (1 frase de cómo ejecutarlo correctamente).
5. Estima kcal_objetivo por sesión basado en duración e intensidad.

Devuelve SOLO JSON válido:
{
  "resumen": "descripción breve",
  "frecuencia_semanal": ${dias_semana},
  "duracion_min_sesion": ${duracion_min_sesion},
  "semanas": [
    {
      "numero": 1,
      "enfoque": "adaptación",
      "sesiones": [
        {
          "dia": 1,
          "nombre": "Full body básico",
          "tipo": "fuerza|cardio|hiit|movilidad|mixto",
          "duracion_min": ${duracion_min_sesion},
          "kcal_objetivo": 200,
          "calentamiento": ["${warmupMin}min movilidad articular"],
          "ejercicios": [
            {"nombre":"Sentadilla","series":3,"reps":"12","descanso_seg":60,"musculo_principal":"cuadriceps","equipo":"peso_corporal","descripcion":"Pies al ancho de hombros, baja caderas atrás manteniendo espalda recta."}
          ],
          "enfriamiento": ["${cooldownMin}min estiramiento"],
          "ajuste_macros": "Día de fuerza: +20g proteína post-entreno"
        }
      ]
    }
  ],
  "consejos_generales": ["consejo 1","consejo 2"]
}`
      : `You are a certified personal trainer. Generate a ${duracion_dias}-day training routine with ${dias_semana} sessions per week.
MANDATORY SESSION DURATION: exactly ${duracion_min_sesion} minutes (warmup ${warmupMin}min + main ${mainMin}min + cooldown ${cooldownMin}min).
If duration ≤20 min, prioritize HIIT/EMOM/Tabata circuits.
Exercises per session: ${numEjercicios}.

Client data:
- Goal: ${objetivo}
- Level: ${nivel}
- Equipment: ${equipamiento.join(", ")}
- Age: ${prefs?.edad || "n/a"}, ${prefs?.sexo || "n/a"}, ${prefs?.peso_kg || "n/a"}kg
- Meal plan kcal: ${prefs?.calorias_objetivo || "n/a"}, protein: ${prefs?.proteina_g || "n/a"}g

For each exercise include: nombre, series, reps, descanso_seg, musculo_principal (chest/back/shoulders/biceps/triceps/abs/glutes/quads/hamstrings/calves/cardio/full_body), equipo, descripcion (1 sentence on form).

Return ONLY valid JSON with the same structure shown above (in English).`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You generate workout routines as strict JSON. No markdown, no commentary." },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) return json({ error: "Rate limit exceeded" }, 429);
      if (aiResp.status === 402) return json({ error: "Add credits to workspace" }, 402);
      const t = await aiResp.text();
      console.error("AI error", aiResp.status, t);
      return json({ error: "AI gateway error" }, 500);
    }

    const aiData = await aiResp.json();
    const content = aiData.choices?.[0]?.message?.content || "{}";

    let plan = parsePlanCandidate(content);

    if (plan && typeof plan === "object" && "resumen" in plan) {
      const nested = parsePlanCandidate((plan as Record<string, unknown>).resumen);
      if (nested && typeof nested === "object" && Array.isArray((nested as Record<string, unknown>).semanas)) {
        plan = nested;
      }
    }

    if (!plan || typeof plan !== "object") {
      plan = { resumen: typeof content === "string" ? content : "Routine generated" };
    }

    // Desactivar rutinas previas
    await supabase.from("rutinas_fit").update({ activa: false }).eq("usuario_id", user.id).eq("activa", true);

    const { data: routine, error } = await supabase.from("rutinas_fit").insert({
      usuario_id: user.id,
      objetivo,
      dias_semana,
      duracion_dias,
      equipamiento,
      nivel,
      plan_json: plan,
      activa: true,
    }).select().single();

    if (error) throw error;

    return json({ success: true, routine });
  } catch (e) {
    console.error(e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
