"use client";

import { useQuery } from '@tanstack/react-query';

const ADDON_CATALOG_URLS = {
    official: 'https://v3-cinemeta.strem.io/addon_catalog/all/official.json',
    community: 'https://v3-cinemeta.strem.io/addon_catalog/all/community.json',
};


export interface AddonCatalogItem {
    manifest: {
        id: string;
        version: string;
        name: string;
        description: string;
        logo: string;
        types: string[];
    };
    transportUrl: string;
}

interface AddonCatalogResponse {
    addons: AddonCatalogItem[];
}

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