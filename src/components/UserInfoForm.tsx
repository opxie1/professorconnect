import { useState, useRef } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, Save, FileText, Upload, X } from "lucide-react";

export interface UserInfo {
  emailTemplate: string;
  resumeFileName?: string;
}

export const DEFAULT_EMAIL_TEMPLATE = `Dear Professor {professorLastName},

I hope you are doing well. My name is [Your Name], and I am currently a high school student at [Your School] in [Your Location]. I am reaching out to inquire if there is a potential opportunity, paid or unpaid, for me to act as an intern or assistant for you, or if I could work alongside you with a potential research study. I am particularly interested in {researchInterests}, as well as data science and analytics.

[Your experience here]

[Your achievements here]

I am very enthusiastic about contributing to a potential research study or assisting you with your work, and I am confident that my experience would make me a valuable addition. I am willing to contribute up to 30 hours a week to assist with any tasks or projects you may need help with.

I would greatly appreciate your consideration if there is an opportunity for me. I thank you for your time and would be honored to discuss any potential opportunities with you further. Please let me know if there is a good time for us to meet or if you would like me to provide any documents or materials.

Additionally, I have attached my resume, which outlines more of my experience and background.

Hope to hear from you soon.

Sincerely,
[Your Name]`;

interface UserInfoFormProps {
  userInfo: UserInfo;
  onChange: (info: UserInfo) => void;
  onSave?: () => void;
  onResumeChange?: (file: File | null) => void;
  resumeFile?: File | null;
}

export function UserInfoForm({ userInfo, onChange, onSave, onResumeChange, resumeFile }: UserInfoFormProps) {
  const [isEditing, setIsEditing] = useState(!userInfo.emailTemplate);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file && file.type === "application/pdf") {
      onResumeChange?.(file);
      onChange({ ...userInfo, resumeFileName: file.name });
    }
  };

  const handleRemoveResume = () => {
    onResumeChange?.(null);
    onChange({ ...userInfo, resumeFileName: undefined });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSave = () => {
    localStorage.setItem("professorConnect_userInfo", JSON.stringify(userInfo));
    setIsEditing(false);
    onSave?.();
  };

  if (!isEditing && userInfo.emailTemplate) {
    return (
      <Card className="shadow-card">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
                <Mail className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Email Template Saved</p>
                <p className="text-sm text-muted-foreground line-clamp-1">
                  {userInfo.emailTemplate.substring(0, 80)}...
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
              Edit Template
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5 text-primary" />
          Email Template
        </CardTitle>
        <CardDescription>
          Write your complete cold email below. Use <code className="bg-muted px-1 py-0.5 rounded text-foreground font-mono">{'{curly brackets}'}</code> around 
          any content you want AI to fill in from the professor's profile — e.g. <code className="bg-muted px-1 py-0.5 rounded text-foreground font-mono">{'{researchInterests}'}</code> or <code className="bg-muted px-1 py-0.5 rounded text-foreground font-mono">{'{professorLastName}'}</code>.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          placeholder={DEFAULT_EMAIL_TEMPLATE}
          value={userInfo.emailTemplate}
          onChange={(e) => onChange({ ...userInfo, emailTemplate: e.target.value })}
          rows={18}
          className="font-mono text-xs leading-relaxed"
        />
        
        <div className="p-3 bg-muted/50 border border-border rounded-lg space-y-1">
          <p className="text-xs font-medium text-foreground">Placeholder examples:</p>
          <p className="text-xs text-muted-foreground">
            <code className="bg-background px-1 rounded">{'{professorLastName}'}</code> — professor's last name  ·  
            <code className="bg-background px-1 rounded">{'{researchInterests}'}</code> — their research areas  ·  
            <code className="bg-background px-1 rounded">{'{recentPublication}'}</code> — a recent paper  ·  
            or any custom placeholder you define
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            Resume (PDF)
          </label>
          <div className="flex items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              className="hidden"
              id="resume-upload"
            />
            {resumeFile || userInfo.resumeFileName ? (
              <div className="flex-1 flex items-center gap-2 p-3 bg-primary/5 border border-primary/20 rounded-lg">
                <FileText className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium truncate flex-1">
                  {resumeFile?.name || userInfo.resumeFileName}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleRemoveResume}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="w-full gap-2"
              >
                <Upload className="h-4 w-4" />
                Choose PDF File
              </Button>
            )}
          </div>
        </div>

        <Button onClick={handleSave} disabled={!userInfo.emailTemplate.trim()} className="w-full gap-2">
          <Save className="h-4 w-4" />
          Save Template
        </Button>
      </CardContent>
    </Card>
  );
}
