import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UniversitySearch } from "@/components/UniversitySearch";
import { DepartmentSelect } from "@/components/DepartmentSelect";
import { FacultyUrlInput } from "@/components/FacultyUrlInput";
import { ProfessorCard } from "@/components/ProfessorCard";
import { UserInfoForm, UserInfo } from "@/components/UserInfoForm";
import { GmailConnection } from "@/components/GmailConnection";
import { University } from "@/data/universities";
import { Professor, scrapeFaculty } from "@/lib/api";
import { useToast } from "@/components/ui/use-toast";
import { 
  Search, 
  GraduationCap, 
  Mail, 
  Sparkles,
  Loader2,
  Users,
  FlaskConical,
  BookOpen,
  ArrowRight,
  CheckCircle2
} from "lucide-react";

const defaultUserInfo: UserInfo = {
  name: "",
  school: "",
  location: "",
  experience: "",
  achievements: "",
  hoursPerWeek: "30",
};

const Index = () => {
  const [step, setStep] = useState(1);
  const [selectedUniversity, setSelectedUniversity] = useState<University | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [facultyUrl, setFacultyUrl] = useState("");
  const [professors, setProfessors] = useState<Professor[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [userInfo, setUserInfo] = useState<UserInfo>(defaultUserInfo);
  const [emailsGenerated, setEmailsGenerated] = useState(0);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [analyzeQueue, setAnalyzeQueue] = useState<Set<string>>(new Set());
  const [analyzedCount, setAnalyzedCount] = useState(0);
  const [isAnalyzingAll, setIsAnalyzingAll] = useState(false);
  const { toast } = useToast();

  // Load user info from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("professorConnect_userInfo");
    if (saved) {
      try {
        setUserInfo(JSON.parse(saved));
      } catch (e) {
        console.error("Error parsing saved user info:", e);
      }
    }
  }, []);

  const handleScrapeFaculty = async () => {
    if (!facultyUrl) {
      toast({
        title: "Missing URL",
        description: "Please enter the faculty directory URL",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const result = await scrapeFaculty(facultyUrl, selectedDepartment);
      
      if (result.success && result.professors) {
        setProfessors(result.professors);
        setStep(3);
        toast({
          title: "Faculty found!",
          description: `Found ${result.total} professors (${result.researchActive} research-active)`,
        });
      } else {
        throw new Error(result.error || "Failed to scrape faculty page");
      }
    } catch (error) {
      console.error("Error scraping faculty:", error);
      toast({
        title: "Scraping failed",
        description: error instanceof Error ? error.message : "Could not scrape faculty page. Please check the URL.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailGenerated = () => {
    setEmailsGenerated((prev) => prev + 1);
  };

  const handleAnalyzeAll = () => {
    const names = new Set(researchActiveProfessors.map((p) => p.name));
    setAnalyzeQueue(names);
    setAnalyzedCount(0);
    setIsAnalyzingAll(true);
    toast({
      title: "Analyzing all professors",
      description: `Starting analysis for ${names.size} research-active professors...`,
    });
  };

  const handleAnalysisComplete = (professorName: string) => {
    setAnalyzedCount((prev) => {
      const next = prev + 1;
      if (next >= analyzeQueue.size) {
        setIsAnalyzingAll(false);
        toast({
          title: "All analyses complete",
          description: `Finished analyzing ${analyzeQueue.size} professors.`,
        });
      }
      return next;
    });
  };

  const researchActiveProfessors = professors.filter((p) => p.isResearchActive);
  const otherProfessors = professors.filter((p) => !p.isResearchActive);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <header className="gradient-hero text-primary-foreground">
        <div className="container mx-auto px-4 py-12 sm:py-16">
          <div className="max-w-3xl mx-auto text-center space-y-4">
          <div className="flex items-center justify-center gap-2 mb-4">
              <Link to="/" className="flex items-center gap-2 group">
                <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center transition-transform group-hover:scale-105">
                  <GraduationCap className="h-7 w-7" />
                </div>
              </Link>
            </div>
            <Link to="/" className="hover:opacity-80 transition-opacity">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
                ProfessorConnect
              </h1>
            </Link>
            <p className="text-lg sm:text-xl text-white/80 max-w-2xl mx-auto">
              Automate your cold-email outreach to professors. Find research opportunities, internships, and mentorship.
            </p>
            
            {/* Stats */}
            <div className="flex flex-wrap items-center justify-center gap-6 pt-6">
              <div className="flex items-center gap-2 text-white/90">
                <Users className="h-5 w-5" />
                <span className="font-medium">{professors.length} Professors Found</span>
              </div>
              <div className="flex items-center gap-2 text-white/90">
                <FlaskConical className="h-5 w-5" />
                <span className="font-medium">{researchActiveProfessors.length} Research Active</span>
              </div>
              <div className="flex items-center gap-2 text-white/90">
                <Mail className="h-5 w-5" />
                <span className="font-medium">{emailsGenerated} Emails Generated</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 sm:py-12">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Progress Steps */}
          <div className="flex items-center justify-center gap-2 sm:gap-4">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <button
                  onClick={() => s < step && setStep(s)}
                  disabled={s > step}
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${
                    s === step
                      ? "gradient-primary text-primary-foreground shadow-elevated"
                      : s < step
                      ? "bg-success text-success-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {s < step ? <CheckCircle2 className="h-5 w-5" /> : s}
                </button>
                {s < 3 && (
                  <div
                    className={`hidden sm:block w-16 h-1 rounded-full ${
                      s < step ? "bg-success" : "bg-muted"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Step Labels */}
          <div className="flex items-center justify-center gap-8 sm:gap-16 text-sm">
            <span className={step >= 1 ? "text-foreground font-medium" : "text-muted-foreground"}>
              Your Info
            </span>
            <span className={step >= 2 ? "text-foreground font-medium" : "text-muted-foreground"}>
              Find Faculty
            </span>
            <span className={step >= 3 ? "text-foreground font-medium" : "text-muted-foreground"}>
              Generate Emails
            </span>
          </div>

          {/* Step 1: User Info */}
          {step === 1 && (
            <div className="space-y-6 animate-slide-up">
              <UserInfoForm 
                userInfo={userInfo} 
                onChange={setUserInfo}
                onSave={() => {
                  toast({
                    title: "Information saved",
                    description: "Your details will be used in the email template.",
                  });
                }}
                resumeFile={resumeFile}
                onResumeChange={setResumeFile}
              />
              
              <GmailConnection />
              
              <div className="flex justify-end">
                <Button
                  size="lg"
                  onClick={() => setStep(2)}
                  disabled={!userInfo.name}
                  className="gap-2"
                >
                  Continue
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: University & Department Selection */}
          {step === 2 && (
            <div className="space-y-6 animate-slide-up">
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Search className="h-5 w-5 text-primary" />
                    Find Professors
                  </CardTitle>
                  <CardDescription>
                    Select a university and department, then provide the faculty directory URL
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-primary" />
                      Search University
                    </label>
                    <UniversitySearch
                      onSelect={setSelectedUniversity}
                      selectedUniversity={selectedUniversity}
                    />
                  </div>

                  <DepartmentSelect
                    value={selectedDepartment}
                    onValueChange={setSelectedDepartment}
                  />

                  <FacultyUrlInput
                    value={facultyUrl}
                    onChange={setFacultyUrl}
                    universityName={selectedUniversity?.name}
                  />

                  <Button
                    size="lg"
                    onClick={handleScrapeFaculty}
                    disabled={!facultyUrl || isLoading}
                    className="w-full gap-2"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Searching Faculty...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-5 w-5" />
                        Find Professors
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Step 3: Professor List */}
          {step === 3 && professors.length > 0 && (
            <div className="space-y-6 animate-slide-up">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-foreground">
                    {selectedDepartment} Faculty
                  </h2>
                  <p className="text-muted-foreground">
                    {selectedUniversity?.name}
                  </p>
                </div>
                <Button variant="outline" onClick={() => setStep(2)}>
                  Search Another
                </Button>
              </div>

              <Tabs defaultValue="research" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="research" className="gap-2">
                    <FlaskConical className="h-4 w-4" />
                    Research Active ({researchActiveProfessors.length})
                  </TabsTrigger>
                  <TabsTrigger value="other" className="gap-2">
                    <Users className="h-4 w-4" />
                    Others ({otherProfessors.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="research" className="mt-6">
                  <div className="grid gap-4">
                    {researchActiveProfessors.length > 0 && (
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">
                          {isAnalyzingAll && `Analyzing... ${analyzedCount}/${analyzeQueue.size}`}
                        </p>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleAnalyzeAll}
                          disabled={isAnalyzingAll}
                          className="gap-2"
                        >
                          {isAnalyzingAll ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Sparkles className="h-4 w-4" />
                          )}
                          {isAnalyzingAll ? `Analyzing ${analyzedCount}/${analyzeQueue.size}` : "Analyze All"}
                        </Button>
                      </div>
                    )}
                    {researchActiveProfessors.length === 0 ? (
                      <Card className="p-8 text-center">
                        <p className="text-muted-foreground">No research-active professors found.</p>
                      </Card>
                    ) : (
                      researchActiveProfessors.map((professor, index) => (
                        <ProfessorCard
                          key={`${professor.name}-${index}`}
                          professor={professor}
                          userInfo={userInfo}
                          resumeFile={resumeFile}
                          onEmailGenerated={handleEmailGenerated}
                          shouldAnalyze={analyzeQueue.has(professor.name)}
                          onAnalysisComplete={handleAnalysisComplete}
                        />
                      ))
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="other" className="mt-6">
                  <div className="grid gap-4">
                    {otherProfessors.length === 0 ? (
                      <Card className="p-8 text-center">
                        <p className="text-muted-foreground">All found professors are research-active!</p>
                      </Card>
                    ) : (
                      otherProfessors.map((professor, index) => (
                        <ProfessorCard
                          key={`${professor.name}-${index}`}
                          professor={professor}
                          userInfo={userInfo}
                          resumeFile={resumeFile}
                          onEmailGenerated={handleEmailGenerated}
                        />
                      ))
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-8 mt-12">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-muted-foreground">
            ProfessorConnect — Helping students find research opportunities | Inquiries: ethanxie@udel.edu
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
