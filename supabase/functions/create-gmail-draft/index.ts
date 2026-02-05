import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface CreateDraftRequest {
  accessToken: string;
  to: string;
  subject: string;
  body: string;
  attachmentBase64?: string;
  attachmentName?: string;
  attachmentMimeType?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { accessToken, to, subject, body, attachmentBase64, attachmentName, attachmentMimeType }: CreateDraftRequest = await req.json();

    if (!accessToken || !to || !subject || !body) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields: accessToken, to, subject, body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build the email message
    let emailContent: string;
    const boundary = `boundary_${Date.now()}`;

    if (attachmentBase64 && attachmentName) {
      // Email with attachment (MIME multipart)
      emailContent = [
        `To: ${to}`,
        `Subject: ${subject}`,
        'MIME-Version: 1.0',
        `Content-Type: multipart/mixed; boundary="${boundary}"`,
        '',
        `--${boundary}`,
        'Content-Type: text/plain; charset="UTF-8"',
        '',
        body,
        '',
        `--${boundary}`,
        `Content-Type: ${attachmentMimeType || 'application/pdf'}; name="${attachmentName}"`,
        'Content-Transfer-Encoding: base64',
        `Content-Disposition: attachment; filename="${attachmentName}"`,
        '',
        attachmentBase64,
        '',
        `--${boundary}--`
      ].join('\r\n');
    } else {
      // Simple email without attachment
      emailContent = [
        `To: ${to}`,
        `Subject: ${subject}`,
        'Content-Type: text/plain; charset="UTF-8"',
        '',
        body
      ].join('\r\n');
    }

    // Encode the email in base64url format (required by Gmail API)
    const rawMessage = base64Encode(new TextEncoder().encode(emailContent))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    // Create draft using Gmail API
    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/drafts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: {
          raw: rawMessage
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Gmail API error:', errorData);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Gmail API error: ${errorData.error?.message || 'Unknown error'}` 
        }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const draftData = await response.json();
    
    return new Response(
      JSON.stringify({ 
        success: true,
        draftId: draftData.id,
        messageId: draftData.message?.id,
        // URL to open the draft in Gmail
        gmailUrl: `https://mail.google.com/mail/u/0/#drafts/${draftData.message?.id}`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error creating Gmail draft:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to create Gmail draft';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
