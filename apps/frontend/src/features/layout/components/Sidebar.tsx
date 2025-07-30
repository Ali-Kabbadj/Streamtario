"use client";

import { useView } from "@/providers/view-provider";
import { Home, Puzzle, Compass } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const navLinks = [
  { viewName: "home", label: "Home", icon: Home },
  { viewName: "discover", label: "Discover", icon: Compass },
  { viewName: "addons", label: "Add-ons", icon: Puzzle },
] as const;

export function Sidebar() {
  const { currentView, navigateTo } = useView();

  return (
    <TooltipProvider delayDuration={0}>
      <aside className="bg-background-primary fixed inset-y-0 left-0 z-10 flex w-20 flex-col">
        <nav className="flex flex-col items-center gap-4 px-2 py-4">
          <div className="h-10 w-10" />
          {navLinks.map(({ viewName, label, icon: Icon }) => {
            const isActive = currentView.name === viewName;
            return (
              <Tooltip key={label}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => navigateTo({ name: viewName })}
                    className={cn(
                      "hover:text-foreground flex h-12 w-12 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-800",
                      {
                        "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground":
                          isActive,
                      },
                    )}
                  >
                    <Icon className="h-6 w-6" />
                    <span className="sr-only">{label}</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">{label}</TooltipContent>
              </Tooltip>
            );
          })}
        </nav>
      </aside>
    </TooltipProvider>
  );
}
