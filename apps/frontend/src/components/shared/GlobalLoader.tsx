"use client";

import { Skeleton } from "@/components/ui/skeleton";

export function GlobalLoader() {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-slate-900">
      <div className="flex items-center space-x-4">
        <Skeleton className="h-12 w-12 rounded-full bg-slate-700" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-[250px] bg-slate-700" />
          <Skeleton className="h-4 w-[200px] bg-slate-700" />
        </div>
      </div>
    </div>
  );
}
