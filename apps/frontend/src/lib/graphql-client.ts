import { APP_CONFIG } from '@/config/env';
import { GraphQLClient } from 'graphql-request';


// Create a single, reusable client instance
export const graphqlClient = new GraphQLClient(APP_CONFIG.NEXT_PUBLIC_API_GATEWAY_URL);