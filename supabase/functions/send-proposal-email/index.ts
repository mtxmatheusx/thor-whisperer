import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { recipientEmail, recipientName, proposalText, subject } = await req.json();

    if (!recipientEmail || !proposalText) {
      return new Response(JSON.stringify({ error: "Email e texto da proposta são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Use AI to format the proposal as a professional HTML email
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `Converta o texto da proposta em HTML profissional para e-mail. Use estilo inline.
Cores: azul escuro #1B2A4A para cabeçalho, cobre #C47B3B para destaques.
Inclua cabeçalho com "Paula Pimenta — Proposta Comercial" e rodapé com contatos.
Retorne SOMENTE o HTML, sem markdown, sem explicações.`
          },
          { role: "user", content: proposalText }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit. Tente novamente em alguns segundos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI gateway error");
    }

    const aiResult = await response.json();
    const htmlContent = aiResult.choices?.[0]?.message?.content || "";
    const cleanHtml = htmlContent.replace(/```html\n?/g, "").replace(/```\n?/g, "").trim();

    // Return the formatted HTML for now (email sending requires domain setup)
    return new Response(JSON.stringify({
      success: true,
      htmlContent: cleanHtml,
      message: `Proposta formatada para ${recipientName || recipientEmail}. Configure um domínio de e-mail para envio automático.`,
      recipient: recipientEmail,
      subject: subject || `Proposta Comercial — Paula Pimenta`,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("send-proposal-email error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
