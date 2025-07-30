"use client";

import { useMemo } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { DiscoverableCatalogsQuery } from "@/orchestrators/graphql-query-orchestrator/gen/graphql";

type Catalog = NonNullable<
  DiscoverableCatalogsQuery["profile"]
>["discoverableCatalogs"][0];

type ExtraProp = {
  name: string;
  options?: string[];
  isRequired?: boolean;
};

interface DiscoverFiltersProps {
  catalogs: Catalog[];
  // State for each filter level
  selectedType: string;
  onTypeChange: (type: string) => void;
  selectedProvider: string;
  onProviderChange: (provider: string) => void;
  selectedCatalogId: string;
  onCatalogChange: (catalogId: string) => void;
  // State for dynamic sub-filters
  extraFilters: Record<string, string>;
  onExtraFilterChange: (key: string, value: string) => void;
}

export function DiscoverFilters({
  catalogs,
  selectedType,
  onTypeChange,
  selectedProvider,
  onProviderChange,
  selectedCatalogId,
  onCatalogChange,
  extraFilters,
  onExtraFilterChange,
}: DiscoverFiltersProps) {
  const contentTypes: string[] = useMemo(
    () => [...new Set((catalogs ?? []).map((c) => c.catalogType))],
    [catalogs],
  );

  const providers: { id: string; name: string }[] = useMemo(() => {
    const uniqueProviders = new Map<string, string>();
    catalogs
      .filter((c) => c.catalogType === selectedType)
      .forEach((c) => uniqueProviders.set(c.manifestId, c.addonName));
    return Array.from(uniqueProviders, ([id, name]) => ({ id, name }));
  }, [catalogs, selectedType]);

  const availableCatalogs: Catalog[] = useMemo(() => {
    return catalogs.filter(
      (c) =>
        c.catalogType === selectedType &&
        (selectedProvider === "all" || c.manifestId === selectedProvider),
    );
  }, [catalogs, selectedType, selectedProvider]);

  const selectedCatalogData: Catalog | undefined = useMemo(() => {
    return availableCatalogs.find((c) => c.catalogId === selectedCatalogId);
  }, [availableCatalogs, selectedCatalogId]);

  const dynamicFilters: ExtraProp[] = useMemo(() => {
    return (
      (selectedCatalogData?.extraProps as ExtraProp[] | undefined)?.filter(
        (p) => p.options && p.options.length > 0,
      ) ?? []
    );
  }, [selectedCatalogData]);

  return (
    <div className="mb-8 space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        {/* Type Selector */}
        <Select value={selectedType} onValueChange={onTypeChange}>
          <SelectTrigger className="w-auto min-w-[180px]">
            <SelectValue placeholder="Select Type" />
          </SelectTrigger>
          <SelectContent>
            {contentTypes.map((type) => (
              <SelectItem key={type} value={type} className="capitalize">
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Provider Selector */}
        <Select value={selectedProvider} onValueChange={onProviderChange}>
          <SelectTrigger className="w-auto min-w-[180px]">
            <SelectValue placeholder="Select Provider" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Providers</SelectItem>
            {providers.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Catalog Selector */}
        <Select value={selectedCatalogId} onValueChange={onCatalogChange}>
          <SelectTrigger className="w-auto min-w-[200px]">
            <SelectValue placeholder="Select Catalog" />
          </SelectTrigger>
          <SelectContent>
            {availableCatalogs.map((c) => (
              <SelectItem
                key={`${c.manifestId}-${c.catalogId}`}
                value={c.catalogId}
              >
                {c.catalogName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Dynamically Rendered Sub-filters */}
        {dynamicFilters.map((filter) => (
          <Select
            key={filter.name}
            value={extraFilters[filter.name] ?? ""}
            onValueChange={(value) => onExtraFilterChange(filter.name, value)}
          >
            <SelectTrigger className="w-auto min-w-[180px]">
              <SelectValue
                placeholder={`Select ${filter.name}`}
                className="capitalize"
              />
            </SelectTrigger>
            <SelectContent>
              {!filter.isRequired && <SelectItem value="all">All</SelectItem>}
              {filter.options?.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ))}
      </div>
    </div>
  );
}
