import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { ingredientes, preferencias, usuario_id } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `Eres Chef AI de Paraguachi Meals Prep. 
Genera planes de comida personalizados de 4 semanas (28 días).
Responde SIEMPRE en formato JSON válido con esta estructura exacta:
{
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

IMPORTANTE: 
- Genera exactamente 4 semanas con 7 días cada una
- Incluye las comidas solicitadas por el usuario
- Respeta todas las restricciones alimentarias
- Adapta las porciones al número de personas
- Calcula macros realistas
- Usa los ingredientes disponibles
- Responde SOLO con el JSON, sin texto adicional`;

    const userMessage = `Genera un plan de 28 días con estos datos:
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

    // Parse JSON from response (handle markdown code blocks)
    let planJson;
    try {
      const jsonStr = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      planJson = JSON.parse(jsonStr);
    } catch {
      console.error("Failed to parse AI response:", content);
      throw new Error("Error al procesar la respuesta del AI");
    }

    // Save to database
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: plan, error: dbError } = await supabase
      .from("planes")
      .insert({
        usuario_id: usuario_id,
        ingredientes: ingredientes,
        plan_json: planJson,
        semanas: 4,
      })
      .select("id")
      .single();

    if (dbError) {
      console.error("DB error:", dbError);
      throw new Error("Error al guardar el plan");
    }

    return new Response(JSON.stringify({ plan_id: plan.id, plan: planJson }), {
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
