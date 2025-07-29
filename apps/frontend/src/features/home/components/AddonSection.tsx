"use client";

import { ContentTypeRow } from "./ContentTypeRow";

interface AddonSectionProps {
  data: {
    addonName: string;
    types: Map<string, unknown[]>;
  };
}

export function AddonSection({ data }: AddonSectionProps) {
  return (
    <section className="space-y-8">
      <h2 className="text-3xl font-bold tracking-tight">{data.addonName}</h2>
      {Array.from(data.types.entries()).map(([type, items]) => (
        <ContentTypeRow key={type} title={type} items={items} />
      ))}
    </section>
  );
}
