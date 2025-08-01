"use client";

import { useState, useEffect } from 'react';
import { createClient } from 'graphql-ws';
import { print } from 'graphql';
import { APP_CONFIG } from '@/config/env';
import { SearchDocument } from '@/orchestrators/graphql-query-orchestrator/queries';
import type { CatalogItemType, SearchSubscription } from '@/orchestrators/graphql-query-orchestrator/gen/graphql';

const wsUrl = APP_CONFIG.NEXT_PUBLIC_API_GATEWAY_URL.replace('https', 'wss');

export type SearchResultItem = CatalogItemType;

export interface AddonResults {
    addonName: string;
    resultsByType: Map<string, SearchResultItem[]>;
    error?: string | null;
}

export const useSearch = (profileId: string, query: string) => {
    const [results, setResults] = useState<Map<string, AddonResults>>(new Map());
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (query.length < 3 || !profileId) {
            setIsLoading(false);
            setResults(new Map());
            return;
        }

        setIsLoading(true);
        setResults(new Map());
        setError(null);

        const client = createClient({
            url: wsUrl,
            connectionParams: () => {
                const token = localStorage.getItem('accessToken');
                return {
                    authorization: token ? `Bearer ${token}` : '',
                };
            },
        });

        const unsubscribe = client.subscribe(
            {
                query: print(SearchDocument),
                variables: { profileId, query },
            },
            {
                next: (data) => {
                    setIsLoading(false);
                    const searchResult = data.data?.search as SearchSubscription['search'];
                    if (searchResult) {
                        setResults(prev => {
                            const newResults = new Map(prev);
                            const addonName = searchResult.addonName;

                            const addonEntry = newResults.get(addonName) ?? { addonName, resultsByType: new Map(), error: searchResult.error };

                            if (searchResult.resultsByType) {
                                for (const [type, items] of Object.entries(searchResult.resultsByType as Record<string, CatalogItemType[]>)) {
                                    addonEntry.resultsByType.set(type, items);
                                }
                            }

                            newResults.set(addonName, addonEntry);
                            return newResults;
                        });
                    }
                },
                error: (err) => {
                    console.error('Search subscription error:', err);
                    setError('An error occurred during the search.');
                    setIsLoading(false);
                },
                complete: () => setIsLoading(false),
            }
        );

        return () => unsubscribe();
    }, [query, profileId]);

    const resultsArray = Array.from(results.values());

    return { results: resultsArray, isLoading, error };
};