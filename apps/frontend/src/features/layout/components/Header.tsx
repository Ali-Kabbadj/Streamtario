"use client";

import React from "react";
import { useRouter } from "next/router";
import { Search } from "lucide-react";
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
import { useProfileContext } from "@/providers/profile-provider"; // <-- IMPORT
import { useAuth } from "@/providers/auth-provider"; // <-- IMPORT
import Image from "next/image";

// This component no longer needs props passed down from the layout.
export function Header() {
  const router = useRouter();
  const { logout } = useAuth();
  const { selectedProfile, selectProfile } = useProfileContext();

  const handleSwitchProfile = () => {
    selectProfile(null); // This will trigger the state change in _app.tsx
    void router.push("/"); // Navigate to the root to show profile selection
  };

  const handleLogout = () => {
    logout();
    selectProfile(null);
    void router.push("/"); // Navigate to the root to show the login screen
  };

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const searchQuery = formData.get("search") as string;
    if (searchQuery.trim()) {
      void router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="bg-background-primary sticky top-0 z-30 flex h-16 items-center justify-between gap-4 px-4 backdrop-blur-sm md:px-6">
      <div className="flex-1">
        <form onSubmit={handleSearchSubmit}>
          <div className="relative">
            <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
            <Input
              type="search"
              name="search"
              placeholder="Search for ..."
              className="w-full appearance-none bg-slate-800 pl-8 shadow-none md:w-2/3 lg:w-1/3"
              defaultValue={router.query.q ?? ""}
            />
          </div>
        </form>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="secondary" size="icon" className="rounded-full">
            <Image
              src={selectedProfile?.avatar ?? "/default-avatar.png"}
              alt={selectedProfile?.name ?? "Profile"}
              className="h-8 w-8 rounded-full object-cover"
              width={10}
              height={10}
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
    </header>
  );
}
