"use client";

import type { Workspace } from "@/types/workspace";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

interface WorkspaceSwitcherProps {
  workspaces: Workspace[];
  selectedId: string | null;
  onSelect: (workspaceId: string | null) => void;
}

export function WorkspaceSwitcher({
  workspaces,
  selectedId,
  onSelect,
}: WorkspaceSwitcherProps) {
  const selected = selectedId
    ? workspaces.find((w) => w.id === selectedId)
    : null;
  const label = selected ? selected.name : "All workspaces";

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                isActive
                className="!h-9 !min-h-9 !border-0 !rounded-[10px] !bg-sidebar-primary !font-heading !font-bold !text-sidebar-primary-foreground !shadow-none !outline-0 hover:!bg-sidebar-primary/90 hover:!text-sidebar-primary-foreground hover:!outline-0 focus-visible:!outline-0 focus-visible:!bg-sidebar-primary"
              >
                <span className="truncate">{label}</span>
                <ChevronDown className="ml-auto size-4 shrink-0" />
              </SidebarMenuButton>
            }
          />
          <DropdownMenuContent
            align="start"
            className="w-[--radix-popper-anchor-width] min-w-48 rounded-[10px] border border-sidebar-border bg-sidebar font-heading shadow-md"
          >
            <DropdownMenuItem
              onClick={() => onSelect(null)}
              className={cn(
                !selectedId &&
                  "bg-sidebar-accent font-semibold text-sidebar-accent-foreground"
              )}
            >
              <span className="truncate">All workspaces</span>
            </DropdownMenuItem>
            {workspaces.map((ws) => (
              <DropdownMenuItem
                key={ws.id}
                onClick={() => onSelect(ws.id)}
                className={cn(
                  selectedId === ws.id &&
                    "bg-sidebar-accent font-semibold text-sidebar-accent-foreground"
                )}
              >
                <span className="truncate">{ws.name}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
