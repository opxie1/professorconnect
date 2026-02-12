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
    const { profileUrl, professorName } = await req.json();

    if (!profileUrl) {
      return new Response(
        JSON.stringify({ success: false, error: 'Profile URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const firecrawlKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!firecrawlKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Firecrawl connector not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: 'LOVABLE_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Scraping professor profile:', profileUrl);

    // Scrape the professor's profile page
    const scrapeResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${firecrawlKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: profileUrl,
        formats: ['markdown'],
        onlyMainContent: true,
        waitFor: 2000,
      }),
    });

    const scrapeData = await scrapeResponse.json();

    if (!scrapeResponse.ok) {
      console.error('Firecrawl API error:', scrapeData);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to scrape professor profile' }),
        { status: scrapeResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const markdown = scrapeData.data?.markdown || scrapeData.markdown || '';

    // Use AI to analyze the professor's research interests
    const analysisPrompt = `You are analyzing a university professor's profile page. Your task is to identify their research interests and summarize them in EXTREMELY BROAD terms that a high school student could understand and express interest in.

Professor: ${professorName || 'Unknown'}
Profile content:
${markdown.substring(0, 10000)}

INSTRUCTIONS:
1. Identify the professor's main research areas from:
   - Their stated research interests
   - Their publications
   - Their lab/group descriptions
   - Their course descriptions

2. Summarize these into ONE OR TWO extremely broad phrases that capture the essence of their work.
   - Good examples: "machine learning and artificial intelligence", "cancer biology and treatment", "renewable energy systems", "financial markets and economics", "organic chemistry", "climate science"
   - Bad examples: "investigating the role of CRISPR-Cas9 in gene editing of human embryonic stem cells" (too specific)

3. Also extract their email if visible on the page.

Respond with JSON only:
{
  "researchInterests": "one or two broad phrases describing their research",
  "email": "email@university.edu or null if not found",
  "publications": ["list of 3-5 recent publication titles if visible"],
  "summary": "2-3 sentence summary of their research focus"
}`;

    // Retry with exponential backoff for rate limits
    let aiResponse: Response | null = null;
    const maxRetries = 5;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: "You are an expert at understanding academic research and summarizing it in accessible terms. Always respond with valid JSON only." },
            { role: "user", content: analysisPrompt },
          ],
        }),
      });

      if (aiResponse.status === 429) {
        const waitMs = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
        console.log(`Rate limited on attempt ${attempt + 1}, waiting ${Math.round(waitMs)}ms`);
        await aiResponse.text(); // consume body
        await new Promise(resolve => setTimeout(resolve, waitMs));
        continue;
      }
      break;
    }

    if (!aiResponse || !aiResponse.ok) {
      if (aiResponse?.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: 'Rate limit exceeded after retries. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (aiResponse?.status === 402) {
        return new Response(
          JSON.stringify({ success: false, error: 'AI credits exhausted. Please add credits to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = aiResponse ? await aiResponse.text() : 'No response';
      console.error('AI API error:', errorText);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to analyze research interests' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices?.[0]?.message?.content || '{}';
    
    let analysis = {
      researchInterests: 'their research area',
      email: null as string | null,
      publications: [] as string[],
      summary: '',
    };

    try {
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = { ...analysis, ...JSON.parse(jsonMatch[0]) };
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
    }

    console.log('Research analysis complete for:', professorName);

    return new Response(
      JSON.stringify({ 
        success: true,
        researchInterests: analysis.researchInterests,
        email: analysis.email,
        publications: analysis.publications,
        summary: analysis.summary,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error analyzing research:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to analyze research';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
