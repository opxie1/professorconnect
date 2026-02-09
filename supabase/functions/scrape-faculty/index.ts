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

async function scrapeUrl(apiKey: string, url: string, useActions = false): Promise<{ markdown: string; links: string[] }> {
  const body: Record<string, unknown> = {
    url,
    formats: ['markdown', 'links'],
    onlyMainContent: true,
    waitFor: 5000,
  };

  // For main faculty pages, scroll repeatedly to trigger lazy-loading
  if (useActions) {
    body.actions = [
      { type: 'wait', milliseconds: 2000 },
      { type: 'scroll', direction: 'down', amount: 3 },
      { type: 'wait', milliseconds: 2000 },
      { type: 'scroll', direction: 'down', amount: 3 },
      { type: 'wait', milliseconds: 2000 },
      { type: 'scroll', direction: 'down', amount: 5 },
      { type: 'wait', milliseconds: 2000 },
      { type: 'scroll', direction: 'down', amount: 5 },
      { type: 'wait', milliseconds: 2000 },
    ];
  }

  const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();
  if (!response.ok) {
    console.error('Firecrawl scrape error for', url, data);
    return { markdown: '', links: [] };
  }

  return {
    markdown: data.data?.markdown || data.markdown || '',
    links: data.data?.links || data.links || [],
  };
}

async function mapSite(apiKey: string, url: string): Promise<string[]> {
  // Run multiple map searches to discover more pages
  const searches = ['faculty people directory professors', 'faculty list members staff'];
  const allLinks = new Set<string>();

  await Promise.all(searches.map(async (search) => {
    try {
      const response = await fetch('https://api.firecrawl.dev/v1/map', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url,
          search,
          limit: 500,
          includeSubdomains: true,
        }),
      });

      const data = await response.json();
      if (response.ok && data.links) {
        for (const link of data.links) allLinks.add(link);
      } else {
        console.error('Firecrawl map error:', data);
      }
    } catch (err) {
      console.error('Map failed:', err);
    }
  }));

  return Array.from(allLinks);
}

function findPaginationUrls(baseUrl: string, allLinks: string[]): string[] {
  const base = new URL(baseUrl);
  const basePath = base.pathname.replace(/\/$/, '');
  
  const paginationPatterns = [
    /[?&]page=\d+/i,
    /\/page\/\d+/i,
    /[?&]p=\d+/i,
    /[?&]offset=\d+/i,
    /[?&]start=\d+/i,
    /[?&]pg=\d+/i,
  ];

  const seen = new Set<string>();
  seen.add(baseUrl);

  const paginationUrls: string[] = [];

  for (const link of allLinks) {
    try {
      const linkUrl = new URL(link, baseUrl);
      const linkPath = linkUrl.pathname.replace(/\/$/, '');
      
      // Check if this link is on the same domain
      if (linkUrl.hostname !== base.hostname) continue;
      
      // Check if it's a pagination variant of the base URL
      const isPagination = paginationPatterns.some(p => p.test(link));
      const isSamePath = linkPath === basePath || linkPath.startsWith(basePath + '/page/');
      
      if (isPagination && isSamePath) {
        const normalized = linkUrl.href;
        if (!seen.has(normalized)) {
          seen.add(normalized);
          paginationUrls.push(normalized);
        }
      }
    } catch {
      // skip invalid URLs
    }
  }

  return paginationUrls;
}

function findRelatedFacultyPages(baseUrl: string, mappedUrls: string[]): string[] {
  const base = new URL(baseUrl);
  const basePath = base.pathname.replace(/\/$/, '');
  
  const facultyKeywords = ['faculty', 'people', 'staff', 'directory', 'professors', 'members', 'department'];
  const profileKeywords = ['profile', 'bio', 'cv', 'vitae', 'resume'];
  const seen = new Set<string>();
  seen.add(baseUrl);
  const related: string[] = [];

  for (const link of mappedUrls) {
    try {
      const linkUrl = new URL(link);
      if (linkUrl.hostname !== base.hostname) continue;
      
      const linkPath = linkUrl.pathname.replace(/\/$/, '');
      
      // Skip if it's the same page
      if (linkPath === basePath) continue;
      
      // Skip individual profile pages (they have query params like ?id= or very deep paths)
      const isProfile = profileKeywords.some(k => linkPath.toLowerCase().includes(k)) || 
                        linkUrl.search.includes('id=');
      if (isProfile) continue;

      // Include pages that share a common ancestor or have faculty keywords
      const isChild = linkPath.startsWith(basePath + '/');
      const hasFacultyKeyword = facultyKeywords.some(k => linkPath.toLowerCase().includes(k));
      const pathDepth = linkPath.split('/').filter(Boolean).length;
      
      // Allow deeper paths (up to depth 6) as long as they look like listing pages
      if ((isChild || hasFacultyKeyword) && pathDepth <= 6) {
        if (!seen.has(link)) {
          seen.add(link);
          related.push(link);
        }
      }
    } catch {
      // skip
    }
  }

  return related.slice(0, 20);
}

