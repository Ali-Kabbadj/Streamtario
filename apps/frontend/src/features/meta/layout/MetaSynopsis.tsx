"use client";

import type { MetaItemType } from "@/orchestrators/graphql-query-orchestrator/gen/graphql";

interface MetaSynopsisProps {
  meta: MetaItemType;
}

export function MetaSynopsis({ meta }: MetaSynopsisProps) {
  return (
    <div className="mt-8 grid grid-cols-1 gap-12 px-4 md:grid-cols-3 md:px-0">
      <div className="col-span-1 flex flex-col gap-4 md:col-span-2">
        <div>
          <h2 className="text-2xl font-bold">Synopsis</h2>
          <p className="text-muted-foreground mt-2 text-lg">
            {meta.description}
          </p>
        </div>
      </div>
      <div className="col-span-1 space-y-3">
        {meta.director && meta.director.length > 0 && (
          <div>
            <h3 className="font-semibold">Director</h3>
            <p className="text-muted-foreground">{meta.director.join(", ")}</p>
          </div>
        )}
        {meta.writer && meta.writer.length > 0 && (
          <div>
            <h3 className="font-semibold">Writers</h3>
            <p className="text-muted-foreground">{meta.writer.join(", ")}</p>
          </div>
        )}
      </div>
    </div>
  );
}
