"use client";

import { Button } from "@/components/ui/button";
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-semibold tracking-tight capitalize">
          {title}
        </h3>
        {/* The "See More" button will be implemented here */}
        <Button variant="link">See More</Button>
      </div>
      <div className="flex space-x-4 overflow-x-auto pb-4">
        {items.slice(0, 10).map((item) => (
          <div key={item.id} className="w-48 flex-shrink-0">
            <CatalogItemCard item={item} />
          </div>
        ))}
      </div>
    </div>
  );
}
