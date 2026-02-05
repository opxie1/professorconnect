import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Professor, analyzeResearch, generateEmail, generateGmailDraftUrl } from "@/lib/api";
import { 
  User, 
  Mail, 
  ExternalLink, 
  Sparkles, 
  Loader2, 
  CheckCircle2,
  FlaskConical,
  FileText
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
  onEmailGenerated?: (professor: Professor, subject: string, body: string) => void;
}

export function ProfessorCard({ professor, userInfo, onEmailGenerated }: ProfessorCardProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
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
        
        toast({
          title: "Email generated",
          description: "Your personalized email is ready!",
        });
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

  const handleOpenGmail = () => {
    if (!emailData || !professor.email) {
      toast({
        title: "Missing information",
        description: "Email or recipient address not available.",
        variant: "destructive",
      });
      return;
    }

    const gmailUrl = generateGmailDraftUrl(professor.email, emailData.subject, emailData.body);
    window.open(gmailUrl, "_blank");
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
                  disabled={isGenerating}
                  className="gap-2"
                >
                  {isGenerating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Mail className="h-4 w-4" />
                  )}
                  Generate Email
                </Button>
              )}

              {emailData && professor.email && (
                <Button
                  size="sm"
                  onClick={handleOpenGmail}
                  className="gap-2 bg-success hover:bg-success/90"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Open in Gmail
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
