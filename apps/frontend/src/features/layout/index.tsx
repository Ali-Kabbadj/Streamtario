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

  const showSideBar = currentView.name !== "meta";
  return (
    <div className="bg-muted/40 flex h-screen w-full flex-col">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        {showSideBar && <Sidebar />}
        <main className="flex-1 overflow-x-hidden overflow-y-auto">
          <div className="pl-2">{children}</div>
        </main>
      </div>
    </div>
  );
}
