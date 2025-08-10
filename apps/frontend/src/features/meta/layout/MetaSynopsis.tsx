"use client";

import { Button } from "@/components/ui/button";
import type { MetaItemType } from "@/orchestrators/graphql-query-orchestrator/gen/graphql";
import React from "react";

interface MetaSynopsisProps {
  meta: MetaItemType;
  onPersonClick: (name: string) => void; // <-- ADD PROP
}

export function MetaSynopsis({ meta, onPersonClick }: MetaSynopsisProps) {
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
            <h3 className="font-semibold">Director(s)</h3>
            <div className="text-muted-foreground">
              {meta.director.map((name, index) => (
                <React.Fragment key={name}>
                  <Button
                    variant="link"
                    className="h-auto p-0"
                    onClick={() => onPersonClick(name)}
                  >
                    {name}
                  </Button>
                  {index < meta.director!.length - 1 && ", "}
                </React.Fragment>
              ))}
            </div>
          </div>
        )}
        {meta.writer && meta.writer.length > 0 && (
          <div>
            <h3 className="font-semibold">Writer(s)</h3>
            <div className="text-muted-foreground">
              {meta.writer.map((name, index) => (
                <React.Fragment key={name}>
                  <Button
                    variant="link"
                    className="h-auto p-0"
                    onClick={() => onPersonClick(name)}
                  >
                    {name}
                  </Button>
                  {index < meta.writer!.length - 1 && ", "}
                </React.Fragment>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
