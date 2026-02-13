import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { professorLastName, researchInterests, emailTemplate } = await req.json();

    if (!professorLastName || !researchInterests) {
      return new Response(
        JSON.stringify({ success: false, error: 'Professor name and research interests are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!emailTemplate) {
      return new Response(
        JSON.stringify({ success: false, error: 'Email template is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find all {placeholders} in the template
    const placeholderRegex = /\{([^}]+)\}/g;
    const allPlaceholders = [...emailTemplate.matchAll(placeholderRegex)].map((m: RegExpMatchArray) => m[1]);
    const uniquePlaceholders = [...new Set(allPlaceholders)];

    let emailBody = emailTemplate;

    if (uniquePlaceholders.length > 0) {
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) {
        console.warn("LOVABLE_API_KEY not set, placeholders won't be filled");
      } else {
        const prompt = `You are filling in placeholders for a cold email to Professor ${professorLastName}.

The professor's research interests are: ${researchInterests}

The email template has these placeholders in {curly brackets}. Fill each one with appropriate text.

Placeholders:
${uniquePlaceholders.map(p => `- {${p}}`).join('\n')}

Return ONLY a JSON object mapping each placeholder name to its replacement value. No extra text, no markdown fences.`;

        try {
          const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-3-flash-preview",
              messages: [
                { role: "system", content: "You fill in email template placeholders based on professor research data. Return only valid JSON mapping placeholder names to values. No markdown, no code fences, no extra text." },
                { role: "user", content: prompt },
              ],
            }),
          });

          if (aiResponse.ok) {
            const aiData = await aiResponse.json();
            const content = aiData.choices?.[0]?.message?.content?.trim();
            if (content) {
              const jsonStr = content.replace(/^```json?\s*/, '').replace(/\s*```$/, '');
              const filledValues = JSON.parse(jsonStr);
              for (const placeholder of uniquePlaceholders) {
                if (filledValues[placeholder]) {
                  emailBody = emailBody.replaceAll(`{${placeholder}}`, filledValues[placeholder]);
                }
              }
            }
          } else {
            const errText = await aiResponse.text();
            console.error("AI gateway error:", aiResponse.status, errText);
            if (aiResponse.status === 429) {
              return new Response(
                JSON.stringify({ success: false, error: "Rate limit exceeded. Please try again in a moment." }),
                { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              );
            }
            if (aiResponse.status === 402) {
              return new Response(
                JSON.stringify({ success: false, error: "AI credits exhausted. Please add funds." }),
                { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              );
            }
          }
        } catch (aiError) {
          console.error("Error calling AI for placeholders:", aiError);
        }
      }
    }

    const emailSubject = "Inquiry About Research or Internship Opportunity";

    return new Response(
      JSON.stringify({ 
        success: true,
        subject: emailSubject,
        body: emailBody,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error generating email:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate email';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
