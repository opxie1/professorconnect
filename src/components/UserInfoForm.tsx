import { useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, School, MapPin, Briefcase, Trophy, Clock, Save, FileText, Upload, X } from "lucide-react";

export interface UserInfo {
  name: string;
  school: string;
  location: string;
  experience: string;
  achievements: string;
  hoursPerWeek: string;
  resumeFileName?: string;
}

interface UserInfoFormProps {
  userInfo: UserInfo;
  onChange: (info: UserInfo) => void;
  onSave?: () => void;
  onResumeChange?: (file: File | null) => void;
  resumeFile?: File | null;
}

export function UserInfoForm({ userInfo, onChange, onSave, onResumeChange, resumeFile }: UserInfoFormProps) {
  const [isEditing, setIsEditing] = useState(!userInfo.name);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (field: keyof UserInfo, value: string) => {
    onChange({ ...userInfo, [field]: value });
  };

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

  if (!isEditing && userInfo.name) {
    return (
      <Card className="shadow-card">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
                <User className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <p className="font-semibold text-foreground">{userInfo.name}</p>
                <p className="text-sm text-muted-foreground">{userInfo.school}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
              Edit Info
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
          <User className="h-5 w-5 text-primary" />
          Your Information
        </CardTitle>
        <CardDescription>
          This information will be used to personalize your cold emails
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              Your Name
            </label>
            <Input
              placeholder="Ethan Xie"
              value={userInfo.name}
              onChange={(e) => handleChange("name", e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <School className="h-4 w-4 text-muted-foreground" />
              Your School
            </label>
            <Input
              placeholder="The Charter School of Wilmington"
              value={userInfo.school}
              onChange={(e) => handleChange("school", e.target.value)}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              Location
            </label>
            <Input
              placeholder="Wilmington, Delaware"
              value={userInfo.location}
              onChange={(e) => handleChange("location", e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Hours Available per Week
            </label>
            <Input
              placeholder="30"
              value={userInfo.hoursPerWeek}
              onChange={(e) => handleChange("hoursPerWeek", e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-muted-foreground" />
            Experience (write in first person)
          </label>
          <Textarea
            placeholder="I currently work with the Lemelson–MIT Program, assisting in the development of a Bluetooth-enabled ostomy leak alert..."
            value={userInfo.experience}
            onChange={(e) => handleChange("experience", e.target.value)}
            rows={4}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <Trophy className="h-4 w-4 text-muted-foreground" />
            Key Achievements (write in first person)
          </label>
          <Textarea
            placeholder="I also placed 2nd out of 250 teams internationally in the Financial Portfolio Management competition..."
            value={userInfo.achievements}
            onChange={(e) => handleChange("achievements", e.target.value)}
            rows={4}
          />
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
          <p className="text-xs text-muted-foreground">
            Note: You'll need to manually attach this resume in Gmail after the draft opens
          </p>
        </div>

        <Button onClick={handleSave} className="w-full gap-2">
          <Save className="h-4 w-4" />
          Save Information
        </Button>
      </CardContent>
    </Card>
  );
}