async function extractProfessors(
  LOVABLE_API_KEY: string,
  markdown: string,
  links: string[],
  pageUrl: string
): Promise<any[]> {
  const extractionPrompt = `You are analyzing a university faculty directory page. Extract information about professors/faculty members from this content.

For each professor found, extract:
1. Full name
2. Email address (if visible)
3. Profile page URL (from the links provided, match by professor name)
4. Title/position (e.g., "Professor", "Associate Professor", "Assistant Professor")
5. Whether they appear to be research-active (NOT emeritus, NOT "Professor of Practice", NOT lecturers unless they mention research)

IMPORTANT CLASSIFICATION RULES:
- Research-active: Professors, Associate Professors, Assistant Professors who conduct research
- NOT research-active: Emeritus Professors, Professors of Practice, Lecturers (unless specifically research-focused), Visiting Professors, Adjunct Professors

Page URL: ${pageUrl}

Content to analyze:
${markdown.substring(0, 30000)}

Available links on the page:
${JSON.stringify(links.slice(0, 200))}

Respond with a JSON array of professors. Each professor object should have:
{
  "name": "Full Name",
  "email": "email@university.edu or null",
  "profileUrl": "URL to their profile page",
  "title": "Their academic title",
  "isResearchActive": true/false
}

Only include actual faculty members, not staff or administrators. Include ALL faculty members you can find on this page.`;

  const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: "You are an expert at extracting structured data from university faculty web pages. Always respond with valid JSON only. Extract EVERY faculty member listed on the page." },
        { role: "user", content: extractionPrompt },
      ],
    }),
  });

  if (!aiResponse.ok) {
    const errorText = await aiResponse.text();
    console.error('AI API error:', errorText);
    return [];
  }

  const aiData = await aiResponse.json();
  const aiContent = aiData.choices?.[0]?.message?.content || '[]';

  try {
    const jsonMatch = aiContent.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (parseError) {
    console.error('Failed to parse AI response:', parseError);
  }

  return [];
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

    console.log('Scraping faculty page:', facultyUrl);

    // Step 1: Scrape the main faculty page and map the site in parallel
    const [mainPage, mappedUrls] = await Promise.all([
      scrapeUrl(apiKey, facultyUrl, true),
      mapSite(apiKey, facultyUrl),
    ]);

    console.log(`Main page scraped. Found ${mainPage.links.length} links. Map found ${mappedUrls.length} URLs.`);

    // Step 2: Find additional pages to scrape (pagination + related faculty listing pages)
    const allDiscoveredLinks = [...mainPage.links, ...mappedUrls];
    const paginationUrls = findPaginationUrls(facultyUrl, allDiscoveredLinks);
    const relatedPages = findRelatedFacultyPages(facultyUrl, mappedUrls);
    const additionalUrls = [...new Set([...paginationUrls, ...relatedPages])].slice(0, 25);

    console.log(`Found ${paginationUrls.length} pagination URLs and ${relatedPages.length} related pages. Scraping ${additionalUrls.length} additional pages.`);

    // Step 3: Scrape additional pages in parallel batches
    const additionalPages: { markdown: string; links: string[]; url: string }[] = [];
    const BATCH_SIZE = 5;
    
    for (let i = 0; i < additionalUrls.length; i += BATCH_SIZE) {
      const batch = additionalUrls.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map(async (url) => {
          const result = await scrapeUrl(apiKey, url);
          return { ...result, url };
        })
      );
      additionalPages.push(...batchResults.filter(p => p.markdown.length > 100));
      
      // Small delay between batches to respect rate limits
      if (i + BATCH_SIZE < additionalUrls.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log(`Successfully scraped ${additionalPages.length} additional pages`);

    // Step 4: Extract professors from all pages in parallel
    const allPagesToProcess = [
      { markdown: mainPage.markdown, links: mainPage.links, url: facultyUrl },
      ...additionalPages,
    ];

    const extractionResults = await Promise.all(
      allPagesToProcess.map(page => 
        extractProfessors(LOVABLE_API_KEY, page.markdown, page.links, page.url)
      )
    );

    // Step 5: Combine and deduplicate professors
    const allProfessors = extractionResults.flat();
    const seen = new Map<string, any>();
    
    for (const prof of allProfessors) {
      const key = prof.name?.toLowerCase()?.trim();
      if (key && !seen.has(key)) {
        seen.set(key, prof);
      }
    }

    const uniqueProfessors = Array.from(seen.values());

    // Process and clean up professor data
    const processedProfessors: Professor[] = uniqueProfessors.map((prof: any) => {
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

    console.log(`Found ${processedProfessors.length} unique professors from ${allPagesToProcess.length} pages`);

    return new Response(
      JSON.stringify({
        success: true,
        professors: processedProfessors,
        total: processedProfessors.length,
        researchActive: processedProfessors.filter((p: Professor) => p.isResearchActive).length,
        pagesScraped: allPagesToProcess.length,
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
