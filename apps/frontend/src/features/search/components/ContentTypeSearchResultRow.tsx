"use client";

import type { SearchResultItem } from "../hooks/useSearch";
import { CatalogItemCard } from "@/components/features/discover/CatalogItemCard";

interface ContentTypeSearchResultRowProps {
  title: string;
  items: SearchResultItem[];
}

export function ContentTypeSearchResultRow({
  title,
  items,
}: ContentTypeSearchResultRowProps) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-semibold tracking-tight capitalize">
          {title}
        </h3>
      </div>
      <div className="flex space-x-4 overflow-x-auto py-4 pr-2 pb-4 pl-2 sm:pr-4">
        {items.map((item) => (
          <div key={item.id} className="w-48 flex-shrink-0">
            <CatalogItemCard item={item} />
          </div>
        ))}
      </div>
    </div>
  );
}
