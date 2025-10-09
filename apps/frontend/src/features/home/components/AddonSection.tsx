"use client";

import { ContentTypeRow } from "./ContentTypeRow";

type ContentRow = {
  __typename?: "HomeContentRowType";
  title: string;
  items: {
    __typename?: "CatalogItemType";
    id: string;
    name: string;
    type: string;
    poster?: string | null;
  }[];
};

type AddonSectionData = {
  __typename?: "HomeAddonSectionType";
  addonName: string;
  content: ContentRow[];
};

interface AddonSectionProps {
  data: AddonSectionData;
}

export function AddonSection({ data }: AddonSectionProps) {
  if (!data.content) {
    return null;
  }
  return (
    <section className="space-y-1">
      <h2 className="text-center text-3xl font-bold tracking-tight">
        {data.addonName}
      </h2>
      {data.content.map((row) => (
        <ContentTypeRow key={row.title} title={row.title} items={row.items} />
      ))}
    </section>
  );
}
