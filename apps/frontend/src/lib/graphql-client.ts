import { APP_CONFIG } from '@/config/env';
import { GraphQLClient } from 'graphql-request';

export const graphqlClient = new GraphQLClient(APP_CONFIG.NEXT_PUBLIC_API_GATEWAY_URL, {
    requestMiddleware: (request) => {
        if (typeof window !== 'undefined') {
            const token = localStorage.getItem('accessToken');

            return {
                ...request,
                headers: {
                    ...request.headers,
                    'Content-Type': 'application/json',
                    Authorization: token ? `Bearer ${token}` : '',
                },
            };
        }
        return request;
    },
});