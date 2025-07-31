import { GraphQLClient } from 'graphql-request';
import { getEnv } from '@/config/env';

const gatewayUrl = getEnv().NEXT_PUBLIC_API_GATEWAY_URL;


export const graphqlClient = new GraphQLClient(gatewayUrl, {
    credentials: 'include',
    mode: 'cors',
    headers: {
        'Content-Type': 'application/json',
    },
});
