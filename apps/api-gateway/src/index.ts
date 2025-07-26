import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@as-integrations/express5';
import { ApolloGateway, IntrospectAndCompose } from '@apollo/gateway';
import express from 'express';
import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import { WebSocketServer, WebSocket } from 'ws';
import { useServer } from 'graphql-ws/use/ws';
import { createClient } from 'graphql-ws';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { Server } from 'http';
import { createHash } from 'crypto';
import { ExecutionArgs, getOperationAST, print, introspectionFromSchema } from 'graphql';

interface AddonServiceError {
  message: string;
  code?: string;
  details?: string;
}

interface AddonSearchResult {
  addonName: string;
  resultsByType: Record<string, any[]>; // Adjust 'any[]' with a more specific type if known
  error?: AddonServiceError;
}

interface AddonSearchSubscriptionResult {
  data?: {
    search?: AddonSearchResult;
  };
  errors?: any[]; // GraphQL errors
}

const localhostHttpsAgent = new https.Agent({
  rejectUnauthorized: false,
  checkServerIdentity: () => undefined,
});

const originalHttpsRequest = https.request;
const originalHttpsGet = https.get;

https.request = function (options, callback) {
  if (typeof options === 'string') {
    options = new URL(options);
  }

  const isLocalhost = options.hostname === 'localhost' ||
    options.host === 'localhost' ||
    (typeof options === 'object' && options.hostname?.includes('localhost'));

  if (isLocalhost) {
    options.agent = localhostHttpsAgent;
    options.rejectUnauthorized = false;
  }

  return originalHttpsRequest(options, callback);
};

