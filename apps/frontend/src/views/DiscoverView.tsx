"use client";

import { useEffect, useMemo, useReducer } from "react";
import { useProfileContext } from "@/providers/profile-provider";
import { useDiscover } from "@/features/discover/hooks/useDiscover";
import { useCatalog } from "@/features/discover/hooks/useCatalog";
import { DiscoverFilters } from "@/features/discover/components/DiscoverFilters";
import { CatalogGrid } from "@/features/discover/components/CatalogGrid";
import { Skeleton } from "@/components/ui/skeleton";
import type { DiscoverableCatalogsQuery } from "@/orchestrators/graphql-query-orchestrator/gen/graphql";

type Catalog = NonNullable<
  DiscoverableCatalogsQuery["profile"]
>["discoverableCatalogs"][number];

type State = {
  type: string;
  provider: string;
  catalogId: string;
  filters: Record<string, string>;
};

type Action =
  | { type: "SET_TYPE"; payload: string; catalogs: Catalog[] }
  | { type: "SET_PROVIDER"; payload: string; catalogs: Catalog[] }
  | { type: "SET_CATALOG"; payload: string }
  | { type: "SET_FILTER"; key: string; value: string }
  | { type: "INITIALIZE"; catalogs: Catalog[] };

function discoverReducer(state: State, action: Action): State {
  switch (action.type) {
    case "INITIALIZE": {
      const initialType = action.catalogs[0]?.catalogType ?? "";
      const firstProvider = action.catalogs.find(
        (c) => c.catalogType === initialType,
      );
      return {
        type: initialType,
        provider: firstProvider?.manifestId ?? "",
        catalogId: firstProvider?.catalogId ?? "",
        filters: {},
      };
    }
    case "SET_TYPE": {
      const newType = action.payload;
      const firstProviderForType = action.catalogs.find(
        (c) => c.catalogType === newType,
      );
      return {
        type: newType,
        provider: firstProviderForType?.manifestId ?? "",
        catalogId: firstProviderForType?.catalogId ?? "",
        filters: {},
      };
    }
    case "SET_PROVIDER": {
      const newProvider = action.payload;
      const firstCatalogForProvider = action.catalogs.find(
        (c) => c.catalogType === state.type && c.manifestId === newProvider,
      );
      return {
        ...state,
        provider: newProvider,
        catalogId: firstCatalogForProvider?.catalogId ?? "",
        filters: {},
      };
    }
    case "SET_CATALOG":
      return { ...state, catalogId: action.payload, filters: {} };
    case "SET_FILTER":
      return {
        ...state,
        filters: { ...state.filters, [action.key]: action.value },
      };
    default:
      return state;
  }
}

export function DiscoverView() {
  const { selectedProfile } = useProfileContext();
  const { data: discoverData, isLoading: isLoadingDiscover } = useDiscover(
    selectedProfile?.id ?? "",
  );

  const [state, dispatch] = useReducer(discoverReducer, {
    type: "",
    provider: "",
    catalogId: "",
    filters: {},
  });

  useEffect(() => {
    if (discoverData && discoverData.length > 0 && !state.type) {
      dispatch({ type: "INITIALIZE", catalogs: discoverData });
    }
  }, [discoverData, state.type]);

  const queryExtraProps = useMemo(() => {
    const props: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(state.filters)) {
      if (value && value !== "all") {
        props[key] = value;
      }
    }
    return props;
  }, [state.filters]);

  const selectedCatalogData = useMemo(() => {
    if (!discoverData) return undefined;
    return discoverData.find(
      (c) =>
        c.catalogType === state.type &&
        c.manifestId === state.provider &&
        c.catalogId === state.catalogId,
    );
  }, [discoverData, state.type, state.provider, state.catalogId]);

  const isQueryEnabled = useMemo(() => {
    if (!selectedCatalogData) return false;
    const requiredFilters =
      selectedCatalogData.extraProps.filter((p) => p.isRequired) ?? [];
    if (requiredFilters.length === 0) return true;
    return requiredFilters.every(
      (rf) => !!state.filters[rf.name] && state.filters[rf.name] !== "all",
    );
  }, [selectedCatalogData, state.filters]);

  const {
    data: catalogData,
    isLoading: isLoadingCatalog,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useCatalog({
    profileId: selectedProfile?.id ?? "",
    itemType: state.type,
    catalogId: state.catalogId,
    providerId: state.provider,
    extraProps: queryExtraProps,
    isEnabled: isQueryEnabled && !!state.provider && !!state.catalogId,
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
          selectedType={state.type}
          onTypeChange={(value) =>
            dispatch({
              type: "SET_TYPE",
              payload: value,
              catalogs: discoverData ?? [],
            })
          }
          selectedProvider={state.provider}
          onProviderChange={(value) =>
            dispatch({
              type: "SET_PROVIDER",
              payload: value,
              catalogs: discoverData ?? [],
            })
          }
          selectedCatalogId={state.catalogId}
          onCatalogChange={(value) =>
            dispatch({ type: "SET_CATALOG", payload: value })
          }
          extraFilters={state.filters}
          onExtraFilterChange={(key, value) =>
            dispatch({ type: "SET_FILTER", key, value })
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
