import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { action, data } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    let systemPrompt = "";
    let userPrompt = "";

    if (action === "analyze-prospect") {
      systemPrompt = `Você é Thor AI, um analista de prospects especialista em vendas B2B para palestrantes e consultoras executivas no Brasil.
Analise o prospect e retorne EXATAMENTE um JSON com esta estrutura:
{
  "priority": "high" | "medium" | "low",
  "confidence": number (0-100),
  "approach": "string com abordagem sugerida",
  "painPoints": ["array de dores identificadas"],
  "opportunities": ["array de oportunidades"],
  "personalizedMessage": "mensagem personalizada sugerida",
  "recommendedTiming": "melhor momento para contato",
  "companyInsights": {
    "revenue": "estimativa de receita ou null",
    "employees": number ou null,
    "recentNews": ["notícias recentes ou tendências"],
    "challenges": ["desafios do setor"]
  },
  "decisionMakerInfo": {
    "tenure": "tempo estimado no cargo",
    "background": "background profissional",
    "interests": ["interesses profissionais"],
    "connectionPoints": ["pontos de conexão com Paula Pimenta"]
  },
  "speakingOpportunities": {
    "events": ["tipos de eventos relevantes"],
    "topics": ["temas de palestra relevantes"],
    "budget": "estimativa de budget",
    "timing": "melhor período"
  }
}
Retorne SOMENTE o JSON, sem markdown, sem explicações.`;
      
      userPrompt = `Analise este prospect:
Nome: ${data.name}
Empresa: ${data.company}
Cargo: ${data.position}
${data.industry ? `Indústria: ${data.industry}` : ""}
${data.linkedin ? `LinkedIn: ${data.linkedin}` : ""}

Contexto: Paula Pimenta é palestrante executiva com 25+ anos em multinacionais (Natura, Danone, Unilever), especialista em Liderança, Autoliderança, Gestão de Pessoas e Empoderamento Feminino. Formatos: Palestra (R$10k), Keynote (R$10k), Workshop (R$20k), Programa (R$35k).`;

    } else if (action === "generate-message") {
      const lead = data.lead;
      const msgTypes: Record<string, string> = {
        initial_outreach: "Primeiro contato profissional - apresentação e proposta de valor",
        follow_up: "Follow-up cordial após contato anterior",
        meeting_request: "Solicitação de reunião para apresentar serviços",
        proposal: "Envio de proposta formal de palestra/workshop",
      };

      systemPrompt = `Você é Thor AI, especialista em outreach B2B para Paula Pimenta, palestrante e executiva.
Gere uma mensagem profissional, personalizada e persuasiva em português do Brasil.
A mensagem deve ser natural, não parecer template.
Retorne EXATAMENTE um JSON: {"message": "texto da mensagem", "confidence": number 0-100}
Retorne SOMENTE o JSON, sem markdown.`;

      userPrompt = `Gere uma mensagem de tipo: ${msgTypes[data.messageType] || data.messageType}
Para: ${lead.name} - ${lead.position} na ${lead.company}
${lead.industry ? `Indústria: ${lead.industry}` : ""}
${data.analysis ? `Análise prévia: ${JSON.stringify(data.analysis)}` : ""}
${data.customInstructions ? `Instruções adicionais: ${data.customInstructions}` : ""}

Paula Pimenta oferece: Palestras sobre Liderança, Autoliderança, Gestão de Pessoas, Mulheres na Liderança, Inovação. Formatos: Palestra 60min (R$10k), Keynote 45min (R$10k), Workshop 2h (R$20k), Programa 4 módulos (R$35k).`;

    } else if (action === "extract-prospects") {
      systemPrompt = `Você é Thor AI, um extrator de dados de prospecção especializado em mercado brasileiro.
Com base nos critérios de busca, gere uma lista de 5 a 10 prospects REALISTAS e relevantes que Paula Pimenta poderia abordar.

REGRAS CRÍTICAS PARA DADOS DE CONTATO:
- linkedin_url: Gere URLs REAIS do LinkedIn no formato "https://www.linkedin.com/in/nome-sobrenome" baseado no nome da pessoa. Use o padrão real do LinkedIn (nome em minúsculo, sem acentos, separado por hífen).
- email: Gere e-mails REAIS baseados no padrão corporativo da empresa. Pesquise o domínio real da empresa (ex: @natura.net, @ambev.com.br, @magazineluiza.com.br). Use padrões comuns como nome.sobrenome@dominio ou primeiro.ultimo@dominio.
- phone: Use formato brasileiro real com DDD da cidade correta (ex: +55 11 9xxxx-xxxx para SP).
- Todos os dados devem ser o MAIS REALISTAS possível, como se extraídos de um banco de dados real.

Retorne EXATAMENTE um JSON com esta estrutura:
{
  "prospects": [
    {
      "name": "Nome completo real",
      "position": "Cargo exato",
      "company": "Nome real da empresa",
      "industry": "Setor",
      "company_size": "Porte (startup/pme/media/grande/enterprise)",
      "location": "Cidade, Estado",
      "email": "email corporativo real baseado no domínio da empresa",
      "linkedin_url": "https://www.linkedin.com/in/slug-real-do-perfil",
      "phone": "telefone com DDD correto da cidade",
      "company_website": "https://www.empresa.com.br",
      "score": number 0-100,
      "reasoning": "Por que este prospect é relevante",
      "suggested_approach": "Como abordar este contato",
      "pain_points": ["dores prováveis"],
      "events_potential": ["tipos de eventos que pode contratar"]
    }
  ],
  "search_summary": "Resumo da busca realizada",
  "total_found": number
}
Retorne SOMENTE o JSON, sem markdown, sem explicações.`;

      userPrompt = `Extraia prospects com os seguintes critérios:
${data.query ? `Busca livre: ${data.query}` : ""}
${data.industry ? `Setor/Indústria: ${data.industry}` : ""}
${data.position ? `Cargo/Função: ${data.position}` : ""}
${data.company ? `Empresa: ${data.company}` : ""}
${data.location ? `Localização: ${data.location}` : ""}
${data.company_size ? `Porte: ${data.company_size}` : ""}
${data.event_type ? `Tipo de evento: ${data.event_type}` : ""}

IMPORTANTE: Use nomes de EMPRESAS REAIS do mercado brasileiro. Gere URLs de LinkedIn e e-mails no formato REAL dessas empresas. O domínio do e-mail deve ser o domínio corporativo real da empresa.

Contexto: Estes prospects devem ser potenciais contratantes de palestras e treinamentos corporativos. Paula Pimenta é especialista em Liderança, Autoliderança, Gestão de Pessoas, Empoderamento Feminino, com experiência em Natura, Danone, Unilever. Formatos: Palestra (R$10k), Keynote (R$10k), Workshop (R$20k), Programa (R$35k).`;

    } else {
      return new Response(JSON.stringify({ error: "Ação inválida" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit excedido. Tente novamente em alguns segundos." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes. Adicione créditos ao workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Erro no serviço de IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResult = await response.json();
    const content = aiResult.choices?.[0]?.message?.content || "";
    
    // Parse JSON from response, handling possible markdown wrapping
    let parsed;
    try {
      const jsonStr = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      parsed = JSON.parse(jsonStr);
    } catch {
      console.error("Failed to parse AI response:", content);
      if (action === "generate-message") {
        parsed = { message: content, confidence: 70 };
      } else {
        return new Response(JSON.stringify({ error: "Erro ao processar resposta da IA" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("thor-ai error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
