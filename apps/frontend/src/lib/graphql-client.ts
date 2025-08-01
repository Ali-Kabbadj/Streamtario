import { APP_CONFIG } from '@/config/env';
import { GraphQLClient } from 'graphql-request';
import { refreshSession } from '@/features/auth/services/auth.service';
import { print } from 'graphql';
import type { TypedDocumentNode } from '@graphql-typed-document-node/core';

const API_URL = APP_CONFIG.NEXT_PUBLIC_API_GATEWAY_URL;

type GraphQLResponseError = {
    response: {
        errors?: Array<{
            message: string;
            extensions?: {
                code?: string;
            };
        }>;
    };
};

const isAuthError = (error: unknown): error is GraphQLResponseError => {
    return (
        typeof error === 'object' &&
        error !== null &&
        'response' in error &&
        typeof (error as { response: unknown }).response === 'object' &&
        Array.isArray((error as { response: { errors?: [] } }).response.errors) &&
        (error as GraphQLResponseError).response.errors?.[0]?.extensions?.code === 'AUTHENTICATION_REQUIRED'
    );
};

const baseClient = new GraphQLClient(API_URL);

const customRequest = async <T, V extends object>(
    document: TypedDocumentNode<T, V> | string,
    variables?: V,
): Promise<T> => {
    const query = typeof document === 'string' ? document : print(document);

    try {
        const token = localStorage.getItem('accessToken');
        const headers = {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
        };
        return await baseClient
            .rawRequest<T, V>(query, variables, headers)
            .then(res => res.data);
    } catch (error) {
        if (isAuthError(error)) {
            console.log('Authentication error detected, attempting token refresh...');

            // --- START OF THE FIX ---
            // CRITICAL: Before attempting to refresh, we MUST check if a refresh token exists.
            // If it doesn't, it means the user is logged out, and we should NOT try to refresh.
            const refreshToken = localStorage.getItem('refreshToken');
            if (!refreshToken) {
                console.log('No refresh token found. Aborting refresh attempt.');
                // Re-throw the original error. This will be caught by React Query and
                // handled by the AuthProvider, preventing an infinite loop.
                throw error;
            }
            // --- END OF THE FIX ---

            try {
                await refreshSession();

                const newToken = localStorage.getItem('accessToken');
                const newHeaders = {
                    'Content-Type': 'application/json',
                    ...(newToken && { Authorization: `Bearer ${newToken}` }),
                };

                console.log('Token refreshed successfully. Retrying original request...');
                return await baseClient
                    .rawRequest<T, V>(query, variables, newHeaders)
                    .then(res => res.data);
            } catch (refreshError) {
                console.error('Failed to refresh token after auth error:', refreshError);
                throw error;
            }
        }
        throw error;
    }
};

export const graphqlClient = {
    request: customRequest,
};