"use client";

import { useQueries } from "@tanstack/react-query";
import { graphqlClient } from "@/lib/graphql-client";
import { ManifestByUrlDocument } from "@/orchestrators/graphql-query-orchestrator/queries";
import type { AddonCatalogItem } from "./useAddonCatalogs";

export const useManifestsByUrls = (urls: string[]) => {
    const results = useQueries({
        queries: urls.map((url) => ({
            queryKey: ["manifest", url],
            queryFn: async (): Promise<AddonCatalogItem | null> => {
                const data = await graphqlClient.request(ManifestByUrlDocument, {
                    url,
                });
                if (!data.manifestByUrl) {
                    return null;
                }
                return {
                    transportUrl: url,
                    manifest: {
                        id: data.manifestByUrl.id,
                        version: data.manifestByUrl.version,
                        name: data.manifestByUrl.name,
                        description: data.manifestByUrl.description,
                        logo: data.manifestByUrl.logo ?? "",
                        types: data.manifestByUrl.types,
                    },
                };
            },
            enabled: !!url,
        })),
    });

    const manifests = results
        .map((result) => result.data)
        .filter((data): data is AddonCatalogItem => !!data);

    const isLoading = results.some((result) => result.isLoading);

    return { manifests, isLoading };
};