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
  const label = selected ? selected.name : "All Workspaces";

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              isActive
              className="!h-9 !min-h-9 !rounded-[5px] !border-2 !border-border !bg-sidebar-primary/75 !font-heading !font-bold !text-white !shadow-shadow !outline-0 transition-[transform,box-shadow] hover:!translate-x-[2px] hover:!translate-y-[2px] hover:!bg-sidebar-primary/75 hover:!text-sidebar-primary-foreground hover:!shadow-shadow hover:!outline-0 focus-visible:!outline-0 focus-visible:!bg-sidebar-primary/75 focus-visible:!shadow-shadow"
            >
              <span className="truncate">{label}</span>
              <ChevronDown className="ml-auto size-4 shrink-0" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="w-[var(--radix-popper-anchor-width)] min-w-0 max-w-[var(--radix-popper-anchor-width)] rounded-[5px] border-2 border-sidebar-border bg-sidebar p-0 font-heading shadow-md"
          >
            <div className="no-scrollbar max-h-[min(50vh,16rem)] w-full overflow-y-auto overflow-x-hidden">
              <div className="p-1">
                <DropdownMenuItem
                  onClick={() => onSelect(null)}
                  className={cn(
                    !selectedId &&
                      "bg-sidebar-accent font-semibold text-sidebar-accent-foreground"
                  )}
                >
                  <span className="truncate">All Workspaces</span>
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
              </div>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
