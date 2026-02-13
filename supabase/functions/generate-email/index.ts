import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const DEFAULT_TEMPLATE = `Dear Professor {professorLastName},

I hope you are doing well. My name is {yourName}, and I am currently a high school student at {yourSchool} in {yourLocation}. I am reaching out to inquire if there is a potential opportunity, paid or unpaid, for me to act as an intern or assistant for you, or if I could work alongside you with a potential research study. I am particularly interested in {researchInterests}, as well as data science and analytics.

{yourExperience}

{yourAchievements}

I am very enthusiastic about contributing to a potential research study or assisting you with your work, and I am confident that my experience would make me a valuable addition. I am willing to contribute up to {hoursPerWeek} hours a week to assist with any tasks or projects you may need help with.

I would greatly appreciate your consideration if there is an opportunity for me. I thank you for your time and would be honored to discuss any potential opportunities with you further. Please let me know if there is a good time for us to meet or if you would like me to provide any documents or materials.

Additionally, I have attached my resume, which outlines more of my experience and background.

Hope to hear from you soon.

Sincerely,
{yourName}`;

// Known placeholders that can be filled from user info directly
const KNOWN_PLACEHOLDERS: Record<string, (userInfo: any, professorLastName: string) => string> = {
  'professorLastName': (_ui, pln) => pln,
  'yourName': (ui) => ui?.name || '[Your Name]',
  'yourSchool': (ui) => ui?.school || '[Your School]',
  'yourLocation': (ui) => ui?.location || '[Your Location]',
  'yourExperience': (ui) => ui?.experience || 'I have experience with programming and data analysis, and I am eager to learn more about research in this field.',
  'yourAchievements': (ui) => ui?.achievements || 'I have demonstrated my ability to work on complex projects and deliver results.',
  'hoursPerWeek': (ui) => ui?.hoursPerWeek || '30',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { professorLastName, researchInterests, userInfo, emailTemplate } = await req.json();

    if (!professorLastName || !researchInterests) {
      return new Response(
        JSON.stringify({ success: false, error: 'Professor name and research interests are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const template = emailTemplate || DEFAULT_TEMPLATE;

    // Find all {placeholders} in the template
    const placeholderRegex = /\{([^}]+)\}/g;
    const allPlaceholders = [...template.matchAll(placeholderRegex)].map((m: RegExpMatchArray) => m[1]);
    const uniquePlaceholders = [...new Set(allPlaceholders)];

    // Separate known vs unknown (AI-needed) placeholders
    const aiPlaceholders = uniquePlaceholders.filter(p => !KNOWN_PLACEHOLDERS[p]);

    let emailBody = template;

    // Fill known placeholders first
    for (const [key, resolver] of Object.entries(KNOWN_PLACEHOLDERS)) {
      emailBody = emailBody.replaceAll(`{${key}}`, resolver(userInfo, professorLastName));
    }

    // If there are AI placeholders, use Lovable AI to fill them
    if (aiPlaceholders.length > 0) {
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) {
        // Fallback: just leave placeholders as-is with brackets
        console.warn("LOVABLE_API_KEY not set, AI placeholders won't be filled");
      } else {
        const prompt = `You are filling in placeholders for a cold email to Professor ${professorLastName}.

The professor's research interests are: ${researchInterests}

Fill in each placeholder below with appropriate, natural-sounding text. Return ONLY a JSON object mapping each placeholder name to its value. Do not include any extra text.

Placeholders to fill:
${aiPlaceholders.map(p => `- {${p}}: infer from context`).join('\n')}`;

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
                { role: "system", content: "You fill in email template placeholders. Return only valid JSON mapping placeholder names to their values. No markdown, no code fences." },
                { role: "user", content: prompt },
              ],
            }),
          });

          if (aiResponse.ok) {
            const aiData = await aiResponse.json();
            const content = aiData.choices?.[0]?.message?.content?.trim();
            if (content) {
              // Try to parse JSON from response (strip code fences if present)
              const jsonStr = content.replace(/^```json?\s*/, '').replace(/\s*```$/, '');
              const filledValues = JSON.parse(jsonStr);
              for (const placeholder of aiPlaceholders) {
                if (filledValues[placeholder]) {
                  emailBody = emailBody.replaceAll(`{${placeholder}}`, filledValues[placeholder]);
                }
              }
            }
          } else {
            console.error("AI gateway error:", aiResponse.status, await aiResponse.text());
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
