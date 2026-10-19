// Supabase Edge Function: email-webhook
// Ingests inbound emails / Resend / SendGrid webhooks to log activities or trigger alerts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload = await req.json();
    console.log("[email-webhook] Received email event:", payload?.type || "inbound");

    // Process inbound email to associate with lead conversations
    const sender = payload?.from || payload?.sender;
    const recipient = payload?.to || payload?.recipient;
    const subject = payload?.subject || "No Subject";
    const bodyText = payload?.text || payload?.html || "";

    return new Response(
      JSON.stringify({
        received: true,
        processedAt: new Date().toISOString(),
        summary: { sender, recipient, subject, length: bodyText.length },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
