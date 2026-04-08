import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { image_base64, type, idioma } = await req.json();

    if (!image_base64) {
      return new Response(JSON.stringify({ error: "No image provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const lang = idioma === "en" ? "en" : "es";
    const contextHint = type === "foto-recibo"
      ? (lang === "en" ? "This is a photo of a grocery receipt or shopping list." : "Esta es una foto de un recibo de compras o lista de supermercado.")
      : (lang === "en" ? "This is a photo of a fridge, pantry, or food items." : "Esta es una foto de una nevera, despensa o alimentos.");

    const systemPrompt = lang === "en"
      ? `You are a food ingredient recognition assistant for a meal prep app. Analyze the image and extract all food ingredients you can identify. Return ONLY valid JSON with this structure:
{
  "ingredientes": ["ingredient 1", "ingredient 2", ...],
  "confianza": "high" | "medium" | "low",
  "notas": "Any relevant notes about the image"
}
Keep ingredient names simple and common. Do not include non-food items, brands, or packaging.`
      : `Eres un asistente de reconocimiento de ingredientes para una app de meal prep. Analiza la imagen y extrae todos los ingredientes alimenticios que puedas identificar. Responde SOLO con JSON válido con esta estructura:
{
  "ingredientes": ["ingrediente 1", "ingrediente 2", ...],
  "confianza": "alta" | "media" | "baja",
  "notas": "Notas relevantes sobre la imagen"
}
Usa nombres simples y comunes para los ingredientes. No incluyas artículos no alimenticios, marcas o envases.`;

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
          {
            role: "user",
            content: [
              { type: "text", text: contextHint },
              { type: "image_url", image_url: { url: `data:image/jpeg;base64,${image_base64}` } },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: lang === "en" ? "Too many requests, try again later." : "Demasiadas solicitudes, intenta en unos minutos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: lang === "en" ? "Credits exhausted. Contact admin." : "Créditos agotados. Contacta al administrador." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI service error");
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content;
    if (!content) throw new Error("No AI response");

    let parsed;
    try {
      const jsonStr = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      parsed = JSON.parse(jsonStr);
    } catch {
      console.error("Failed to parse:", content);
      throw new Error("Failed to parse AI response");
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("recognize-ingredients error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
