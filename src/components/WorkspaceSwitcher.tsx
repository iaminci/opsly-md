"use client";

import type { Workspace } from "@/types/workspace";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
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
                className="!h-9 !min-h-9 !rounded-[5px] !border-2 !border-border !bg-sidebar-primary !font-heading !font-bold !text-sidebar-primary-foreground !shadow-shadow !outline-0 transition-[transform,box-shadow] hover:!translate-x-[2px] hover:!translate-y-[2px] hover:!bg-sidebar-primary hover:!text-sidebar-primary-foreground hover:!shadow-shadow hover:!outline-0 focus-visible:!outline-0 focus-visible:!bg-sidebar-primary focus-visible:!shadow-shadow"
              >
                <span className="truncate">{label}</span>
                <ChevronDown className="ml-auto size-4 shrink-0" />
              </SidebarMenuButton>
            }
          />
          <DropdownMenuContent
            align="start"
            className="w-[var(--radix-popper-anchor-width)] min-w-0 max-w-[var(--radix-popper-anchor-width)] rounded-[5px] border-2 border-sidebar-border bg-sidebar p-0 font-heading shadow-md"
          >
            <div className="h-[min(50vh,16rem)] w-full overflow-hidden">
              <ScrollArea className="h-full w-full">
                <div className="p-1">
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
                </div>
              </ScrollArea>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
