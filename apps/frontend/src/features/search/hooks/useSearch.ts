"use client";

import { useState, useEffect } from 'react';
import { createClient } from 'graphql-ws';
import { print } from 'graphql';
import { APP_CONFIG } from '@/config/env';
import { SearchDocument } from '@/orchestrators/graphql-query-orchestrator/queries';

const wsUrl = APP_CONFIG.NEXT_PUBLIC_API_GATEWAY_URL.replace('https', 'wss');

export interface SearchResultItem {
    id: string;
    name: string;
    type: string;
    poster?: string | null;
}

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
            // --- THIS IS THE DEFINITIVE FIX ---
            // The original gateway's `onSubscribe` hook expects a `request` object inside `ctx.extra`.
            // By structuring our connection parameters this way, we are making our client
            // perfectly compatible with the server's expectation.
            connectionParams: () => {
                const token = localStorage.getItem('accessToken');
                return {
                    request: {
                        headers: {
                            authorization: token ? `Bearer ${token}` : '',
                        },
                    },
                };
            },
        });

        const unsubscribe = client.subscribe(
            {
                query: print(SearchDocument),
                variables: { profileId, query },
            },
            {
                next: ({ data }) => {
                    setIsLoading(false);
                    const searchResult = data?.search;
                    if (searchResult) {
                        setResults(prev => {
                            const newResults = new Map(prev);
                            const addonName = searchResult.addonName;

                            let addonEntry = newResults.get(addonName);
                            if (!addonEntry) {
                                addonEntry = { addonName, resultsByType: new Map(), error: searchResult.error };
                            }

                            if (searchResult.resultsByType) {
                                for (const [type, items] of Object.entries(searchResult.resultsByType)) {
                                    addonEntry.resultsByType.set(type, items as SearchResultItem[]);
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