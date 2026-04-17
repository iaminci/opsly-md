"use client";

import { useCallback, useState } from "react";
import { Search as SearchIcon, X } from "lucide-react";
import type { Document } from "@/types/document";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

function getFirstHeading(content: string): string | null {
  const match = content.match(/^#{1,6}\s+(.+)$/m);
  return match ? match[1].replace(/#+\s*$/, "").trim() : null;
}

interface SearchProps {
  documents: Document[];
  onSelect: (doc: Document) => void;
}

export function Search({ documents, onSelect }: SearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Document[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const search = useCallback(
    (q: string) => {
      setQuery(q);
      if (!q.trim()) {
        setResults([]);
        return;
      }
      const lower = q.toLowerCase();
      const matches = documents.filter(
        (doc) =>
          doc.title.toLowerCase().includes(lower) ||
          doc.content.toLowerCase().includes(lower)
      );
      setResults(matches.slice(0, 8));
      setIsOpen(true);
    },
    [documents]
  );

  const clear = useCallback(() => {
    setQuery("");
    setResults([]);
    setIsOpen(false);
  }, []);

  const showClear = query.length > 0;

  return (
    <div className="relative">
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-sidebar-foreground/50" />
        <Input
          type="text"
          placeholder="Search Markdown Files"
          value={query}
          onChange={(e) => search(e.target.value)}
          onFocus={() => query && setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 150)}
          className={
            "!h-10 !border-[2px] !border-sidebar-border !bg-sidebar text-sm font-medium !shadow-none !rounded-[5px] focus-visible:!border-sidebar-ring focus-visible:!ring-1 focus-visible:!ring-sidebar-ring focus-visible:!ring-offset-0 pl-8 " +
            (showClear ? "pr-9 " : "pr-2.5 ")
          }
          autoComplete="off"
        />
        {showClear && (
          <button
            type="button"
            aria-label="Clear search"
            className="absolute right-2 top-1/2 z-10 flex size-7 -translate-y-1/2 items-center justify-center rounded-[4px] text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-primary"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => clear()}
          >
            <X className="size-4 shrink-0" strokeWidth={2.5} />
          </button>
        )}
      </div>
      {isOpen && results.length > 0 && (
        <div className="no-scrollbar absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-y-auto overflow-x-hidden rounded-[5px] border-2 border-sidebar-border bg-sidebar shadow-md">
          {results.map((doc) => (
            <Button
              key={doc.id}
              type="button"
              variant="neutral"
              className="h-auto w-full justify-start rounded-none border-1 px-3 py-2 font-normal shadow-none hover:translate-x-0 hover:translate-y-0 hover:bg-sidebar-accent hover:shadow-none"
              onClick={() => {
                onSelect(doc);
                setIsOpen(false);
                setQuery("");
              }}
            >
              <span className="flex flex-col items-start text-left">
                <span className="font-medium truncate w-full">
                  {getFirstHeading(doc.content) ?? doc.title}
                </span>
                <span className="truncate w-full text-muted-foreground text-xs">
                  {doc.content.slice(0, 80).replace(/\n/g, " ")}...
                </span>
              </span>
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
