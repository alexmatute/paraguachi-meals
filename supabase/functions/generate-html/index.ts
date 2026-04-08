import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function generateHTML(planJson: any, createdAt: string): string {
  const weeks = planJson.semanas || [];
  const proteinColors: Record<string, string> = {
    pollo: "#7EC850",
    res: "#E8A830",
    cerdo: "#E8A830",
    pescado: "#EF4444",
    vegetariano: "#10B981",
  };

  let weekTabs = "";
  let weekContents = "";

  weeks.forEach((week: any, wi: number) => {
    weekTabs += `<button class="tab${wi === 0 ? " active" : ""}" onclick="showWeek(${wi})">Semana ${wi + 1}</button>`;

    let daysHtml = "";
    (week.dias || []).forEach((day: any, di: number) => {
      let mealsHtml = "";
      (day.comidas || []).forEach((meal: any) => {
        const color = proteinColors[meal.tipo_proteina] || "#888";
        const ingredients = (meal.ingredientes || []).map((i: any) => `<span class="tag">${i.cantidad} ${i.nombre}</span>`).join("");
        const steps = (meal.pasos || []).map((p: any) => `<li><strong>${p.titulo || `Paso ${p.numero}`}:</strong> ${p.instruccion}</li>`).join("");
        const storage = meal.almacenamiento ? `<p class="tip">💡 ${meal.almacenamiento.meal_prep || meal.almacenamiento.refrigerador || ""}</p>` : "";

        mealsHtml += `
        <div class="recipe-card">
          <div class="recipe-header">
            <div>
              <span class="meal-type">${meal.tipo}</span>
              <h4>${meal.nombre}</h4>
            </div>
            <span class="protein-badge" style="background:${color}20;color:${color}">${meal.tipo_proteina}</span>
          </div>
          <div class="meta">
            <span>⏱ ${(meal.tiempo_prep || 0) + (meal.tiempo_coccion || 0)} min</span>
            <span>🔥 ${meal.calorias} kcal</span>
            <span>👥 ${meal.porciones} porc.</span>
          </div>
          <div class="macros">
            <div><small>Prot</small><strong>${meal.proteinas}g</strong></div>
            <div><small>Carbs</small><strong>${meal.carbohidratos}g</strong></div>
            <div><small>Grasas</small><strong>${meal.grasas}g</strong></div>
          </div>
          <div class="tags">${ingredients}</div>
          <details><summary>Ver pasos</summary><ol>${steps}</ol></details>
          ${storage}
        </div>`;
      });

      daysHtml += `<div class="day"><h3>Día ${day.numero || di + 1}</h3><div class="meals-grid">${mealsHtml}</div></div>`;
    });

    // Shopping list
    let shoppingHtml = "";
    if (week.lista_compras) {
      shoppingHtml = `<div class="shopping-section"><h3>🛒 Lista de compras — Semana ${wi + 1}</h3><div class="shopping-grid">`;
      for (const [cat, items] of Object.entries(week.lista_compras)) {
        const itemsList = (items as string[] || []).map(i => `<li>${i}</li>`).join("");
        shoppingHtml += `<div><h4>${cat}</h4><ul>${itemsList}</ul></div>`;
      }
      shoppingHtml += `</div></div>`;
    }

    const mealPrepHtml = week.guia_meal_prep ? `<div class="meal-prep"><h3>📖 Guía de Meal Prep</h3><p>${week.guia_meal_prep}</p></div>` : "";

    weekContents += `<div class="week-content${wi === 0 ? " active" : ""}" id="week-${wi}">${daysHtml}${shoppingHtml}${mealPrepHtml}</div>`;
  });

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Plan de Comidas — Paraguachi Meals Prep</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#000;color:#e5e5e5;font-family:'Segoe UI',system-ui,sans-serif;line-height:1.5}
.container{max-width:1100px;margin:0 auto;padding:20px}
header{text-align:center;padding:30px 0;border-bottom:1px solid #222}
header h1{color:#7EC850;font-size:24px;margin-bottom:4px}
header p{color:#888;font-size:13px}
.tabs{display:flex;gap:8px;justify-content:center;margin:24px 0;flex-wrap:wrap}
.tab{background:#111;border:1px solid #333;color:#888;padding:8px 20px;border-radius:8px;cursor:pointer;font-size:14px;transition:.2s}
.tab:hover{border-color:#7EC850;color:#7EC850}
.tab.active{background:#7EC850;color:#000;border-color:#7EC850;font-weight:600}
.week-content{display:none}
.week-content.active{display:block}
.day{margin-bottom:24px}
.day h3{color:#7EC850;font-size:16px;margin-bottom:12px;padding-bottom:6px;border-bottom:1px solid #222}
.meals-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:12px}
.recipe-card{background:#111;border:1px solid #222;border-radius:12px;padding:16px}
.recipe-header{display:flex;justify-content:space-between;align-items:start;margin-bottom:10px}
.meal-type{font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#888}
.recipe-header h4{font-size:14px;margin-top:2px}
.protein-badge{font-size:10px;padding:2px 8px;border-radius:20px;font-weight:600}
.meta{display:flex;gap:12px;font-size:12px;color:#888;margin-bottom:10px}
.macros{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;text-align:center;margin-bottom:10px}
.macros div{background:#1a1a1a;padding:6px;border-radius:6px}
.macros small{font-size:10px;color:#888;display:block}
.macros strong{font-size:13px}
.tags{display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px}
.tag{background:#1a1a1a;color:#888;padding:2px 8px;border-radius:20px;font-size:10px}
details{margin-top:8px}
summary{color:#7EC850;font-size:12px;cursor:pointer;font-weight:600}
details ol{margin-top:8px;padding-left:20px}
details li{font-size:12px;color:#aaa;margin-bottom:4px}
.tip{font-size:11px;color:#888;font-style:italic;margin-top:8px}
.shopping-section,.meal-prep{background:#111;border:1px solid #222;border-radius:12px;padding:20px;margin-top:16px}
.shopping-section h3,.meal-prep h3{font-size:15px;margin-bottom:12px}
.shopping-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:16px}
.shopping-grid h4{color:#7EC850;font-size:12px;text-transform:capitalize;margin-bottom:6px}
.shopping-grid ul{list-style:none}
.shopping-grid li{font-size:12px;color:#aaa;padding:2px 0}
.shopping-grid li::before{content:"• ";color:#7EC850}
.meal-prep p{font-size:13px;color:#aaa;white-space:pre-line}
footer{text-align:center;padding:30px 0;border-top:1px solid #222;margin-top:40px;color:#555;font-size:11px}
.print-btn{display:block;margin:20px auto;background:#7EC850;color:#000;border:none;padding:10px 24px;border-radius:8px;font-weight:600;cursor:pointer;font-size:14px}
@media print{.tabs,.print-btn{display:none}.week-content{display:block!important;page-break-after:always}body{background:#fff;color:#000}.recipe-card{border-color:#ddd}.macros div{background:#f5f5f5}}
@media(max-width:640px){.meals-grid{grid-template-columns:1fr}.container{padding:12px}}
</style>
</head>
<body>
<div class="container">
<header>
<h1>🍽️ Paraguachi Meals Prep</h1>
<p>Plan generado el ${new Date(createdAt).toLocaleDateString("es-ES", { year: "numeric", month: "long", day: "numeric" })}</p>
</header>
<button class="print-btn" onclick="window.print()">🖨️ Imprimir</button>
<div class="tabs">${weekTabs}</div>
${weekContents}
<footer>
Paraguachi Meals Prep · Ing. Chef Alexander Matute & Ing. Nelly Rendón, Especialista en Manipulación y Conservación de Alimentos · Los Angeles, CA
</footer>
</div>
<script>
function showWeek(i){
  document.querySelectorAll('.week-content').forEach(e=>e.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(e=>e.classList.remove('active'));
  document.getElementById('week-'+i).classList.add('active');
  document.querySelectorAll('.tab')[i].classList.add('active');
}
</script>
</body>
</html>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { plan_id } = await req.json();
    if (!plan_id) throw new Error("plan_id es requerido");

    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: plan, error } = await supabase
      .from("planes")
      .select("plan_json, creado_en")
      .eq("id", plan_id)
      .single();

    if (error || !plan) throw new Error("Plan no encontrado");

    const html = generateHTML(plan.plan_json, plan.creado_en);

    // Save HTML to plan
    await supabase.from("planes").update({ plan_html: html }).eq("id", plan_id);

    return new Response(JSON.stringify({ html }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-html error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
