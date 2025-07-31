import { APP_CONFIG } from '@/config/env';
import { GraphQLClient, ClientError } from 'graphql-request';
import { refreshSession } from '@/features/auth/services/auth.service';

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

// Create a base client instance without any special request logic
const baseClient = new GraphQLClient(API_URL);

// Create a custom request function that wraps the base client
const customRequest = async <T, V>(document: string, variables?: V): Promise<T> => {
    try {
        const token = localStorage.getItem('accessToken');
        const headers = {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
        };
        return await baseClient.rawRequest<T>({
            query: document,
            variables,
            requestHeaders: headers,
        }).then(res => res.data);
    } catch (error) {
        if (isAuthError(error)) {
            console.log('Authentication error detected, attempting token refresh...');
            try {
                await refreshSession();

                const newToken = localStorage.getItem('accessToken');
                const newHeaders = {
                    'Content-Type': 'application/json',
                    ...(newToken && { Authorization: `Bearer ${newToken}` }),
                };

                console.log('Token refreshed successfully. Retrying original request...');
                return await baseClient.rawRequest<T>({
                    query: document,
                    variables,
                    requestHeaders: newHeaders,
                }).then(res => res.data);

            } catch (refreshError) {
                console.error('Failed to refresh token after auth error:', refreshError);
                // If refresh fails, re-throw the original error to be caught by React Query
                throw error;
            }
        }
        // If it's not an auth error, just re-throw it
        throw error;
    }
};

// We export an object that looks like the original client but uses our custom request function
export const graphqlClient = {
    request: customRequest,
};