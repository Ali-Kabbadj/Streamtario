"use client";

import React from "react";
import { Sidebar } from "./components/Sidebar";
import { Header } from "./components/Header";
import { useView } from "@/providers/view-provider";

interface MainAppLayoutProps {
  children: React.ReactNode;
}

export function MainAppLayout({ children }: MainAppLayoutProps) {
  const { currentView } = useView();

  const showSideBar = currentView.name === "meta";
  return (
    <div className="bg-muted/40 min-h-screen w-full">
      <Header />
      {!showSideBar && <Sidebar />}
      <main>
        <div className="p-4 sm:px-6 md:gap-8">{children}</div>
      </main>
    </div>
  );
}
