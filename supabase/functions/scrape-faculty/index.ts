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

async function scrapeUrl(apiKey: string, url: string): Promise<{ markdown: string; links: string[] }> {
  const body: Record<string, unknown> = {
    url,
    formats: ['markdown', 'links'],
    onlyMainContent: true,
    waitFor: 5000,
    timeout: 30000,
  };

  const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();
  if (!response.ok || !data.success) {
    console.error('Firecrawl scrape error for', url, data);
    return { markdown: '', links: [] };
  }

  return {
    markdown: data.data?.markdown || data.markdown || '',
    links: data.data?.links || data.links || [],
  };
}

async function mapSite(apiKey: string, url: string): Promise<string[]> {
  const searches = [
    'faculty directory professors people',
    'faculty members staff department',
    'professor profile bio research',
    '',  // empty search to get all pages
  ];
  const allLinks = new Set<string>();

  await Promise.all(searches.map(async (search) => {
    try {
      const body: Record<string, unknown> = {
        url,
        limit: 5000,
        includeSubdomains: true,
      };
      if (search) body.search = search;

      const response = await fetch('https://api.firecrawl.dev/v1/map', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      if (response.ok && data.links) {
        for (const link of data.links) allLinks.add(link);
      }
    } catch (err) {
      console.error('Map failed:', err);
    }
  }));

  return Array.from(allLinks);
}

function findProfileUrls(baseUrl: string, allLinks: string[]): string[] {
  const base = new URL(baseUrl);
  const profilePatterns = [
    /\/faculty\/[^/]+\/?$/i,
    /\/people\/[^/]+\/?$/i,
    /\/profile\/[^/]+\/?$/i,
    /\/faculty-research\/faculty-directory\/[^/]+\/?$/i,
    /\/directory\/[^/]+\/?$/i,
    /\/bio\/[^/]+\/?$/i,
    /\/staff\/[^/]+\/?$/i,
    /\/members\/[^/]+\/?$/i,
    /\?profile=/i,
    /\?id=/i,
  ];

  const excludePatterns = [
    /\.(pdf|doc|docx|jpg|jpeg|png|gif|css|js|xml|json)$/i,
    /\/(news|events|blog|research|publications|courses|programs|admissions|about|contact)\//i,
    /index\.html$/i,
    /\/faculty-research\/faculty-directory\/?$/i,
    /\/faculty-research\/faculty-directory\/index\.html$/i,
  ];

  const seen = new Set<string>();
  const profiles: string[] = [];

  for (const link of allLinks) {
    try {
      const linkUrl = new URL(link, baseUrl);
      if (linkUrl.hostname !== base.hostname) continue;

      const normalized = linkUrl.origin + linkUrl.pathname.replace(/\/$/, '') + linkUrl.search;
      if (seen.has(normalized)) continue;

      // Check if it matches a profile pattern
      const isProfile = profilePatterns.some(p => p.test(linkUrl.pathname + linkUrl.search));
      const isExcluded = excludePatterns.some(p => p.test(linkUrl.pathname));
      
      if (isProfile && !isExcluded) {
        seen.add(normalized);
        profiles.push(normalized);
      }
    } catch {
      // skip
    }
  }

  return profiles;
}

function findListingPages(baseUrl: string, allLinks: string[]): string[] {
  const base = new URL(baseUrl);
  const basePath = base.pathname.replace(/\/$/, '').replace(/\/index\.html$/, '');
  const seen = new Set<string>();
  seen.add(baseUrl);
  const listings: string[] = [];

  const listingKeywords = ['faculty', 'people', 'staff', 'directory', 'professors', 'members', 'department'];
  const paginationPatterns = [/[?&]page=\d+/i, /\/page\/\d+/i, /[?&]p=\d+/i, /[?&]offset=\d+/i];

  for (const link of allLinks) {
    try {
      const linkUrl = new URL(link, baseUrl);
      if (linkUrl.hostname !== base.hostname) continue;

      const linkPath = linkUrl.pathname.replace(/\/$/, '').replace(/\/index\.html$/, '');
      if (linkPath === basePath) continue;

      const isPagination = paginationPatterns.some(p => p.test(link));
      const isListing = listingKeywords.some(k => linkPath.toLowerCase().includes(k));
      const pathDepth = linkPath.split('/').filter(Boolean).length;

      if ((isPagination || isListing) && pathDepth <= 5 && !seen.has(link)) {
        seen.add(link);
        listings.push(link);
      }
    } catch {
      // skip
    }
  }

  return listings.slice(0, 30);
}

async function extractProfessorsFromProfiles(
  LOVABLE_API_KEY: string,
  profileUrls: string[],
  department: string | null
): Promise<Professor[]> {
  // Extract professor info from URL patterns using AI
  const prompt = `You are analyzing a list of university faculty profile page URLs. Extract professor names and information from the URL patterns.

For each URL, determine:
1. The professor's full name (from the URL slug, e.g., /john-smith/ → "John Smith")
2. Whether they are likely research-active (assume yes unless URL suggests emeritus/adjunct/visiting/lecturer)

Here are the profile URLs:
${profileUrls.map((u, i) => `${i + 1}. ${u}`).join('\n')}

Respond with a JSON array. Each object:
{
  "name": "Full Name",
  "profileUrl": "the URL",
  "title": null,
  "isResearchActive": true
}

Extract ALL professors. Include everyone.`;

  let aiData: any = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You extract structured data from URLs. Always respond with valid JSON only." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (aiResponse.status === 429) {
      const waitMs = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
      console.log(`Rate limited (profiles), retrying in ${Math.round(waitMs)}ms...`);
      await new Promise(resolve => setTimeout(resolve, waitMs));
      continue;
    }

    if (!aiResponse.ok) {
      console.error('AI API error:', await aiResponse.text());
      return [];
    }

    aiData = await aiResponse.json();
    break;
  }

  if (!aiData) {
    console.error('All retries exhausted for profile extraction');
    return [];
  }
  const aiContent = aiData.choices?.[0]?.message?.content || '[]';

  try {
    const jsonMatch = aiContent.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const profs = JSON.parse(jsonMatch[0]);
      return profs.map((p: any) => {
        const nameParts = p.name?.split(' ') || [];
        return {
          name: p.name || 'Unknown',
          lastName: nameParts[nameParts.length - 1] || p.name,
          email: p.email || null,
          profileUrl: p.profileUrl || '',
          title: p.title || null,
          department: department || null,
          imageUrl: null,
          isResearchActive: p.isResearchActive ?? true,
        };
      });
    }
  } catch (e) {
    console.error('Failed to parse profile URL extraction:', e);
  }
  return [];
}

