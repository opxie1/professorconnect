import { supabase } from "@/integrations/supabase/client";

export interface Professor {
  name: string;
  lastName: string;
  email: string | null;
  profileUrl: string;
  title: string | null;
  department: string | null;
  imageUrl: string | null;
  isResearchActive: boolean;
  researchInterests?: string;
  publications?: string[];
  summary?: string;
}

export interface ScrapeFacultyResponse {
  success: boolean;
  professors?: Professor[];
  total?: number;
  researchActive?: number;
  error?: string;
}

export interface AnalyzeResearchResponse {
  success: boolean;
  researchInterests?: string;
  email?: string | null;
  publications?: string[];
  summary?: string;
  error?: string;
}

export interface GenerateEmailResponse {
  success: boolean;
  subject?: string;
  body?: string;
  error?: string;
}

export async function scrapeFaculty(facultyUrl: string, department: string): Promise<ScrapeFacultyResponse> {
  const { data, error } = await supabase.functions.invoke('scrape-faculty', {
    body: { facultyUrl, department },
  });

  if (error) {
    console.error('Error scraping faculty:', error);
    return { success: false, error: error.message };
  }

  return data;
}

export async function analyzeResearch(profileUrl: string, professorName: string): Promise<AnalyzeResearchResponse> {
  const { data, error } = await supabase.functions.invoke('analyze-research', {
    body: { profileUrl, professorName },
  });

  if (error) {
    console.error('Error analyzing research:', error);
    return { success: false, error: error.message };
  }

  return data;
}

export async function generateEmail(
  professorLastName: string, 
  researchInterests: string,
  emailTemplate?: string
): Promise<GenerateEmailResponse> {
  const { data, error } = await supabase.functions.invoke('generate-email', {
    body: { professorLastName, researchInterests, emailTemplate },
  });

  if (error) {
    console.error('Error generating email:', error);
    return { success: false, error: error.message };
  }

  return data;
}

export function generateGmailDraftUrl(to: string, subject: string, body: string): string {
  const encodedSubject = encodeURIComponent(subject);
  const encodedBody = encodeURIComponent(body);
  const encodedTo = encodeURIComponent(to);
  
  return `https://mail.google.com/mail/?view=cm&fs=1&to=${encodedTo}&su=${encodedSubject}&body=${encodedBody}`;
}

export interface CreateGmailDraftResponse {
  success: boolean;
  draftId?: string;
  messageId?: string;
  gmailUrl?: string;
  error?: string;
}

export async function createGmailDraft(
  accessToken: string,
  to: string,
  subject: string,
  body: string,
  attachmentBase64?: string,
  attachmentName?: string,
  attachmentMimeType?: string
): Promise<CreateGmailDraftResponse> {
  const { data, error } = await supabase.functions.invoke('create-gmail-draft', {
    body: { 
      accessToken, 
      to, 
      subject, 
      body,
      attachmentBase64,
      attachmentName,
      attachmentMimeType
    },
  });

  if (error) {
    console.error('Error creating Gmail draft:', error);
    return { success: false, error: error.message };
  }

  return data;
}
