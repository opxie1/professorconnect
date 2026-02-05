import { departments } from "@/data/universities";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookOpen } from "lucide-react";

interface DepartmentSelectProps {
  value: string;
  onValueChange: (value: string) => void;
}

export function DepartmentSelect({ value, onValueChange }: DepartmentSelectProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-foreground flex items-center gap-2">
        <BookOpen className="h-4 w-4 text-primary" />
        Select Department
      </label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="h-14 text-lg rounded-xl border-2 border-border focus:border-primary shadow-soft">
          <SelectValue placeholder="Choose a department..." />
        </SelectTrigger>
        <SelectContent className="rounded-xl">
          {departments.map((dept) => (
            <SelectItem key={dept} value={dept} className="py-3">
              {dept}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
