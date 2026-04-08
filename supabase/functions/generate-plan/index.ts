import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

    const diasPlan = dias_solicitados || 28;
    const semanasNum = Math.ceil(diasPlan / 7);
    const comidasPorDia = preferencias.comidas?.length || 3;
    const totalRecetasNeeded = diasPlan * comidasPorDia;

    // ─── SMART RECIPE REUSE ───
    // 1. Fetch ALL recipes from catalog (not just this user's) for potential reuse
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

    // User's own history (to AVOID repetition for this user)
    const { data: userHistory } = await supabase
      .from("recetas_catalogo")
      .select("nombre, tipo_proteina, ingredientes_principales, hash")
      .eq("usuario_id", usuario_id)
      .gte("ultima_vez", ninetyDaysAgo);

    const userRecipeNames = new Set((userHistory || []).map((r: any) => r.nombre.toLowerCase()));

    // Global catalog: popular recipes from OTHER users that this user hasn't had
    const { data: globalCatalog } = await supabase
      .from("recetas_catalogo")
      .select("nombre, tipo_proteina, ingredientes_principales, objetivo, veces_generada")
      .neq("usuario_id", usuario_id)
      .order("veces_generada", { ascending: false })
      .limit(200);

    // Filter to recipes this user hasn't had in 90 days
    const reusableCandidates = (globalCatalog || []).filter(
      (r: any) => !userRecipeNames.has(r.nombre.toLowerCase())
    );

    // Match by objective and ingredients overlap
    const userIngredients = (ingredientes || "").toLowerCase().split(/[,;]+/).map((i: string) => i.trim()).filter(Boolean);
    const scoredCandidates = reusableCandidates.map((r: any) => {
      let score = 0;
      if (r.objetivo === preferencias.objetivo) score += 3;
      const recipeIngredients = (r.ingredientes_principales || []).map((i: string) => i.toLowerCase());
      const overlap = recipeIngredients.filter((i: string) => userIngredients.some((ui: string) => i.includes(ui) || ui.includes(i)));
      score += overlap.length * 2;
      score += Math.min(r.veces_generada || 0, 5); // popularity bonus capped
      return { ...r, score };
    }).sort((a: any, b: any) => b.score - a.score);

    // Take up to 30% of needed recipes from cache
    const maxReuse = Math.floor(totalRecetasNeeded * 0.3);
    const reusedRecipes = scoredCandidates.slice(0, maxReuse);
    const reusedNames = reusedRecipes.map((r: any) => r.nombre);

    const historialTexto = userHistory && userHistory.length > 0
      ? userHistory.map((r: any) => `- ${r.nombre} (${r.tipo_proteina})`).join("\n")
      : "Sin historial previo";

    // Build reuse context for the AI
    const reuseContext = reusedNames.length > 0
      ? `\nRECETAS PRE-APROBADAS PARA REUTILIZAR (incluye estas tal como están, no las modifiques, úsalas para cubrir hasta ${reusedNames.length} comidas):\n${reusedNames.map((n: string) => `- ${n}`).join("\n")}\nEstas recetas son populares entre otros usuarios y ya están validadas.`
      : "";

    // Build nutrition context from body metrics
    let nutritionContext = "";
    if (medidas_corporales && medidas_corporales.peso_kg) {
      const mc = medidas_corporales;
      nutritionContext = `\n\nDATOS NUTRICIONALES DEL USUARIO (actúa como nutricionista certificado):
- Peso actual: ${mc.peso_kg} kg
- Estatura: ${mc.altura_cm} cm
- Edad: ${mc.edad} años
- Sexo: ${mc.sexo === "male" ? "Masculino" : "Femenino"}
- Nivel de actividad: ${mc.actividad}
- IMC calculado: ${mc.imc}
- TDEE estimado: ${mc.tdee} kcal/día
${mc.peso_meta ? `- Meta de peso: ${mc.peso_meta} kg` : ""}
- Preferencia de medición: ${mc.tipo_dieta === "kcal" ? "Por calorías (kcal)" : "Por porciones/peso"}

INSTRUCCIONES NUTRICIONALES:
- Calcula el déficit/superávit calórico apropiado según el objetivo (máx 500 kcal déficit para perder grasa, 300-500 superávit para ganar músculo)
- Distribuye macronutrientes: Proteínas ${mc.peso_meta && mc.peso_meta < mc.peso_kg ? "1.6-2.2g" : "1.8-2.5g"}/kg peso corporal, Grasas 25-35% calorías, Carbohidratos el resto
- ${mc.tipo_dieta === "kcal" ? "Muestra las calorías exactas por comida y el total diario" : "Indica porciones en gramos/medidas caseras"}
- Adapta las porciones para cumplir los macros objetivo
- Cada día debe sumar aproximadamente ${mc.tdee ? (mc.peso_meta && mc.peso_meta < mc.peso_kg ? mc.tdee - 400 : mc.peso_meta && mc.peso_meta > mc.peso_kg ? mc.tdee + 350 : mc.tdee) : "las calorías calculadas"} kcal`;
    }

    const systemPrompt = `Eres Chef AI de Paraguachi Meals Prep. 
Genera planes de comida personalizados.
IDIOMA: Responde TODO en ${lang === "en" ? "inglés" : "español"}, incluyendo nombres de recetas, instrucciones y consejos.
Responde SIEMPRE en formato JSON válido con esta estructura exacta:
{
  "analisis": {
    "ingredientes_detectados": ["lista de ingredientes que el usuario tiene"],
    "dias_posibles": ${diasPlan},
    "recetas_posibles": ${totalRecetasNeeded},
    "recetas_reutilizadas": ${reusedNames.length},
    "ahorro_estimado": "${reusedNames.length > 0 ? Math.round((reusedNames.length / totalRecetasNeeded) * 100) + '% menos tokens usados' : 'N/A'}",
    "ingredientes_sugeridos": [
      {
        "ingrediente": "Nombre del ingrediente",
        "razon": "Por qué lo sugerimos",
        "recetas_adicionales": 5
      }
    ],
    "advertencias": ["mensajes de advertencia si faltan ingredientes"]
  },
  "semanas": [
    {
      "numero": 1,
      "dias": [
        {
          "numero": 1,
          "comidas": [
            {
              "tipo": "Desayuno|Almuerzo|Cena|Merienda",
              "nombre": "Nombre de la receta",
              "tiempo_prep": 20,
              "tiempo_coccion": 15,
              "porciones": 2,
              "calorias": 450,
              "proteinas": 30,
              "carbohidratos": 45,
              "grasas": 12,
              "tipo_proteina": "pollo|res|cerdo|pescado|vegetariano",
              "reutilizada": false,
              "ingredientes": [
                {"cantidad": "200g", "nombre": "pechuga de pollo", "sustituto": "muslo de pollo"}
              ],
              "pasos": [
                {"numero": 1, "titulo": "Preparar", "instruccion": "Descripción del paso"}
              ],
              "consejos": "Tip del chef...",
              "almacenamiento": {
                "refrigerador": "3 días en recipiente hermético",
                "congelador": "2 semanas",
                "meal_prep": "Prepara el doble los domingos"
              }
            }
          ]
        }
      ],
      "lista_compras": {
        "proteinas": ["200g pollo"],
        "vegetales": ["2 zanahorias"],
        "granos": ["1 taza arroz"],
        "lacteos": [],
        "condimentos": ["sal", "comino"]
      },
      "guia_meal_prep": "Instrucciones para preparar el domingo..."
    }
  ]
}

REGLA CRÍTICA ANTI-REPETICIÓN:
- Revisa el historial de recetas del usuario antes de generar
- NUNCA repitas una receta que ya fue generada en los últimos 90 días
- Si un ingrediente principal se repite, usa técnica de cocción diferente
- Cada receta debe ser ÚNICA en nombre y preparación
- Historial del usuario:
${historialTexto}
${reuseContext}

IMPORTANTE: 
- Genera exactamente ${semanasNum} semanas con 7 días cada una (${diasPlan} días total)
- Incluye las comidas solicitadas por el usuario
- Respeta todas las restricciones alimentarias
- Adapta las porciones al número de personas
- Calcula macros realistas
- Usa los ingredientes disponibles
- Incluye el análisis de ingredientes
- Marca "reutilizada": true en recetas que vienen de las PRE-APROBADAS
${nutritionContext}
- Responde SOLO con el JSON, sin texto adicional`;

    const userMessage = `Genera un plan de ${diasPlan} días con estos datos:
Ingredientes disponibles: ${ingredientes}
Número de personas: ${preferencias.personas}
Objetivo: ${preferencias.objetivo}
Restricciones: ${preferencias.restricciones?.join(', ') || 'Ninguna'}
Tiempo de cocina: ${preferencias.tiempo_cocina}
Nivel culinario: ${preferencias.nivel_culinario}
Comidas del día: ${preferencias.comidas?.join(', ')}
Equipamiento: ${preferencias.equipamiento?.join(', ') || 'Básico'}`;

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

    // Generate public sharing token
    const publicToken = crypto.randomUUID().replace(/-/g, "").substring(0, 16);

    // Save plan
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

    if (dbError) {
      console.error("DB error:", dbError);
      throw new Error("Error al guardar el plan");
    }

    // Save recipes to catalog for anti-repetition + future reuse
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
        // Upsert: if hash exists, increment veces_generada
        const { data: existing } = await supabase
          .from("recetas_catalogo")
          .select("id, veces_generada")
          .eq("hash", receta.hash)
          .maybeSingle();

        if (existing) {
          await supabase
            .from("recetas_catalogo")
            .update({
              veces_generada: (existing.veces_generada || 1) + 1,
              ultima_vez: new Date().toISOString(),
            })
            .eq("id", existing.id);
        } else {
          await supabase.from("recetas_catalogo").insert(receta);
        }
      }
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
      reuse_stats: {
        recipes_reused: reusedNames.length,
        total_recipes: totalRecetasNeeded,
        savings_pct: reusedNames.length > 0 ? Math.round((reusedNames.length / totalRecetasNeeded) * 100) : 0,
      },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-plan error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Error desconocido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
