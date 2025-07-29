"use client";

import React from "react";
import { Sidebar } from "./components/Sidebar";
import { Header } from "./components/Header";
interface MainAppLayoutProps {
  children: React.ReactNode;
}

// This component is now a simple, "dumb" layout shell.
export function MainAppLayout({ children }: MainAppLayoutProps) {
  return (
    <div className="bg-muted/40 flex min-h-screen w-full flex-col">
      <Sidebar />
      <div className="flex flex-col pl-20">
        <Header />
        <main className="flex-1 p-4 sm:px-6 md:gap-8">{children}</main>
      </div>
    </div>
  );
}
