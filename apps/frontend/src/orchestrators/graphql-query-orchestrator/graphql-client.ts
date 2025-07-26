import { GraphQLClient } from 'graphql-request';
import { getEnv } from '@/config/env';

const gatewayUrl = getEnv().NEXT_PUBLIC_API_GATEWAY_URL;

// Create a single, reusable client instance
export const graphqlClient = new GraphQLClient(gatewayUrl);