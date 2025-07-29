"use client";

import { CatalogItemCard } from "@/components/features/discover/CatalogItemCard";
import type { CatalogQuery } from "@/orchestrators/graphql-query-orchestrator/gen/graphql";

type CatalogItem = CatalogQuery["profile"]["catalog"]["items"][0];

interface ContentTypeRowProps {
  title: string;
  items: CatalogItem[];
}

export function ContentTypeRow({ title, items }: ContentTypeRowProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-2xl font-semibold tracking-tight capitalize">
        {title}
      </h3>
      <div className="flex space-x-4 overflow-x-auto pb-4">
        {items.map((item) => (
          <div key={item.id} className="w-48 flex-shrink-0">
            <CatalogItemCard item={item} />
          </div>
        ))}
      </div>
    </div>
  );
}
