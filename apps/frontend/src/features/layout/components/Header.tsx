"use client";

import React from "react";
import { Search, ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useProfileContext } from "@/providers/profile-provider";
import { useAuth } from "@/providers/auth-provider";
import { useView } from "@/providers/view-provider";
import Image from "next/image";

export function Header() {
  const { logout } = useAuth();
  const { selectedProfile, selectProfile } = useProfileContext();
  const { currentView, navigateTo, navigateBack } = useView();

  const handleSwitchProfile = () => {
    selectProfile(null);
  };

  const handleLogout = () => {
    logout();
    selectProfile(null);
  };

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const searchQuery = formData.get("search") as string;
    if (searchQuery.trim()) {
      navigateTo({ name: "search", query: searchQuery.trim() });
    }
  };

  const showBackButton = currentView.name === "meta";
  const showSearchBar = currentView.name !== "meta";

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 px-4 backdrop-blur-sm md:px-6">
      <div className="flex flex-1 items-center justify-start">
        {showBackButton && (
          <Button variant="ghost" size="icon" onClick={navigateBack}>
            <ArrowLeft className="h-6 w-6" />
          </Button>
        )}
      </div>

      <div className="flex flex-1 items-center justify-center">
        {showSearchBar && (
          <form onSubmit={handleSearchSubmit} className="w-full max-w-md">
            <div className="relative">
              <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
              <Input
                type="search"
                name="search"
                placeholder="Search for..."
                className="w-full appearance-none bg-slate-800 pl-8 shadow-none"
              />
            </div>
          </form>
        )}
      </div>

      <div className="flex flex-1 items-center justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="secondary" size="icon" className="rounded-full">
              <Image
                src={selectedProfile?.avatar ?? "/default-avatar.png"}
                alt={selectedProfile?.name ?? "Profile"}
                className="h-8 w-8 rounded-full object-cover"
                width={32}
                height={32}
              />
              <span className="sr-only">Toggle user menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{selectedProfile?.name}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Settings</DropdownMenuItem>
            <DropdownMenuItem>Support</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSwitchProfile}>
              Switch Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleLogout}>Logout</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
