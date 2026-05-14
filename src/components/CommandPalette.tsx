"use client";

import { useEffect } from "react";
import {
  CommandDialog,
  Command,
  CommandInput,
  CommandList,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import {
  FolderPlus,
  Search,
  FolderOpen,
  Download,
  Upload,
  FilePlus,
} from "lucide-react";

export interface CommandPaletteHandlers {
  onCreateDocument?: () => void;
  onCreateFolder?: () => void;
  onSearchDocuments?: () => void;
  onSwitchWorkspace?: () => void;
  onExportWorkspace?: () => void;
  onImportWorkspace?: () => void;
}

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  handlers: CommandPaletteHandlers;
}

export function CommandPalette({
  open,
  onOpenChange,
  handlers,
}: CommandPaletteProps) {
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [open, onOpenChange]);

  const handleSelect = (fn?: () => void) => {
    if (fn) fn();
    onOpenChange(false);
  };

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Command palette"
      description="Search for a command to run..."
      showCloseButton
    >
      <Command className="rounded-md border-0 shadow-none">
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <CommandGroup heading="Actions">
            {handlers.onCreateDocument && (
              <CommandItem
                onSelect={() => handleSelect(handlers.onCreateDocument)}
              >
                <FilePlus className="mr-2 size-4" />
                Create Document
              </CommandItem>
            )}
            {handlers.onCreateFolder && (
              <CommandItem
                onSelect={() => handleSelect(handlers.onCreateFolder)}
              >
                <FolderPlus className="mr-2 size-4" />
                Create Folder
              </CommandItem>
            )}
            {handlers.onSearchDocuments && (
              <CommandItem
                onSelect={() => handleSelect(handlers.onSearchDocuments)}
              >
                <Search className="mr-2 size-4" />
                Search Documents
              </CommandItem>
            )}
            {handlers.onSwitchWorkspace && (
              <CommandItem
                onSelect={() => handleSelect(handlers.onSwitchWorkspace)}
              >
                <FolderOpen className="mr-2 size-4" />
                Switch Workspace
              </CommandItem>
            )}
            {handlers.onExportWorkspace && (
              <CommandItem
                onSelect={() => handleSelect(handlers.onExportWorkspace)}
              >
                <Download className="mr-2 size-4" />
                Export Workspace
              </CommandItem>
            )}
            {handlers.onImportWorkspace && (
              <CommandItem
                onSelect={() => handleSelect(handlers.onImportWorkspace)}
              >
                <Upload className="mr-2 size-4" />
                Import Workspace
              </CommandItem>
            )}
          </CommandGroup>
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
