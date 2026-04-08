import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Verify caller is admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !userData.user) throw new Error("Not authenticated");

    const { data: roleData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) throw new Error("Not authorized - admin role required");

    const { action, ...params } = await req.json();

    if (action === "create_user") {
      const { email, password, nombre, etiqueta, subscribe_days } = params;
      if (!email || !password) throw new Error("Email and password required");

      // Create user via admin API
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { nombre: nombre || "" },
      });

      if (createError) throw new Error(`Failed to create user: ${createError.message}`);

      const userId = newUser.user.id;

      // Update profile with tag and optional subscription
      const profileUpdate: Record<string, any> = {};
      if (etiqueta) profileUpdate.etiqueta = etiqueta;

      if (subscribe_days && Number(subscribe_days) > 0) {
        const until = new Date();
        until.setDate(until.getDate() + Number(subscribe_days));
        profileUpdate.suscripcion_activa = true;
        profileUpdate.suscripcion_hasta = until.toISOString();
      }

      if (Object.keys(profileUpdate).length > 0) {
        const { error: updateError } = await supabaseAdmin
          .from("profiles")
          .update(profileUpdate)
          .eq("id", userId);
        if (updateError) console.error("Profile update error:", updateError.message);
      }

      return new Response(JSON.stringify({ success: true, user_id: userId }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "set_subscription") {
      const { user_id, active, days } = params;
      if (!user_id) throw new Error("user_id required");

      const updateData: Record<string, any> = {
        suscripcion_activa: !!active,
      };

      if (active && days) {
        const until = new Date();
        until.setDate(until.getDate() + Number(days));
        updateData.suscripcion_hasta = until.toISOString();
      } else if (!active) {
        updateData.suscripcion_activa = false;
      }

      const { error: updateError } = await supabaseAdmin
        .from("profiles")
        .update(updateData)
        .eq("id", user_id);

      if (updateError) throw new Error(`Failed to update subscription: ${updateError.message}`);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "set_tag") {
      const { user_id, etiqueta } = params;
      if (!user_id) throw new Error("user_id required");

      const { error: updateError } = await supabaseAdmin
        .from("profiles")
        .update({ etiqueta: etiqueta || null })
        .eq("id", user_id);

      if (updateError) throw new Error(`Failed to update tag: ${updateError.message}`);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "delete_user") {
      const { user_id } = params;
      if (!user_id) throw new Error("user_id required");

      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user_id);
      if (deleteError) throw new Error(`Failed to delete user: ${deleteError.message}`);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
