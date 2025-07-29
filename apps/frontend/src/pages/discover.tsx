"use client";

import { useState, useEffect, useMemo } from "react";
import { useProfileContext } from "@/providers/profile-provider";
import { useDiscover } from "@/features/discover/hooks/useDiscover";
import { useCatalog } from "@/features/discover/hooks/useCatalog";
import { DiscoverFilters } from "@/features/discover/components/DiscoverFilters";
import { CatalogGrid } from "@/features/discover/components/CatalogGrid";
import { Skeleton } from "@/components/ui/skeleton";

export default function DiscoverPage() {
  const { selectedProfile } = useProfileContext();

  const [selectedType, setSelectedType] = useState("");
  const [selectedProvider, setSelectedProvider] = useState("all");
  const [selectedCatalogId, setSelectedCatalogId] = useState("");
  const [extraFilters, setExtraFilters] = useState<Record<string, string>>({});

  const { data: discoverData, isLoading: isLoadingDiscover } = useDiscover(
    selectedProfile?.id ?? "",
  );

  const selectedCatalogData = useMemo(() => {
    if (!discoverData) return undefined;
    return discoverData.find(
      (c) =>
        c.catalogType === selectedType &&
        c.catalogId === selectedCatalogId &&
        (selectedProvider === "all" || c.manifestId === selectedProvider),
    );
  }, [discoverData, selectedType, selectedCatalogId, selectedProvider]);

  const isQueryEnabled = useMemo(() => {
    if (!selectedCatalogData) return false;
    const requiredFilters = selectedCatalogData.extraProps.filter(
      (p) => p.isRequired && p.options && p.options.length > 0,
    );
    if (requiredFilters.length === 0) return true;
    return requiredFilters.every(
      (rf) => !!extraFilters[rf.name] && extraFilters[rf.name] !== "all",
    );
  }, [selectedCatalogData, extraFilters]);

  const queryExtraProps = useMemo(() => {
    const props: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(extraFilters)) {
      if (value && value !== "all") {
        props[key] = value;
      }
    }
    return props;
  }, [extraFilters]);

  const {
    data: catalogData,
    isLoading: isLoadingCatalog,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useCatalog({
    profileId: selectedProfile?.id ?? "",
    itemType: selectedType,
    catalogId: selectedCatalogId,
    providerId: selectedProvider === "all" ? undefined : selectedProvider,
    extraProps: queryExtraProps,
    isEnabled: isQueryEnabled,
  });

  useEffect(() => {
    if (discoverData && discoverData.length > 0 && !selectedType) {
      const firstType = discoverData[0].catalogType;
      handleTypeChange(firstType);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [discoverData, selectedType]);

  useEffect(() => {
    if (selectedCatalogData) {
      const requiredFilters = selectedCatalogData.extraProps.filter(
        (p) => p.isRequired && p.options && p.options.length > 0,
      );
      const updates: Record<string, string> = {};
      requiredFilters.forEach((filter) => {
        if (!extraFilters[filter.name] && filter.options) {
          updates[filter.name] = filter.options[0];
        }
      });
      if (Object.keys(updates).length > 0) {
        setExtraFilters((prev) => ({ ...prev, ...updates }));
      }
    }
  }, [selectedCatalogData, extraFilters]);

  const handleTypeChange = (type: string) => {
    setSelectedType(type);
    setSelectedProvider("all");
    setExtraFilters({});
    const firstCatalogForType = discoverData?.find(
      (c) => c.catalogType === type,
    );
    setSelectedCatalogId(firstCatalogForType?.catalogId ?? "");
  };

  const handleProviderChange = (providerId: string) => {
    setSelectedProvider(providerId);
    setExtraFilters({});
    const firstCatalogForProvider = discoverData?.find(
      (c) =>
        c.catalogType === selectedType &&
        (providerId === "all" || c.manifestId === providerId),
    );
    setSelectedCatalogId(firstCatalogForProvider?.catalogId ?? "");
  };

  const handleCatalogChange = (catalogId: string) => {
    setSelectedCatalogId(catalogId);
    setExtraFilters({});
  };

  const handleExtraFilterChange = (key: string, value: string) => {
    setExtraFilters((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="container mx-auto">
      <h1 className="mb-6 text-3xl font-bold tracking-tight">Discover</h1>

      {isLoadingDiscover ? (
        <div className="space-y-4">
          <Skeleton className="h-10 w-full max-w-lg" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : (
        <DiscoverFilters
          catalogs={discoverData ?? []}
          selectedType={selectedType}
          onTypeChange={handleTypeChange}
          selectedProvider={selectedProvider}
          onProviderChange={handleProviderChange}
          selectedCatalogId={selectedCatalogId}
          onCatalogChange={handleCatalogChange}
          extraFilters={extraFilters}
          onExtraFilterChange={handleExtraFilterChange}
        />
      )}

      <CatalogGrid
        pages={catalogData?.pages.map((p) => p.items)}
        isLoading={isLoadingCatalog && isQueryEnabled}
        fetchNextPage={fetchNextPage}
        hasNextPage={!!hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
      />

      {!isQueryEnabled && !isLoadingDiscover && (
        <div className="text-muted-foreground py-10 text-center">
          <p>Please make a selection in all required filters to see content.</p>
        </div>
      )}
    </div>
  );
}