https.get = function (options, callback) {
  if (typeof options === 'string') {
    options = new URL(options);
  }

  const isLocalhost = options.hostname === 'localhost' ||
    options.host === 'localhost' ||
    (typeof options === 'object' && options.hostname?.includes('localhost'));

  if (isLocalhost) {
    options.agent = localhostHttpsAgent;
    options.rejectUnauthorized = false;
  }



  return originalHttpsGet(options, callback);
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


async function startGateway() {
  const subgraphMap = {
    accounts: { url: 'https://localhost:8002/graphql' },
    addons: { url: 'https://localhost:8001/graphql' },
  };

  // A custom WebSocket class to pass agent options for self-signed certs
  class CustomWebSocket extends WebSocket {
    constructor(url: string | URL, protocols: string | string[] | undefined) {
      super(url, protocols, {
        agent: localhostHttpsAgent,
        rejectUnauthorized: false,
      });
    }
  }

  const getSubscriptionEndpoint = (args: ExecutionArgs): string => {
    const { document, operationName } = args;
    const operationAST = getOperationAST(document, operationName);

    if (!operationAST) {
      throw new Error('Could not determine operation AST');
    }

    // This is a simple routing logic based on the root field name.
    // A more complex app might inspect the federated schema.
    const rootField = operationAST.selectionSet.selections[0];
    if (rootField.kind === 'Field') {
      const fieldName = rootField.name.value;
      if (fieldName === 'search') {
        // search subscription is in the 'addons' service
        return subgraphMap.addons.url.replace('https', 'wss');
      }
    }
    throw new Error(`Subscription for operation "${operationName}" not supported by gateway.`);
  };

  const forwardSubscription = (args: ExecutionArgs) => {
    const endpointUrl = getSubscriptionEndpoint(args);
    const client = createClient({
      url: endpointUrl,
      webSocketImpl: CustomWebSocket,
      connectionParams: {
        // Here you could forward headers from the initial request if needed
        // e.g., Authorization: args.contextValue.req.headers.authorization
      },
    });

    return (async function* () {
      try {
        const query = print(args.document);
        const variables = args.variableValues;
        const operationName = args.operationName;

        const subscription = client.iterate({ query, variables, operationName });

        for await (const result of subscription) {
          const typedResult = result as AddonSearchSubscriptionResult;
          // Check if the result contains an error from the Python service
          if (typedResult.data && typedResult.data.search && typedResult.data.search.error) {
            yield {
              errors: [
                {
                  message: `Addon Error: ${typedResult.data.search.error.message}`,
                  extensions: {
                    code: typedResult.data.search.error.code || 'ADDON_SERVICE_ERROR',
                    details: typedResult.data.search.error.details,
                    addonName: typedResult.data.search.addonName,
                  },
                },
              ],
            };
          } else {
            yield typedResult;
          }
        }
      } catch (err) {
        console.error('Error during subscription forwarding:', err);
        // If it's a generic error not from the addon, yield a generic message
        yield { errors: [{ message: 'Subscription forwarding failed' }] };
      }
    })();
  };
  const app = express();
  let httpServer: Server;

  try {
    const keyPath = path.resolve(__dirname, '../../../local_dev_deps/certs/localhost+2-key.pem');
    const certPath = path.resolve(__dirname, '../../../local_dev_deps/certs/localhost+2.pem');

    const httpsOptions = {
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath),
    };
    httpServer = https.createServer(httpsOptions, app);
  } catch (error) {
    console.error('Could not start HTTPS server, falling back to HTTP. Is `local_dev_deps/certs` set up?');
    httpServer = http.createServer(app);
  }

  interface WsServerCleanup {
    dispose: () => Promise<void> | void;
  }
  let serverCleanup: WsServerCleanup | null = null;

  const gateway = new ApolloGateway({
    supergraphSdl: new IntrospectAndCompose({
      subgraphs: [
        { name: 'accounts', url: subgraphMap.accounts.url },
        { name: 'addons', url: subgraphMap.addons.url },
      ],
      pollIntervalInMs: 5000,
    }),
  });

  const server = new ApolloServer({
    gateway,
    introspection: true,
    plugins: [
      ApolloServerPluginDrainHttpServer({ httpServer }),
      {
        async serverWillStart() {
          return {
            async drainServer() {
              if (serverCleanup) {
                await serverCleanup.dispose();
              }
            },
          };
        },
      },
    ],
  });

  await server.start();
  console.log('Apollo Server started, gateway is loaded.');

  const wsServer = new WebSocketServer({
    server: httpServer,
    path: '/graphql',
  });

  const buildGatewayRequestContext = (args: ExecutionArgs) => {
    const query = print(args.document);
    const requestContext = {
      ...args,
      context: args.contextValue,
      cache: server.cache,
      logger: server.logger,
      metrics: {},
      overallCachePolicy: { policy: 'private' as const },
      request: {
        query,
        operationName: args.operationName,
        variables: args.variableValues,
      },
      schema: gateway.schema!,
      schemaHash: (gateway as any).schemaHash,
      source: query,
      queryHash: createHash('sha256').update(query).digest('hex'),
    };
    return requestContext;
  };

  serverCleanup = useServer(
    {
      schema: gateway.schema,
      context: (ctx) => {
        return {
          ...ctx,
        };
      },
      execute: (args: ExecutionArgs) => {
        return gateway.executor(buildGatewayRequestContext(args) as any);
      },
      subscribe: (args: ExecutionArgs) => {
        return forwardSubscription(args) as any;
      },
    },
    wsServer,
  );

  app.get('/', (req, res) => {
    res.send(`
      <html>
        <body style="font-family: sans-serif; text-align: center; padding-top: 50px;">
          <h1>API Gateway</h1>
          <p>The GraphQL endpoint is available.</p>
          <p>
            <a href="/graphql">Click here to open Apollo Sandbox</a>
          </p>
        </body>
      </html>
    `);
  });

  app.get('/graphql/schema.json', (req, res) => {
    if (gateway.schema) {
      const schemaJson = introspectionFromSchema(gateway.schema);
      res.json(schemaJson);
    } else {
      res.status(503).send('Gateway schema is not available yet.');
    }
  });

  app.use('/graphql', cors(), express.json(), expressMiddleware(server));

  const PORT = 4000;
  httpServer.listen({ port: PORT }, () => {
    const protocol = httpServer instanceof https.Server ? 'https' : 'http';
    const wsProtocol = httpServer instanceof https.Server ? 'wss' : 'ws';
    console.log(`🚀 API Gateway is ready at ${protocol}://localhost:${PORT}`);
    console.log(`🚀 GraphQL endpoint is available at ${protocol}://localhost:${PORT}/graphql`);
    console.log(`🚀 Subscriptions are available at ${wsProtocol}://localhost:${PORT}/graphql`);
  });
}

startGateway().catch(console.error);