async function extractProfessorsFromMarkdown(
  LOVABLE_API_KEY: string,
  markdown: string,
  links: string[],
  pageUrl: string,
  department: string | null
): Promise<Professor[]> {
  const extractionPrompt = `You are analyzing a university faculty directory page. Extract ALL professors/faculty members.

For each professor found, extract:
1. Full name
2. Email address (if visible)
3. Profile page URL (from the links provided, match by professor name)
4. Title/position
5. Whether they appear research-active (NOT emeritus, NOT "Professor of Practice", NOT lecturers unless research-focused)

Page URL: ${pageUrl}

Content:
${markdown.substring(0, 50000)}

Available links:
${JSON.stringify(links.slice(0, 300))}

Respond with a JSON array:
{
  "name": "Full Name",
  "email": "email@university.edu or null",
  "profileUrl": "URL",
  "title": "Academic title",
  "isResearchActive": true/false
}

Include ALL faculty members. Do not skip anyone.`;

  let aiData: any = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You extract structured data from university faculty web pages. Always respond with valid JSON only. Extract EVERY faculty member." },
          { role: "user", content: extractionPrompt },
        ],
      }),
    });

    if (aiResponse.status === 429) {
      const waitMs = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
      console.log(`Rate limited (markdown), retrying in ${Math.round(waitMs)}ms...`);
      await new Promise(resolve => setTimeout(resolve, waitMs));
      continue;
    }

    if (!aiResponse.ok) {
      console.error('AI API error:', await aiResponse.text());
      return [];
    }

    aiData = await aiResponse.json();
    break;
  }

  if (!aiData) {
    console.error('All retries exhausted for markdown extraction');
    return [];
  }
  const aiContent = aiData.choices?.[0]?.message?.content || '[]';

  try {
    const jsonMatch = aiContent.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const profs = JSON.parse(jsonMatch[0]);
      return profs.map((p: any) => {
        const nameParts = p.name?.split(' ') || [];
        return {
          name: p.name || 'Unknown',
          lastName: nameParts[nameParts.length - 1] || p.name,
          email: p.email || null,
          profileUrl: p.profileUrl || '',
          title: p.title || null,
          department: department || null,
          imageUrl: null,
          isResearchActive: p.isResearchActive ?? true,
        };
      });
    }
  } catch (e) {
    console.error('Failed to parse markdown extraction:', e);
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

    // Step 1: Scrape main page + map site in parallel
    const [mainPage, mappedUrls] = await Promise.all([
      scrapeUrl(apiKey, facultyUrl),
      mapSite(apiKey, facultyUrl),
    ]);

    console.log(`Main page: ${mainPage.markdown.length} chars, ${mainPage.links.length} links. Map: ${mappedUrls.length} URLs.`);

    // Step 2: Find individual profile URLs and listing pages
    const allDiscoveredLinks = [...new Set([...mainPage.links, ...mappedUrls])];
    const profileUrls = findProfileUrls(facultyUrl, allDiscoveredLinks);
    const listingPages = findListingPages(facultyUrl, allDiscoveredLinks);

    console.log(`Found ${profileUrls.length} profile URLs and ${listingPages.length} listing pages.`);

    // Step 3: Multi-strategy extraction (sequential to avoid rate limits)
    const allProfessors: Professor[] = [];

    // Strategy A: Extract from main page markdown
    if (mainPage.markdown.length > 200) {
      const result = await extractProfessorsFromMarkdown(LOVABLE_API_KEY, mainPage.markdown, mainPage.links, facultyUrl, department);
      allProfessors.push(...result);
      console.log(`Strategy A: found ${result.length} professors from main page`);
    }

    // Strategy B: Extract from profile URLs (batch in groups of 100)
    if (profileUrls.length > 0) {
      const PROFILE_BATCH = 100;
      for (let i = 0; i < profileUrls.length; i += PROFILE_BATCH) {
        const batch = profileUrls.slice(i, i + PROFILE_BATCH);
        const result = await extractProfessorsFromProfiles(LOVABLE_API_KEY, batch, department);
        allProfessors.push(...result);
        console.log(`Strategy B batch: found ${result.length} professors from profile URLs`);
      }
    }

    // Strategy C: Scrape additional listing pages and extract
    if (listingPages.length > 0) {
      const pagesToScrape = listingPages.slice(0, 10);
      const BATCH_SIZE = 3;

      for (let i = 0; i < pagesToScrape.length; i += BATCH_SIZE) {
        const batch = pagesToScrape.slice(i, i + BATCH_SIZE);
        const batchResults = await Promise.all(
          batch.map(url => scrapeUrl(apiKey, url))
        );

        for (let j = 0; j < batchResults.length; j++) {
          const result = batchResults[j];
          if (result.markdown.length > 200) {
            const profs = await extractProfessorsFromMarkdown(LOVABLE_API_KEY, result.markdown, result.links, batch[j], department);
            allProfessors.push(...profs);
            console.log(`Strategy C: found ${profs.length} professors from ${batch[j]}`);
          }
        }
      }
    }

    const seen = new Map<string, Professor>();
    for (const prof of allProfessors) {
      const key = prof.name?.toLowerCase()?.trim();
      if (key && key !== 'unknown' && !seen.has(key)) {
        seen.set(key, prof);
      } else if (key && seen.has(key)) {
        // Merge: prefer entries with more data
        const existing = seen.get(key)!;
        if (!existing.email && prof.email) existing.email = prof.email;
        if (!existing.profileUrl && prof.profileUrl) existing.profileUrl = prof.profileUrl;
        if (!existing.title && prof.title) existing.title = prof.title;
      }
    }

    const uniqueProfessors = Array.from(seen.values());
    console.log(`Found ${uniqueProfessors.length} unique professors using ${extractionTasks.length} extraction tasks`);

    return new Response(
      JSON.stringify({
        success: true,
        professors: uniqueProfessors,
        total: uniqueProfessors.length,
        researchActive: uniqueProfessors.filter(p => p.isResearchActive).length,
        pagesScraped: 1 + listingPages.length,
        profileUrlsFound: profileUrls.length,
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
