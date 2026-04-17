import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    const { image_base64, lang = "es" } = await req.json();
    if (!image_base64) return json({ error: "image_base64 required" }, 400);

    const prompt = lang === "es"
      ? `Analiza este screenshot de entrenamiento (Apple Watch, Fitbit, Garmin, Strava o similar). Extrae los datos disponibles. Responde SOLO con JSON sin markdown:
{
  "tipo": "correr|caminar|ciclismo|fuerza|hiit|natacion|yoga|otro",
  "duracion_min": 0,
  "kcal": 0,
  "distancia_km": 0,
  "ritmo_cardiaco_promedio": 0,
  "dispositivo": "Apple Watch|Fitbit|Garmin|Strava|Otro",
  "fecha_detectada": "YYYY-MM-DD o null",
  "confianza": "alta|media|baja",
  "resumen": "descripción breve del entrenamiento detectado"
}
Si un campo no está visible, usa null. No inventes valores.`
      : `Analyze this workout screenshot. Extract available data. Respond ONLY with JSON (no markdown): {tipo, duracion_min, kcal, distancia_km, ritmo_cardiaco_promedio, dispositivo, fecha_detectada, confianza, resumen}. Use null for missing fields.`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: image_base64 } },
            ],
          },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) return json({ error: "Rate limit exceeded" }, 429);
      if (aiResp.status === 402) return json({ error: "Add credits to workspace" }, 402);
      console.error("AI error", aiResp.status, await aiResp.text());
      return json({ error: "AI gateway error" }, 500);
    }

    const aiData = await aiResp.json();
    const content = aiData.choices?.[0]?.message?.content || "{}";
    let parsed;
    try { parsed = JSON.parse(content); } catch { parsed = { resumen: content }; }

    return json({ success: true, data: parsed });
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
