import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface Professor {
  name: string;
  lastName: string;
  email: string | null;
  profileUrl: string;
  title: string | null;
  department: string | null;
  imageUrl: string | null;
  isResearchActive: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { facultyUrl, department } = await req.json();

    if (!facultyUrl) {
      return new Response(
        JSON.stringify({ success: false, error: 'Faculty URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!apiKey) {
      console.error('FIRECRAWL_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Firecrawl connector not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Scraping faculty page:', facultyUrl);

    // First, use Firecrawl to scrape the faculty directory page
    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: facultyUrl,
        formats: ['markdown', 'links', 'html'],
        onlyMainContent: true,
        waitFor: 3000,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Firecrawl API error:', data);
      return new Response(
        JSON.stringify({ success: false, error: data.error || `Request failed with status ${response.status}` }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Faculty page scraped successfully');

    // Now use the AI to extract professor information from the scraped content
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: 'LOVABLE_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const markdown = data.data?.markdown || data.markdown || '';
    const links = data.data?.links || data.links || [];

    const extractionPrompt = `You are analyzing a university faculty directory page. Extract information about professors/faculty members from this content.

For each professor found, extract:
1. Full name
2. Email address (if visible)
3. Profile page URL (from the links provided)
4. Title/position (e.g., "Professor", "Associate Professor", "Assistant Professor")
5. Whether they appear to be research-active (NOT emeritus, NOT "Professor of Practice", NOT lecturers unless they mention research)

IMPORTANT CLASSIFICATION RULES:
- Research-active: Professors, Associate Professors, Assistant Professors who conduct research
- NOT research-active: Emeritus Professors, Professors of Practice, Lecturers (unless specifically research-focused), Visiting Professors, Adjunct Professors

Content to analyze:
${markdown.substring(0, 15000)}

Available links on the page:
${JSON.stringify(links.slice(0, 100))}

Respond with a JSON array of professors. Each professor object should have:
{
  "name": "Full Name",
  "email": "email@university.edu or null",
  "profileUrl": "URL to their profile page",
  "title": "Their academic title",
  "isResearchActive": true/false
}

Only include actual faculty members, not staff or administrators.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are an expert at extracting structured data from university faculty web pages. Always respond with valid JSON only." },
          { role: "user", content: extractionPrompt },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', errorText);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to analyze faculty page' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices?.[0]?.message?.content || '[]';
    
    // Parse the JSON from the AI response
    let professors: Professor[] = [];
    try {
      // Try to extract JSON from the response (it might have markdown code blocks)
      const jsonMatch = aiContent.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        professors = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      professors = [];
    }

    // Process and clean up professor data
    const processedProfessors = professors.map((prof: any) => {
      const nameParts = prof.name?.split(' ') || [];
      const lastName = nameParts[nameParts.length - 1] || prof.name;
      
      return {
        name: prof.name || 'Unknown',
        lastName: lastName,
        email: prof.email || null,
        profileUrl: prof.profileUrl || '',
        title: prof.title || null,
        department: department || null,
        imageUrl: null,
        isResearchActive: prof.isResearchActive ?? true,
      };
    });

    console.log(`Found ${processedProfessors.length} professors`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        professors: processedProfessors,
        total: processedProfessors.length,
        researchActive: processedProfessors.filter((p: Professor) => p.isResearchActive).length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error scraping faculty:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to scrape faculty';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
