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
    const { professorLastName, researchInterests, userInfo } = await req.json();

    if (!professorLastName || !researchInterests) {
      return new Response(
        JSON.stringify({ success: false, error: 'Professor name and research interests are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate the email using the template
    const emailSubject = "Inquiry About Research or Internship Opportunity";
    
    const emailBody = `Dear Professor ${professorLastName},

I hope you are doing well. My name is ${userInfo?.name || '[Your Name]'}, and I am currently a high school student at ${userInfo?.school || '[Your School]'} in ${userInfo?.location || '[Your Location]'}. I am reaching out to inquire if there is a potential opportunity, paid or unpaid, for me to act as an intern or assistant for you, or if I could work alongside you with a potential research study. I am particularly interested in ${researchInterests}, as well as data science and analytics.

${userInfo?.experience || `I have experience with programming and data analysis, and I am eager to learn more about research in this field.`}

${userInfo?.achievements || `I have demonstrated my ability to work on complex projects and deliver results.`}

I am very enthusiastic about contributing to a potential research study or assisting you with your work, and I am confident that my experience would make me a valuable addition. I am willing to contribute up to ${userInfo?.hoursPerWeek || '30'} hours a week to assist with any tasks or projects you may need help with.

I would greatly appreciate your consideration if there is an opportunity for me. I thank you for your time and would be honored to discuss any potential opportunities with you further. Please let me know if there is a good time for us to meet or if you would like me to provide any documents or materials.

Additionally, I have attached my resume, which outlines more of my experience and background.

Hope to hear from you soon.

Sincerely, ${userInfo?.name || '[Your Name]'}`;

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
