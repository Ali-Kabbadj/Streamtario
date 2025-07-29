"use client";

import { useQuery } from '@tanstack/react-query';

// Define the URLs for the addon catalogs
const ADDON_CATALOG_URLS = {
    official: 'https://v3-cinemeta.strem.io/addon_catalog/all/official.json',
    community: 'https://v3-cinemeta.strem.io/addon_catalog/all/community.json',
};

// Define TypeScript types to match the structure of the JSON response
export interface AddonCatalogItem {
    manifest: {
        id: string;
        version: string;
        name: string;
        description: string;
        logo?: string;
        types: string[];
    };
    transportUrl: string; // This is the manifest URL we need for installation
}

interface AddonCatalogResponse {
    addons: AddonCatalogItem[];
}

/**
 * Fetches a catalog of addons (e.g., official, community) from an external URL.
 */
export const useAddonCatalogs = (type: 'official' | 'community') => {
    return useQuery<AddonCatalogItem[], Error>({
        queryKey: ['addonCatalog', type],
        queryFn: async () => {
            const response = await fetch(ADDON_CATALOG_URLS[type]);
            if (!response.ok) {
                throw new Error(`Failed to fetch ${type} addon catalog`);
            }
            const data: AddonCatalogResponse = await response.json() as AddonCatalogResponse;
            return data.addons ?? [];
        },
    });
};