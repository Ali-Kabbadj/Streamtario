"use client";

import { useEffect, useMemo, useCallback } from "react";
import { useProfileContext } from "@/providers/profile-provider";
import { useDiscover } from "@/features/discover/hooks/useDiscover";
import { useCatalog } from "@/features/discover/hooks/useCatalog";
import { DiscoverFilters } from "@/features/discover/components/DiscoverFilters";
import { CatalogGrid } from "@/features/discover/components/CatalogGrid";
import { Skeleton } from "@/components/ui/skeleton";
import { useDiscoverContext } from "@/providers/discover-provider";

export function DiscoverView() {
  const { selectedProfile } = useProfileContext();
  const { data: discoverData, isLoading: isLoadingDiscover } = useDiscover(
    selectedProfile?.id ?? "",
  );
  const {
    selectedType,
    selectedProvider,
    selectedCatalogId,
    extraFilters,
    scrollPosition,
    dispatch,
  } = useDiscoverContext();

  const setState = useCallback(
    (payload: Partial<Parameters<typeof dispatch>[0]["payload"]>) => {
      dispatch({ type: "SET_STATE", payload });
    },
    [dispatch],
  );

  useEffect(() => {
    if (discoverData && discoverData.length > 0 && !selectedType) {
      const initialType = discoverData[0]?.catalogType ?? "";
      const firstProvider = discoverData.find(
        (c) => c.catalogType === initialType,
      );
      setState({
        selectedType: initialType,
        selectedProvider: firstProvider?.manifestId ?? "",
        selectedCatalogId: firstProvider?.catalogId ?? "",
        extraFilters: {},
      });
    }
  }, [discoverData, selectedType, setState]);

  useEffect(() => {
    const container = window;
    const handleScroll = () => {
      setState({ scrollPosition: container.scrollY });
    };
    if (scrollPosition) {
      container.scrollTo(0, scrollPosition);
    }
    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [scrollPosition, setState]);

  const handleTypeChange = (type: string) => {
    const firstProviderForType = discoverData?.find(
      (c) => c.catalogType === type,
    );
    setState({
      selectedType: type,
      selectedProvider: firstProviderForType?.manifestId ?? "",
      selectedCatalogId: firstProviderForType?.catalogId ?? "",
      extraFilters: {},
    });
  };

  const handleProviderChange = (provider: string) => {
    const firstCatalogForProvider = discoverData?.find(
      (c) => c.catalogType === selectedType && c.manifestId === provider,
    );
    setState({
      selectedProvider: provider,
      selectedCatalogId: firstCatalogForProvider?.catalogId ?? "",
      extraFilters: {},
    });
  };

  const queryExtraProps = useMemo(() => {
    const props: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(extraFilters)) {
      if (value && value !== "all") {
        props[key] = value;
      }
    }
    return props;
  }, [extraFilters]);

  const selectedCatalogData = useMemo(() => {
    if (!discoverData) return undefined;
    return discoverData.find(
      (c) =>
        c.catalogType === selectedType &&
        c.manifestId === selectedProvider &&
        c.catalogId === selectedCatalogId,
    );
  }, [discoverData, selectedType, selectedProvider, selectedCatalogId]);

  const isQueryEnabled = useMemo(() => {
    if (!selectedCatalogData) return false;
    const requiredFilters =
      selectedCatalogData.extraProps.filter((p) => p.isRequired) ?? [];
    if (requiredFilters.length === 0) return true;
    return requiredFilters.every(
      (rf) => !!extraFilters[rf.name] && extraFilters[rf.name] !== "all",
    );
  }, [selectedCatalogData, extraFilters]);

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
    isEnabled: isQueryEnabled && !!selectedProvider && !!selectedCatalogId,
  });

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
          onCatalogChange={(value) => setState({ selectedCatalogId: value })}
          extraFilters={extraFilters}
          onExtraFilterChange={(key, value) =>
            setState({ extraFilters: { ...extraFilters, [key]: value } })
          }
        />
      )}

      <CatalogGrid
        pages={catalogData?.pages.map((p) => p.items)}
        isLoading={isLoadingCatalog && isQueryEnabled}
        fetchNextPage={fetchNextPage}
        hasNextPage={!!hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
      />
    </div>
  );
}
