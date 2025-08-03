"use client";

import { Button } from "@/components/ui/button";
import type { LinkType } from "@/orchestrators/graphql-query-orchestrator/gen/graphql";
import { Link as LinkIcon } from "lucide-react";

interface MetaLinksProps {
  links?: (LinkType | null)[] | null;
}

export function MetaLinks({ links }: MetaLinksProps) {
  if (!links || links.length === 0) {
    return null;
  }

  return (
    <div className="mt-12 px-4 md:px-0">
      <h2 className="mb-4 text-2xl font-bold">
        <LinkIcon className="mr-3 inline-block h-6 w-6" />
        Official Links
      </h2>
      <div className="flex flex-wrap gap-3">
        {links.map(
          (link, index) =>
            link && (
              <Button
                key={`${link.url}-${index}`}
                asChild
                variant="outline"
                className="bg-slate-800/50"
              >
                <a
                  href={link.url ?? ""}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {link.name}
                </a>
              </Button>
            ),
        )}
      </div>
    </div>
  );
}
