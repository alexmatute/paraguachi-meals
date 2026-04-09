import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DISCLAIMER = "Los planes nutricionales generados por Paraguachi Meals Prep son de carácter orientativo y educativo. No constituyen consejo médico, diagnóstico ni tratamiento. No reemplazan la consulta con un médico, nutricionista o dietista certificado. Si padeces diabetes, hipertensión, enfermedad renal u otras condiciones médicas, consulta siempre a tu médico antes de realizar cambios en tu alimentación.";

// ─── Macro calculation following clinical guide (Harris-Benedict Revisado) ───
function calcularMacros(datos: {
  peso: number; altura: number; edad: number; sexo: string;
  factorActividad: number; objetivo: string;
  problemasSalud: string[]; enfermedad_renal: boolean;
}) {
  const tmb = datos.sexo === "M"
    ? 88.36 + (13.4 * datos.peso) + (4.8 * datos.altura) - (5.7 * datos.edad)
    : 447.6 + (9.2 * datos.peso) + (3.1 * datos.altura) - (4.3 * datos.edad);
  const tdee = tmb * datos.factorActividad;

  let calorias = tdee;
  if (datos.objetivo === "musculo") calorias = tdee + 400;
  if (datos.objetivo === "perder") calorias = Math.max(tdee - 500, tmb);
  if (datos.objetivo === "rendimiento") calorias = tdee + 500;

  let proteinaFactor = 1.6;
  if (datos.objetivo === "musculo") proteinaFactor = 2.0;
  if (datos.objetivo === "perder") proteinaFactor = 2.2;
  if (datos.enfermedad_renal) proteinaFactor = 0.8;
  const proteina = Math.round(datos.peso * proteinaFactor);

  let carbosFactor = 4.0;
  if (datos.objetivo === "musculo") carbosFactor = 5.0;
  if (datos.objetivo === "perder") carbosFactor = 2.5;
  if (datos.problemasSalud.includes("Diabético") || datos.problemasSalud.includes("Diabetes")) carbosFactor = 2.0;
  const carbos = Math.round(datos.peso * carbosFactor);

  const caloriasProteina = proteina * 4;
  const caloriasCarbo = carbos * 4;
  const caloriasGrasa = calorias - caloriasProteina - caloriasCarbo;
  const grasas = Math.round(Math.max(caloriasGrasa, 0) / 9);

  return {
    tmb: Math.round(tmb), tdee: Math.round(tdee),
    calorias: Math.round(calorias), proteina, carbos, grasas,
    sodio_max: datos.problemasSalud.some(p => p.includes("ipertens")) ? 1500 : 2300,
    ig_max: datos.problemasSalud.some(p => p.includes("iabét") || p.includes("iabet")) ? 55 : 100,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { ingredientes, preferencias, usuario_id, dias_solicitados, idioma, medidas_corporales } = await req.json();
    const lang = idioma === "en" ? "en" : "es";

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // ─── RATE LIMITING: 2 plans/month + 6h cooldown ───
    const PLANS_PER_MONTH = 2;
    const COOLDOWN_HOURS = 6;

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { data: monthPlans, error: countErr } = await supabase
      .from("planes")
      .select("id, creado_en")
      .eq("usuario_id", usuario_id)
      .gte("creado_en", startOfMonth.toISOString())
      .order("creado_en", { ascending: false });

    if (countErr) console.error("Rate limit check error:", countErr);

    const planCount = monthPlans?.length || 0;
    if (planCount >= PLANS_PER_MONTH) {
      return new Response(JSON.stringify({
        error: lang === "en"
          ? `You have reached the limit of ${PLANS_PER_MONTH} plans this month.`
          : `Has alcanzado el límite de ${PLANS_PER_MONTH} planes este mes.`,
        code: "PLAN_LIMIT", limit: PLANS_PER_MONTH, used: planCount,
      }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (monthPlans && monthPlans.length > 0) {
      const lastPlanDate = new Date(monthPlans[0].creado_en);
      const hoursSinceLast = (Date.now() - lastPlanDate.getTime()) / (1000 * 60 * 60);
      if (hoursSinceLast < COOLDOWN_HOURS) {
        const remainingHours = Math.ceil(COOLDOWN_HOURS - hoursSinceLast);
        return new Response(JSON.stringify({
          error: lang === "en"
            ? `Please wait ${remainingHours} more hour(s) before generating another plan.`
            : `Por favor espera ${remainingHours} hora(s) más antes de generar otro plan.`,
          code: "COOLDOWN", remaining_hours: remainingHours,
        }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    const diasPlan = dias_solicitados || 28;
    const semanasNum = Math.ceil(diasPlan / 7);
    const comidasPorDia = preferencias.comidas?.length || 3;
    const totalRecetasNeeded = diasPlan * comidasPorDia;

    // ─── SMART RECIPE REUSE ───
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

    const { data: userHistory } = await supabase
      .from("recetas_catalogo")
      .select("nombre, tipo_proteina, ingredientes_principales, hash")
      .eq("usuario_id", usuario_id)
      .gte("ultima_vez", ninetyDaysAgo);

    const userRecipeNames = new Set((userHistory || []).map((r: any) => r.nombre.toLowerCase()));

    const { data: globalCatalog } = await supabase
      .from("recetas_catalogo")
      .select("nombre, tipo_proteina, ingredientes_principales, objetivo, veces_generada")
      .neq("usuario_id", usuario_id)
      .order("veces_generada", { ascending: false })
      .limit(200);

    const reusableCandidates = (globalCatalog || []).filter(
      (r: any) => !userRecipeNames.has(r.nombre.toLowerCase())
    );

    const userIngredients = (ingredientes || "").toLowerCase().split(/[,;]+/).map((i: string) => i.trim()).filter(Boolean);
    const scoredCandidates = reusableCandidates.map((r: any) => {
      let score = 0;
      if (r.objetivo === preferencias.objetivo) score += 3;
      const recipeIngredients = (r.ingredientes_principales || []).map((i: string) => i.toLowerCase());
      const overlap = recipeIngredients.filter((i: string) => userIngredients.some((ui: string) => i.includes(ui) || ui.includes(i)));
      score += overlap.length * 2;
      score += Math.min(r.veces_generada || 0, 5);
      return { ...r, score };
    }).sort((a: any, b: any) => b.score - a.score);

    const maxReuse = Math.floor(totalRecetasNeeded * 0.3);
    const reusedRecipes = scoredCandidates.slice(0, maxReuse);
    const reusedNames = reusedRecipes.map((r: any) => r.nombre);

    const historialTexto = userHistory && userHistory.length > 0
      ? userHistory.map((r: any) => `- ${r.nombre} (${r.tipo_proteina})`).join("\n")
      : "Sin historial previo";

    const reuseContext = reusedNames.length > 0
      ? `\nRECETAS PRE-APROBADAS PARA REUTILIZAR (incluye estas tal como están):\n${reusedNames.map((n: string) => `- ${n}`).join("\n")}`
      : "";

    // ─── CLINICAL NUTRITION CONTEXT ───
    const mc = medidas_corporales || {};
    const restricciones = preferencias.restricciones || [];
    const hasDiabetes = restricciones.some((r: string) => r.includes("iabét") || r.includes("iabet")) || mc.tipo_diabetes;
    const hasHypertension = restricciones.some((r: string) => r.includes("ipertens") || r.includes("sodio"));
    const hasRenalDisease = mc.enfermedad_renal === true;

    const activityFactors: Record<string, number> = {
      sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, veryActive: 1.9,
    };

    let macrosContext = "";
    let computedMacros: any = null;
    if (mc.peso_kg && mc.altura_cm && mc.edad) {
      computedMacros = calcularMacros({
        peso: mc.peso_kg, altura: mc.altura_cm, edad: mc.edad,
        sexo: mc.sexo === "female" ? "F" : "M",
        factorActividad: activityFactors[mc.actividad] || 1.55,
        objetivo: preferencias.objetivo,
        problemasSalud: restricciones,
        enfermedad_renal: hasRenalDisease,
      });
      macrosContext = `
MACROS OBJETIVO CALCULADOS (Harris-Benedict Revisado):
- TMB: ${computedMacros.tmb} kcal
- TDEE: ${computedMacros.tdee} kcal
- Calorías objetivo: ${computedMacros.calorias} kcal/día
- Proteína: ${computedMacros.proteina} g/día
- Carbohidratos: ${computedMacros.carbos} g/día
- Grasas: ${computedMacros.grasas} g/día
- Sodio máximo: ${computedMacros.sodio_max} mg/día
- IG máximo: ${computedMacros.ig_max}
Cada receta DEBE especificar macros. La suma diaria debe aproximarse a los objetivos (±10%).`;
    }

    // Build clinical rules
    let clinicalRules = "";

    if (preferencias.objetivo === "musculo") {
      clinicalRules += `
REGLAS PARA GANANCIA MUSCULAR:
- Superávit calórico: TDEE + 300-500 kcal
- Proteína: 1.8-2.2g × kg peso corporal
- Carbohidratos: 4-7g × kg (fuente de energía primaria)
- Distribución: 5-6 comidas, proteína en CADA comida (25-40g por comida)
- Post-entreno SIEMPRE: proteína + carbohidratos (dentro de 45-60 min)
- Caseína antes de dormir (requesón, yogurt griego)
- Nunca saltarse el desayuno
- Carbohidratos PRE-entreno (1-2 horas antes)
`;
    }

    if (preferencias.objetivo === "perder") {
      clinicalRules += `
REGLAS PARA PÉRDIDA DE GRASA:
- Déficit calórico: TDEE - 300-500 kcal (NUNCA menor que la TMB)
- Pérdida saludable: 0.5 a 1.0 kg por semana
- Proteína alta: 2.0-2.4g × kg (preservar músculo, efecto saciante)
- Carbohidratos moderados: 2-4g × kg (reducidos, no eliminados)
- Alta fibra en cada comida (30g/día mínimo para saciedad)
- Sin carbohidratos solos en la noche
- Regla 80/20: 80% alimentos integrales, 20% flexibilidad
- Agua: mínimo 35ml × kg de peso corporal/día
- Evitar líquidos con calorías (jugos, alcohol, refrescos)
- Alimentos de bajo índice glucémico para evitar picos de insulina
`;
    }

    if (hasDiabetes) {
      const tipoDiabetes = mc.tipo_diabetes || "2";
      clinicalRules += `
REGLAS ESTRICTAS PARA DIABETES TIPO ${tipoDiabetes}:
- Máximo 30-45g carbohidratos por comida
- SOLO alimentos de IG < 55 (preferidos)
- NUNCA azúcar, miel, jugos de fruta, alcohol
- NUNCA carbohidratos solos (siempre con proteína o grasa)
- Distribuir carbos en 5-6 comidas pequeñas
- Carga glucémica diaria total < 100
- Incluir fibra soluble en cada comida (avena, legumbres, manzana)
- Vegetales sin almidón libremente (brócoli, espinaca, pepino)
- Caminata 15-20 min después de almuerzo y cena
- Monitorear glucosa 2h después de cada comida nueva
${hasRenalDisease ? "- NEFROPATÍA: proteína MÁXIMA 0.8g × kg (no exceder)" : "- Con función renal normal: proteína 1.0-1.5g × kg"}
${mc.usa_insulina ? "- USUARIO USA INSULINA: incluir snack antes de dormir para prevenir hipoglucemia nocturna" : ""}
ALIMENTOS PROHIBIDOS: azúcar blanca, miel, jarabe, refrescos, jugos de fruta, dulces, cereales azucarados, alcohol
ALIMENTOS PREFERIDOS IG BAJO: lentejas (29), garbanzos (28), frijoles (30), avena (55), arroz integral (50), yogurt natural (36), manzana (36), fresas (40)
`;
    }

    if (hasHypertension) {
      const metaSodio = mc.meta_sodio === "estricto" ? 1500 : 2300;
      clinicalRules += `
REGLAS ESTRICTAS PARA HIPERTENSIÓN (DIETA DASH):
- CERO sal añadida en ninguna receta
- Sodio máximo: ${metaSodio} mg/día
- CERO embutidos, enlatados, sopas de sobre, cubitos de caldo
- CERO comida rápida o procesada
- Salsa soya PROHIBIDA (1 cda = 900mg sodio)
- Potasio alto (4,700 mg/día): aguacate, banano, espinaca, papa con cáscara, frijoles
- Magnesio alto (400-500 mg/día): almendras, semillas de calabaza, espinaca, quinoa
- Calcio (1,200 mg/día): yogurt descremado, sardinas, brócoli, tofu
- Omega-3 diario: salmón, sardinas, nueces, chía, linaza
- Incluir remolacha o espinaca al menos 3 veces/semana (nitratos naturales)
- Sazonar SOLO con: ajo, limón, hierbas frescas, especias, vinagre
- Grasas saturadas < 6% de calorías totales
- Alcohol: 0
- Cafeína: máximo 2 tazas café/día
- Carnes rojas: máximo 2 veces/semana
`;
    }

    if (hasDiabetes && hasHypertension) {
      clinicalRules += `
MODO SÍNDROME METABÓLICO (Diabetes + Hipertensión):
- Aplicar TODAS las restricciones anteriores simultáneamente
- Meta sodio automática: 1,500 mg/día (estricto)
- Alimentos estrella (cumplen ambas condiciones): salmón, espinaca, aguacate, frijoles negros, avena, arándanos, brócoli, ajo, nueces, yogurt griego natural
- Sin azúcar añadida + Sin sal añadida
- Sin alimentos procesados
- Sin alcohol
`;
    }

    // Build nutrition context from body metrics
    let nutritionContext = "";
    if (mc.peso_kg) {
      nutritionContext = `
DATOS ANTROPOMÉTRICOS DEL USUARIO:
- Peso actual: ${mc.peso_kg} kg
- Estatura: ${mc.altura_cm} cm
- Edad: ${mc.edad} años
- Sexo biológico: ${mc.sexo === "female" ? "Femenino" : "Masculino"}
- Nivel de actividad: ${mc.actividad} (factor: ${activityFactors[mc.actividad] || 1.55})
- IMC calculado: ${mc.imc}
${mc.grasa_corporal ? `- % Grasa corporal: ${mc.grasa_corporal}%` : ""}
${mc.cintura_cm ? `- Circunferencia cintura: ${mc.cintura_cm} cm` : ""}
${mc.cadera_cm ? `- Circunferencia cadera: ${mc.cadera_cm} cm` : ""}
${mc.peso_meta ? `- Meta de peso: ${mc.peso_meta} kg` : ""}
- Preferencia de medición: ${mc.tipo_dieta === "kcal" ? "Por calorías (kcal)" : "Por porciones/peso"}
${mc.medicamentos?.length ? `- Medicamentos actuales: ${mc.medicamentos.join(", ")}` : ""}
${mc.tipo_diabetes ? `- Tipo de diabetes: ${mc.tipo_diabetes}` : ""}
${mc.usa_insulina ? "- Usa insulina: Sí" : ""}
${mc.hba1c ? `- HbA1c: ${mc.hba1c}%` : ""}
${mc.enfermedad_renal ? "- Enfermedad renal: Sí (LIMITAR PROTEÍNA)" : ""}
${mc.presion_sistolica ? `- Presión arterial: ${mc.presion_sistolica}/${mc.presion_diastolica} mmHg` : ""}
${mc.resistencia_insulina ? `- Resistencia a insulina: ${mc.resistencia_insulina}` : ""}
${mc.horas_sueno ? `- Horas de sueño: ${mc.horas_sueno}` : ""}
${mc.nivel_estres ? `- Nivel de estrés: ${mc.nivel_estres}` : ""}
${macrosContext}`;
    }

    const systemPrompt = `Eres Chef AI de Paraguachi Meals Prep, un asistente nutricional y culinario experto.
Generas planes de comidas personalizados basados en evidencia científica y guías clínicas actualizadas (ADA 2024, AHA 2024, DASH Diet Guidelines, ISSN Sport Nutrition).

DISCLAIMER OBLIGATORIO: "${DISCLAIMER}"
Incluye este disclaimer como "nota_medica" en la primera comida de cada semana y en cualquier receta con restricciones médicas activas.

IDIOMA: Responde TODO en ${lang === "en" ? "inglés" : "español"}, incluyendo nombres de recetas, instrucciones y consejos.
${clinicalRules}
${nutritionContext}

Responde SIEMPRE en formato JSON válido con esta estructura exacta:
{
  "analisis": {
    "ingredientes_detectados": ["lista"],
    "dias_posibles": ${diasPlan},
    "recetas_posibles": ${totalRecetasNeeded},
    "recetas_reutilizadas": ${reusedNames.length},
    "calorias_dia_estimadas": number,
    "advertencias_medicas": ["string"],
    "ingredientes_sugeridos": [{"ingrediente": "string", "razon": "string", "beneficio_medico": "string"}]
  },
  "semanas": [{
    "numero": 1,
    "dias": [{
      "numero": 1,
      "comidas": [{
        "tipo": "Desayuno|Media Mañana|Almuerzo|Merienda|Cena|Pre-entreno|Post-entreno",
        "nombre": "string",
        "tiempo_prep": number,
        "tiempo_coccion": number,
        "porciones": number,
        "calorias": number,
        "proteinas": number,
        "carbohidratos": number,
        "grasas": number,
        "fibra_g": number,
        "sodio_mg": number,
        "indice_glucemico": "bajo|medio|alto",
        "tipo_proteina": "pollo|res|cerdo|pescado|vegetariano|huevos",
        "apto_diabetes": boolean,
        "apto_hipertension": boolean,
        "reutilizada": false,
        "nota_medica": "string|null",
        "ingredientes": [{"cantidad": "string", "nombre": "string", "sustituto": "string|null"}],
        "pasos": [{"numero": 1, "titulo": "string", "instruccion": "string"}],
        "consejos": "string",
        "almacenamiento": {"refrigerador": "string", "congelador": "string", "meal_prep": "string"}
      }]
    }],
    "lista_compras": {
      "proteinas": ["string"], "vegetales": ["string"], "granos": ["string"],
      "lacteos": ["string"], "condimentos": ["string"], "evitar_por_condicion": ["string"]
    },
    "guia_meal_prep": "string"
  }],
  "resumen_nutricional": {
    "calorias_promedio_dia": number,
    "proteina_promedio_g": number,
    "carbos_promedio_g": number,
    "grasas_promedio_g": number,
    "sodio_promedio_mg": number,
    "cumple_objetivo": boolean
  }
}

REGLA CRÍTICA ANTI-REPETICIÓN:
- NUNCA repitas una receta del historial de los últimos 90 días
- Si repites un ingrediente principal, usa técnica de cocción diferente
- Cada semana al menos 4 proteínas diferentes
- Al menos 3 vegetales distintos por día
- Historial del usuario:
${historialTexto}
${reuseContext}

IMPORTANTE:
- Genera exactamente ${semanasNum} semanas con 7 días cada una (${diasPlan} días total)
- Incluye las comidas: ${preferencias.comidas?.join(", ")}
- Respeta TODAS las restricciones alimentarias
- Adapta porciones a ${preferencias.personas} personas
- Marca "reutilizada": true en recetas PRE-APROBADAS
- Calcula sodio_mg y fibra_g en CADA receta
- Marca apto_diabetes y apto_hipertension en CADA receta
- Máximo 4 pasos por receta, máximo 6 ingredientes principales
- Responde SOLO con el JSON, sin texto adicional`;

    const userMessage = `Genera un plan de ${diasPlan} días con estos datos:
Ingredientes disponibles: ${ingredientes}
Número de personas: ${preferencias.personas}
Objetivo: ${preferencias.objetivo}
Restricciones: ${restricciones.join(", ") || "Ninguna"}
Tiempo de cocina: ${preferencias.tiempo_cocina}
Nivel culinario: ${preferencias.nivel_culinario}
Comidas del día: ${preferencias.comidas?.join(", ")}
Equipamiento: ${preferencias.equipamiento?.join(", ") || "Básico"}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Demasiadas solicitudes, intenta en unos minutos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos agotados. Contacta al administrador." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("Error del servicio AI");
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content;
    if (!content) throw new Error("No se recibió respuesta del AI");

    let planJson;
    try {
      const jsonStr = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      planJson = JSON.parse(jsonStr);
    } catch {
      console.error("Failed to parse AI response:", content);
      throw new Error("Error al procesar la respuesta del AI");
    }

    const publicToken = crypto.randomUUID().replace(/-/g, "").substring(0, 16);

    const { data: plan, error: dbError } = await supabase
      .from("planes")
      .insert({
        usuario_id,
        ingredientes,
        plan_json: planJson,
        semanas: semanasNum,
        dias_generados: diasPlan,
        public_token: publicToken,
      })
      .select("id")
      .single();

    if (dbError) { console.error("DB error:", dbError); throw new Error("Error al guardar el plan"); }

    // Save recipes to catalog
    const recetasToInsert: any[] = [];
    for (const semana of (planJson.semanas || [])) {
      for (const dia of (semana.dias || [])) {
        for (const comida of (dia.comidas || [])) {
          const hash = btoa(`${usuario_id}-${comida.nombre}-${comida.tipo_proteina}`).substring(0, 64);
          recetasToInsert.push({
            usuario_id,
            nombre: comida.nombre,
            ingredientes_principales: (comida.ingredientes || []).slice(0, 5).map((i: any) => i.nombre),
            tipo_proteina: comida.tipo_proteina,
            objetivo: preferencias.objetivo,
            hash,
          });
        }
      }
    }

    if (recetasToInsert.length > 0) {
      for (const receta of recetasToInsert) {
        const { data: existing } = await supabase
          .from("recetas_catalogo")
          .select("id, veces_generada")
          .eq("hash", receta.hash)
          .maybeSingle();

        if (existing) {
          await supabase.from("recetas_catalogo").update({
            veces_generada: (existing.veces_generada || 1) + 1,
            ultima_vez: new Date().toISOString(),
          }).eq("id", existing.id);
        } else {
          await supabase.from("recetas_catalogo").insert(receta);
        }
      }
    }

    // Save computed macros to preferencias
    if (computedMacros) {
      await supabase.from("preferencias").update({
        tmb: computedMacros.tmb,
        tdee: computedMacros.tdee,
        calorias_objetivo: computedMacros.calorias,
        proteina_g: computedMacros.proteina,
        carbos_g: computedMacros.carbos,
        grasas_g: computedMacros.grasas,
      }).eq("usuario_id", usuario_id);
    }

    // Track token usage
    const usage = aiData.usage;
    if (usage) {
      await supabase.from("token_usage").insert({
        usuario_id,
        plan_id: plan.id,
        tokens_input: usage.prompt_tokens || 0,
        tokens_output: usage.completion_tokens || 0,
        tokens_total: usage.total_tokens || 0,
        modelo: "gemini-2.5-flash",
        costo_usd: ((usage.prompt_tokens || 0) * 0.15 + (usage.completion_tokens || 0) * 0.6) / 1_000_000,
      });
    }

    return new Response(JSON.stringify({
      plan_id: plan.id,
      plan: planJson,
      public_token: publicToken,
      macros: computedMacros,
      reuse_stats: {
        recipes_reused: reusedNames.length,
        total_recipes: totalRecetasNeeded,
        savings_pct: reusedNames.length > 0 ? Math.round((reusedNames.length / totalRecetasNeeded) * 100) : 0,
      },
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("generate-plan error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Error desconocido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
