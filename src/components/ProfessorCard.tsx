import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Professor, analyzeResearch, generateEmail, generateGmailDraftUrl, createGmailDraft } from "@/lib/api";
import { getGmailAccessToken, isGmailConnected } from "@/lib/gmail-auth";
import { 
  User, 
  Mail, 
  ExternalLink, 
  Sparkles, 
  Loader2, 
  CheckCircle2,
  FlaskConical,
  FileText,
  Paperclip
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

interface ProfessorCardProps {
  professor: Professor;
  userInfo?: {
    name?: string;
    school?: string;
    location?: string;
    experience?: string;
    achievements?: string;
    hoursPerWeek?: string;
  };
  resumeFile?: File | null;
  onEmailGenerated?: (professor: Professor, subject: string, body: string) => void;
  shouldAnalyze?: boolean;
  onAnalysisComplete?: (professorName: string) => void;
}

export function ProfessorCard({ professor, userInfo, resumeFile, onEmailGenerated, shouldAnalyze, onAnalysisComplete }: ProfessorCardProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCreatingDraft, setIsCreatingDraft] = useState(false);
  const [researchData, setResearchData] = useState<{
    interests: string;
    publications: string[];
    summary: string;
  } | null>(null);
  const [emailData, setEmailData] = useState<{
    subject: string;
    body: string;
  } | null>(null);
  const { toast } = useToast();
  const hasTriggeredAnalyze = useRef(false);

  useEffect(() => {
    if (shouldAnalyze && !researchData && !isAnalyzing && !hasTriggeredAnalyze.current && professor.profileUrl) {
      hasTriggeredAnalyze.current = true;
      handleAnalyze().then(() => {
        onAnalysisComplete?.(professor.name);
      });
    } else if (shouldAnalyze && !professor.profileUrl && !hasTriggeredAnalyze.current) {
      hasTriggeredAnalyze.current = true;
      onAnalysisComplete?.(professor.name);
    }
  }, [shouldAnalyze]);
  const handleAnalyze = async () => {
    if (!professor.profileUrl) {
      toast({
        title: "No profile URL",
        description: "Cannot analyze research without a profile URL.",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);
    try {
      const result = await analyzeResearch(professor.profileUrl, professor.name);
      
      if (result.success && result.researchInterests) {
        setResearchData({
          interests: result.researchInterests,
          publications: result.publications || [],
          summary: result.summary || "",
        });
        
        // Update professor email if found
        if (result.email && !professor.email) {
          professor.email = result.email;
        }

        toast({
          title: "Research analyzed",
          description: `Found interests: ${result.researchInterests}`,
        });
      } else {
        throw new Error(result.error || "Failed to analyze research");
      }
    } catch (error) {
      console.error("Error analyzing research:", error);
      toast({
        title: "Analysis failed",
        description: error instanceof Error ? error.message : "Could not analyze research interests",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleGenerateEmail = async () => {
    if (!researchData) {
      toast({
        title: "Analyze first",
        description: "Please analyze the professor's research first.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      const result = await generateEmail(professor.lastName, researchData.interests, userInfo);
      
      if (result.success && result.subject && result.body) {
        setEmailData({
          subject: result.subject,
          body: result.body,
        });
        onEmailGenerated?.(professor, result.subject, result.body);
        
        // Automatically open Gmail with the generated email
        if (professor.email) {
          await openInGmail(professor.email, result.subject, result.body);
        } else {
          toast({
            title: "Email generated",
            description: "Email is ready but no professor email address was found.",
            variant: "destructive",
          });
        }
      } else {
        throw new Error(result.error || "Failed to generate email");
      }
    } catch (error) {
      console.error("Error generating email:", error);
      toast({
        title: "Generation failed",
        description: error instanceof Error ? error.message : "Could not generate email",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const openInGmail = async (to: string, subject: string, body: string) => {
    if (isGmailConnected() && resumeFile) {
      setIsCreatingDraft(true);
      try {
        const accessToken = getGmailAccessToken();
        if (!accessToken) throw new Error("Gmail not connected");

        const attachmentBase64 = await fileToBase64(resumeFile);
        const result = await createGmailDraft(
          accessToken, to, subject, body,
          attachmentBase64, resumeFile.name, 'application/pdf'
        );

        if (result.success && result.gmailUrl) {
          window.open(result.gmailUrl, "_blank");
          toast({
            title: "Draft created with resume!",
            description: "Your email draft with resume is ready in Gmail.",
          });
        } else {
          throw new Error(result.error || "Failed to create draft");
        }
      } catch (error) {
        console.error("Error creating Gmail draft:", error);
        toast({
          title: "Draft creation failed",
          description: "Opening Gmail compose instead.",
          variant: "destructive",
        });
        const gmailUrl = generateGmailDraftUrl(to, subject, body);
        window.open(gmailUrl, "_blank");
      } finally {
        setIsCreatingDraft(false);
      }
    } else {
      const gmailUrl = generateGmailDraftUrl(to, subject, body);
      window.open(gmailUrl, "_blank");
      toast({
        title: "Opened in Gmail",
        description: "Your email is ready — just attach your resume and send!",
      });
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  return (
    <Card className={cn(
      "overflow-hidden transition-all duration-300 hover:shadow-elevated",
      researchData && "ring-2 ring-success/30",
      emailData && "ring-2 ring-primary/30"
    )}>
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
            <User className="h-7 w-7 text-primary" />
          </div>
          
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold text-foreground truncate">
                  {professor.name}
                </h3>
                {professor.title && (
                  <p className="text-sm text-muted-foreground">{professor.title}</p>
                )}
              </div>
              <Badge 
                variant={professor.isResearchActive ? "default" : "secondary"}
                className={cn(
                  "shrink-0",
                  professor.isResearchActive && "bg-success hover:bg-success/90"
                )}
              >
                {professor.isResearchActive ? "Research Active" : "Non-Research"}
              </Badge>
            </div>

            {professor.email && (
              <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5" />
                <span className="truncate">{professor.email}</span>
              </p>
            )}

            {professor.profileUrl && (
              <a
                href={professor.profileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline flex items-center gap-1.5"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                View Profile
              </a>
            )}

            {researchData && (
              <div className="mt-3 p-3 bg-success/5 border border-success/20 rounded-lg space-y-2 animate-fade-in">
                <div className="flex items-center gap-2 text-success font-medium">
                  <FlaskConical className="h-4 w-4" />
                  Research Interests
                </div>
                <p className="text-sm text-foreground">{researchData.interests}</p>
                {researchData.summary && (
                  <p className="text-xs text-muted-foreground">{researchData.summary}</p>
                )}
              </div>
            )}

            {emailData && (
              <div className="mt-3 p-3 bg-primary/5 border border-primary/20 rounded-lg space-y-2 animate-fade-in">
                <div className="flex items-center gap-2 text-primary font-medium">
                  <FileText className="h-4 w-4" />
                  Email Preview
                </div>
                <p className="text-xs text-muted-foreground line-clamp-3">
                  {emailData.body.substring(0, 200)}...
                </p>
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-2">
              {!researchData && professor.isResearchActive && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleAnalyze}
                  disabled={isAnalyzing}
                  className="gap-2"
                >
                  {isAnalyzing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  Analyze Research
                </Button>
              )}

              {researchData && !emailData && (
                <Button
                  size="sm"
                  onClick={handleGenerateEmail}
                  disabled={isGenerating || isCreatingDraft}
                  className="gap-2"
                >
                  {isGenerating || isCreatingDraft ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Mail className="h-4 w-4" />
                  )}
                  {isCreatingDraft ? "Opening Gmail..." : isGenerating ? "Generating..." : "Generate & Open in Gmail"}
                </Button>
              )}

              {emailData && professor.email && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openInGmail(professor.email!, emailData.subject, emailData.body)}
                  disabled={isCreatingDraft}
                  className="gap-2"
                >
                  {isCreatingDraft ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Mail className="h-4 w-4" />
                  )}
                  Reopen in Gmail
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
