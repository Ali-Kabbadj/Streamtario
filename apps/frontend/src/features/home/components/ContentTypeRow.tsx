"use client";

import { CatalogItemCard } from "@/components/features/discover/CatalogItemCard";
import { Button } from "@/components/ui/button";
import type { CatalogQuery } from "@/orchestrators/graphql-query-orchestrator/gen/graphql";

type CatalogItem = NonNullable<
  NonNullable<CatalogQuery["profile"]>["catalog"]
>["items"][0];

interface ContentTypeRowProps {
  title: string;
  items: CatalogItem[];
}

export function ContentTypeRow({ title, items }: ContentTypeRowProps) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <h3 className="text-1xl font-semibold tracking-tight capitalize">
          {title}
        </h3>
        <Button variant="link">See More</Button>
      </div>

      <div className="flex space-x-4 overflow-x-auto py-4 pb-4 pl-2 sm:pr-4">
        {items.map((item) => (
          <div key={item.id} className="w-48 flex-shrink-0">
            <CatalogItemCard item={item} />
          </div>
        ))}
      </div>
    </div>
  );
}
