"use client";

import { useEffect, useMemo, useLayoutEffect } from "react";
import { useProfileContext } from "@/providers/profile-provider";
import { useDiscoverContext } from "@/providers/discover-provider";
import { useDiscover } from "@/features/discover/hooks/useDiscover";
import { useCatalog } from "@/features/discover/hooks/useCatalog";
import { DiscoverFilters } from "@/features/discover/components/DiscoverFilters";
import { CatalogGrid } from "@/features/discover/components/CatalogGrid";
import { Skeleton } from "@/components/ui/skeleton";
import { useView } from "@/providers/view-provider";
import { Button } from "@/components/ui/button";

export function DiscoverView() {
  const { selectedProfile } = useProfileContext();
  const {
    selectedType,
    setSelectedType,
    selectedProvider,
    setSelectedProvider,
    selectedCatalogId,
    setSelectedCatalogId,
    extraFilters,
    setExtraFilters,
    scrollPosition,
    setScrollPosition,
  } = useDiscoverContext();

  const { navigateTo } = useView();

  const { data: discoverData, isLoading: isLoadingDiscover } = useDiscover(
    selectedProfile?.id ?? "",
  );

  useLayoutEffect(() => {
    window.scrollTo(0, scrollPosition);
  }, [scrollPosition]);

  useEffect(() => {
    return () => {
      setScrollPosition(window.scrollY);
    };
  }, [setScrollPosition]);

  useEffect(() => {
    if (discoverData && discoverData.length > 0 && !selectedType) {
      setSelectedType(discoverData[0].catalogType);
    }
  }, [discoverData, selectedType, setSelectedType]);

  useEffect(() => {
    if (selectedType && discoverData) {
      const firstProviderForType = discoverData.find(
        (c) => c.catalogType === selectedType,
      );
      if (firstProviderForType) {
        setSelectedProvider(firstProviderForType.manifestId);
        setSelectedCatalogId(firstProviderForType.catalogId);
        setExtraFilters({});
      }
    }
  }, [
    selectedType,
    discoverData,
    setSelectedProvider,
    setSelectedCatalogId,
    setExtraFilters,
  ]);

  const selectedCatalogData = useMemo(() => {
    if (!discoverData) return undefined;
    return discoverData.find(
      (c) =>
        c.catalogType === selectedType && c.catalogId === selectedCatalogId,
    );
  }, [discoverData, selectedType, selectedCatalogId]);

  const isQueryEnabled = useMemo(() => {
    if (!selectedCatalogData) return false;
    const requiredFilters =
      selectedCatalogData.extraProps.filter(
        (p) => p.isRequired && p.options && p.options.length > 0,
      ) ?? [];
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
    providerId: selectedProvider,
    extraProps: queryExtraProps,
    isEnabled: isQueryEnabled && !!selectedProvider,
  });

  const handleTypeChange = (type: string) => {
    setSelectedType(type);
  };

  const handleProviderChange = (providerId: string) => {
    setSelectedProvider(providerId);
    setExtraFilters({});
    const firstCatalogForProvider = discoverData?.find(
      (c) => c.catalogType === selectedType && c.manifestId === providerId,
    );
    setSelectedCatalogId(firstCatalogForProvider?.catalogId ?? "");
  };

  const handleCatalogChange = (catalogId: string) => {
    setSelectedCatalogId(catalogId);
    setExtraFilters({});
  };

  const handleExtraFilterChange = (key: string, value: string) => {
    setExtraFilters({ ...extraFilters, [key]: value });
  };

  return (
    <div className="container mx-auto">
      <div className="mb-8">
        <h1 className="mb-4 text-6xl font-bold tracking-tight">Discover</h1>
      </div>
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
        <>
          <div className="text-muted-foreground flex justify-center py-10 text-center">
            <p>
              Please make sure you installed at least one metadata{" "}
              <Button onClick={() => navigateTo({ name: "addons" })}>
                Addons
              </Button>
            </p>
          </div>
        </>
      )}
    </div>
  );
}
