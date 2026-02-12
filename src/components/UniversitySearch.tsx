import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { universities, searchUniversities, University } from "@/data/universities";
import { Search, School, MapPin, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

interface UniversitySearchProps {
  onSelect: (university: University) => void;
  selectedUniversity: University | null;
}

export function UniversitySearch({ onSelect, selectedUniversity }: UniversitySearchProps) {
  const [query, setQuery] = useState("");

  const displayedUniversities = useMemo(() => {
    if (query.length > 1) {
      return searchUniversities(query);
    }
    return universities;
  }, [query]);

  return (
    <div className="w-full space-y-3">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search for a university..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-12 pr-4 h-12 text-base rounded-xl border-2 border-border focus:border-primary transition-colors shadow-soft"
        />
      </div>

      <div className="border-2 border-border rounded-xl overflow-hidden bg-card">
        <div className="px-4 py-2 border-b border-border bg-muted/50">
          <p className="text-xs text-muted-foreground font-medium">
            {displayedUniversities.length} universities
            {query.length > 1 && ` matching "${query}"`}
          </p>
        </div>
        <ScrollArea className="h-64">
          <ul className="py-1">
            {displayedUniversities.map((university) => {
              const isSelected =
                selectedUniversity?.name === university.name &&
                selectedUniversity?.state === university.state;
              return (
                <li
                  key={`${university.name}-${university.state}`}
                  onClick={() => onSelect(university)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors",
                    isSelected
                      ? "bg-primary/10 border-l-4 border-primary"
                      : "hover:bg-muted border-l-4 border-transparent"
                  )}
                >
                  <div className={cn(
                    "flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center",
                    isSelected ? "bg-primary/20" : "bg-primary/10"
                  )}>
                    {isSelected ? (
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                    ) : (
                      <School className="h-4 w-4 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "text-sm truncate",
                      isSelected ? "font-semibold text-foreground" : "font-medium text-foreground"
                    )}>
                      {university.name}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {university.state} • {university.type === "public" ? "Public" : "Private"}
                    </p>
                  </div>
                </li>
              );
            })}
            {displayedUniversities.length === 0 && (
              <li className="px-4 py-8 text-center text-sm text-muted-foreground">
                No universities found matching "{query}"
              </li>
            )}
          </ul>
        </ScrollArea>
      </div>
    </div>
  );
}
