// import { GraphQLClient } from 'graphql-request';
// import { getEnv } from '@/config/env';

// const gatewayUrl = getEnv().NEXT_PUBLIC_API_GATEWAY_URL;

// // Create a single, reusable client instance
// export const graphqlClient = new GraphQLClient(gatewayUrl);
import { GraphQLClient } from 'graphql-request';
import { getEnv } from '@/config/env';

const gatewayUrl = getEnv().NEXT_PUBLIC_API_GATEWAY_URL;

/**
 * credentials: 'include'  → send & accept cookies
 * mode:        'cors'     → allow cross‑origin requests
 * headers:     {...}      → any default headers you need
 */
export const graphqlClient = new GraphQLClient(gatewayUrl, {
    credentials: 'include',
    mode: 'cors',
    headers: {
        'Content-Type': 'application/json',
    },
});
