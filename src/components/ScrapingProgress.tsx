import { useState, useEffect } from "react";
import { Progress } from "@/components/ui/progress";
import { Search, Globe, FlaskConical, Users } from "lucide-react";

const STEPS = [
  { label: "Mapping website structure...", icon: Globe, duration: 8000 },
  { label: "Discovering faculty pages...", icon: Search, duration: 12000 },
  { label: "Extracting professor data...", icon: FlaskConical, duration: 15000 },
  { label: "Deduplicating results...", icon: Users, duration: 5000 },
];

export function ScrapingProgress() {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed((prev) => prev + 200);
    }, 200);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let accumulated = 0;
    for (let i = 0; i < STEPS.length; i++) {
      accumulated += STEPS[i].duration;
      if (elapsed < accumulated) {
        setCurrentStep(i);
        const stepStart = accumulated - STEPS[i].duration;
        const stepProgress = (elapsed - stepStart) / STEPS[i].duration;
        const baseProgress = (i / STEPS.length) * 100;
        const stepContribution = (1 / STEPS.length) * 100 * Math.min(stepProgress, 1);
        setProgress(Math.min(baseProgress + stepContribution, 95));
        return;
      }
    }
    // After all steps, hover at 95%
    setCurrentStep(STEPS.length - 1);
    setProgress(95);
  }, [elapsed]);

  const step = STEPS[currentStep];
  const Icon = step.icon;

  return (
    <div className="space-y-3 pt-2 animate-fade-in">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon className="h-4 w-4 text-primary animate-pulse" />
        <span>{step.label}</span>
      </div>
      <Progress value={progress} className="h-2" />
      <p className="text-xs text-muted-foreground text-right">
        {Math.round(progress)}% — This may take 1-2 minutes
      </p>
    </div>
  );
}
