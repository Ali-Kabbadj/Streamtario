"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Settings, Puzzle, Compass } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// This navigation structure is now correct.
const navLinks = [
  { href: "/", label: "Home", icon: Home },
  { href: "/discover", label: "Discover", icon: Compass },
  { href: "/addons", label: "Add-ons", icon: Puzzle },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <TooltipProvider delayDuration={0}>
      <aside className="bg-background-primary fixed inset-y-0 left-0 z-10 flex w-20 flex-col">
        <nav className="flex flex-col items-center gap-4 px-2 py-4">
          <div className="h-10 w-10" />
          {navLinks.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href;
            return (
              <Tooltip key={label}>
                <TooltipTrigger asChild>
                  <Link
                    href={href}
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
                  </Link>
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
