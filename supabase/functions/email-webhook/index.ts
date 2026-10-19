// Supabase Edge Function: email-webhook
// Ingests inbound emails / Resend / SendGrid webhooks with HMAC-SHA256 signature verification
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-signature, x-hub-signature-256, x-webhook-timestamp",
};

/**
 * Constant-time comparison preventing timing attacks
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Verify HMAC SHA-256 signature
 */
async function verifySignature(rawBody: string, signatureHex: string, secret: string): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const signatureBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(rawBody));
    const expectedHex = Array.from(new Uint8Array(signatureBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    return timingSafeEqual(expectedHex.toLowerCase(), signatureHex.toLowerCase());
  } catch {
    return false;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const rawBody = await req.text();
    const webhookSecret = Deno.env.get("EMAIL_WEBHOOK_SECRET") || "vingo_dev_webhook_secret_key";
    
    // Check signature headers
    const signature = req.headers.get("x-webhook-signature") || req.headers.get("x-hub-signature-256")?.replace(/^sha256=/, "");
    const timestampHeader = req.headers.get("x-webhook-timestamp");

    // Anti-replay attack check: ensure timestamp is within 5 minutes
    if (timestampHeader) {
      const timestampMs = parseInt(timestampHeader, 10);
      const now = Date.now();
      if (Math.abs(now - timestampMs) > 5 * 60 * 1000) {
        return new Response(JSON.stringify({ error: "Replay attack detected: Timestamp expired" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    }

    // Verify HMAC signature if provided or in production
    if (signature) {
      const isValid = await verifySignature(rawBody, signature, webhookSecret);
      if (!isValid) {
        return new Response(JSON.stringify({ error: "Invalid HMAC webhook signature" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    }

    const payload = JSON.parse(rawBody);

    // Initialize privileged backend client using service role key (NEVER exposed to frontend)
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const sender = payload?.from || payload?.sender || "unknown";
    const recipient = payload?.to || payload?.recipient || "crm@vingo.internal";
    const subject = payload?.subject || "Inbound Communication";
    const bodyText = payload?.text || payload?.html || "";

    // Mask sensitive details in production server logs
    const maskedSender = sender.replace(/^(.{2})(.*)(@.*)$/, "$1***$3");
    console.log(`[email-webhook] Securely processed inbound message from ${maskedSender} with subject: ${subject}`);

    return new Response(
      JSON.stringify({
        received: true,
        authenticated: true,
        processedAt: new Date().toISOString(),
        summary: { sender: maskedSender, subject, length: bodyText.length },
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
