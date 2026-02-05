import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { searchUniversities, University } from "@/data/universities";
import { Search, School, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

interface UniversitySearchProps {
  onSelect: (university: University) => void;
  selectedUniversity: University | null;
}

export function UniversitySearch({ onSelect, selectedUniversity }: UniversitySearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<University[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.length > 1) {
      const filtered = searchUniversities(query);
      setResults(filtered);
      setIsOpen(filtered.length > 0);
      setHighlightedIndex(0);
    } else {
      setResults([]);
      setIsOpen(false);
    }
  }, [query]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (university: University) => {
    onSelect(university);
    setQuery(university.name);
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) => Math.min(prev + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && results[highlightedIndex]) {
      e.preventDefault();
      handleSelect(results[highlightedIndex]);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search for a university..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.length > 1 && setIsOpen(true)}
          onKeyDown={handleKeyDown}
          className="pl-12 pr-4 h-14 text-lg rounded-xl border-2 border-border focus:border-primary transition-colors shadow-soft"
        />
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute z-50 w-full mt-2 bg-card rounded-xl shadow-elevated border border-border overflow-hidden animate-slide-up">
          <ul className="max-h-80 overflow-y-auto py-2">
            {results.map((university, index) => (
              <li
                key={`${university.name}-${university.state}`}
                onClick={() => handleSelect(university)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors",
                  index === highlightedIndex
                    ? "bg-primary/10"
                    : "hover:bg-muted"
                )}
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <School className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">
                    {university.name}
                  </p>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {university.state} • {university.type === "public" ? "Public" : "Private"}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {selectedUniversity && (
        <div className="mt-4 p-4 bg-success/10 border border-success/30 rounded-xl flex items-center gap-3 animate-fade-in">
          <div className="flex-shrink-0 w-12 h-12 rounded-xl gradient-accent flex items-center justify-center">
            <School className="h-6 w-6 text-accent-foreground" />
          </div>
          <div>
            <p className="font-semibold text-foreground">{selectedUniversity.name}</p>
            <p className="text-sm text-muted-foreground">
              {selectedUniversity.state} • {selectedUniversity.type === "public" ? "Public University" : "Private University"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
