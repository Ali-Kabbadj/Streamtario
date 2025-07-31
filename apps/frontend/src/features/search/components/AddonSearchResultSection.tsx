"use client";

import { ContentTypeSearchResultRow } from "./ContentTypeSearchResultRow";
import type { AddonResults } from "../hooks/useSearch";

interface AddonSearchResultSectionProps {
  data: AddonResults;
}

export function AddonSearchResultSection({
  data,
}: AddonSearchResultSectionProps) {
  return (
    <section className="space-y-8">
      <h2 className="text-3xl font-bold tracking-tight">{data.addonName}</h2>
      {data.error ? (
        <p className="text-muted-foreground italic">
          This addon returned an error: {data.error}
        </p>
      ) : (
        Array.from(data.resultsByType.entries()).map(([type, items]) => (
          <ContentTypeSearchResultRow key={type} title={type} items={items} />
        ))
      )}
    </section>
  );
}
