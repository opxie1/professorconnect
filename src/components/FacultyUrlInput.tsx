import { Input } from "@/components/ui/input";
import { Link, HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface FacultyUrlInputProps {
  value: string;
  onChange: (value: string) => void;
  universityName?: string;
}

export function FacultyUrlInput({ value, onChange, universityName }: FacultyUrlInputProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-foreground flex items-center gap-2">
        <Link className="h-4 w-4 text-primary" />
        Faculty Directory URL
        <Tooltip>
          <TooltipTrigger asChild>
            <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
          </TooltipTrigger>
          <TooltipContent className="max-w-sm">
            <p>
              Paste the URL of the department's faculty page. This is usually found by searching
              "{universityName || 'University'} [Department] faculty" on Google.
            </p>
          </TooltipContent>
        </Tooltip>
      </label>
      <div className="relative">
        <Link className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          type="url"
          placeholder="https://university.edu/department/faculty"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="pl-12 pr-4 h-14 text-base rounded-xl border-2 border-border focus:border-primary transition-colors shadow-soft"
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Example: https://cis.udel.edu/people/faculty/
      </p>
    </div>
  );
}
