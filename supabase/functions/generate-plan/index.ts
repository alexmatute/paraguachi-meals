import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { ingredientes, preferencias, usuario_id, dias_solicitados, idioma } = await req.json();
    const lang = idioma === "en" ? "en" : "es";

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch recipe history for anti-repetition (last 90 days)
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const { data: historial } = await supabase
      .from("recetas_catalogo")
      .select("nombre, tipo_proteina, ingredientes_principales")
      .eq("usuario_id", usuario_id)
      .gte("ultima_vez", ninetyDaysAgo);

    const historialTexto = historial && historial.length > 0
      ? historial.map((r: any) => `- ${r.nombre} (${r.tipo_proteina})`).join("\n")
      : "Sin historial previo";

    const diasPlan = dias_solicitados || 28;
    const semanasNum = Math.ceil(diasPlan / 7);

    const systemPrompt = `Eres Chef AI de Paraguachi Meals Prep. 
Genera planes de comida personalizados.
IDIOMA: Responde TODO en ${lang === "en" ? "inglés" : "español"}, incluyendo nombres de recetas, instrucciones y consejos.
Responde SIEMPRE en formato JSON válido con esta estructura exacta:
{
  "analisis": {
    "ingredientes_detectados": ["lista de ingredientes que el usuario tiene"],
    "dias_posibles": ${diasPlan},
    "recetas_posibles": ${diasPlan * (preferencias.comidas?.length || 3)},
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

IMPORTANTE: 
- Genera exactamente ${semanasNum} semanas con 7 días cada una (${diasPlan} días total)
- Incluye las comidas solicitadas por el usuario
- Respeta todas las restricciones alimentarias
- Adapta las porciones al número de personas
- Calcula macros realistas
- Usa los ingredientes disponibles
- Incluye el análisis de ingredientes
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

    // Save recipes to catalog for anti-repetition
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

    // Upsert recipes (ignore conflicts on hash)
    if (recetasToInsert.length > 0) {
      for (const receta of recetasToInsert) {
        await supabase
          .from("recetas_catalogo")
          .upsert(receta, { onConflict: "hash" });
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

    return new Response(JSON.stringify({ plan_id: plan.id, plan: planJson, public_token: publicToken }), {
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
