import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@as-integrations/express5';
import { ApolloGateway, IntrospectAndCompose, RemoteGraphQLDataSource } from '@apollo/gateway';
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
import { Server, IncomingMessage } from 'http';
import { ExecutionArgs, getOperationAST, print } from 'graphql';
import { createProxyMiddleware } from 'http-proxy-middleware';

class AuthenticatedDataSource extends RemoteGraphQLDataSource {
  willSendRequest({ request, context }: any) {
    if (context.headers?.authorization) {
      request.http.headers.set('authorization', context.headers.authorization);
    }
  }
}

const localhostHttpsAgent = new https.Agent({
  rejectUnauthorized: false,
  checkServerIdentity: () => undefined,
});

const originalHttpsRequest = https.request;
https.request = function (options: any, callback?: any) {
  if (typeof options === 'string') { options = new URL(options); }
  const isLocalhost = options.hostname === 'localhost' || options.hostname?.includes('localhost');
  if (isLocalhost) {
    options.agent = localhostHttpsAgent;
    options.rejectUnauthorized = false;
  }
  return originalHttpsRequest(options, callback);
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startGateway() {
  const serviceMap = {
    accounts: { url: 'https://localhost:8002/graphql' },
    addons: { url: 'https://localhost:8001/graphql' },
    auth: { url: 'https://localhost:8003' },
    stream: { url: 'https://localhost:8004' },
  };

  const app = express();

  // =================================================================
  // THE CRITICAL FIX: APPLY GLOBAL CORS MIDDLEWARE
  // This MUST come before any routes or proxies are defined.
  app.use(cors<cors.CorsRequest>());
  // =================================================================

  let httpServer: Server;
  try {
    const keyPath = path.resolve(__dirname, '../../../local_dev_deps/certs/localhost+2-key.pem');
    const certPath = path.resolve(__dirname, '../../../local_dev_deps/certs/localhost+2.pem');
    const httpsOptions = { key: fs.readFileSync(keyPath), cert: fs.readFileSync(certPath) };
    httpServer = https.createServer(httpsOptions, app);
  } catch (error) {
    console.error('Could not start HTTPS server, falling back to HTTP. Is `local_dev_deps/certs` set up?');
    httpServer = http.createServer(app);
  }

  const wsServer = new WebSocketServer({
    server: httpServer,
    path: '/graphql',
  });

  const gateway = new ApolloGateway({
    supergraphSdl: new IntrospectAndCompose({
      subgraphs: [
        { name: 'accounts', url: serviceMap.accounts.url },
        { name: 'addons', url: serviceMap.addons.url },
      ],
      pollIntervalInMs: 5000,
    }),
    buildService({ url }) {
      return new AuthenticatedDataSource({ url });
    },
  });

  let serverCleanup: { dispose: () => void | Promise<void> } | null = null;

  const server = new ApolloServer({
    gateway,
    introspection: true,
    plugins: [
      ApolloServerPluginDrainHttpServer({ httpServer }),
      {
        async serverWillStart() {
          serverCleanup = useServer(
            {
              schema: gateway.schema,
              context: (ctx) => {
                const { connectionParams, extra } = ctx;
                const { request } = extra as { request: IncomingMessage };
                return {
                  headers: {
                    authorization: connectionParams?.Authorization || request.headers['authorization'],
                  },
                  gateway
                };
              },
              execute: (args: ExecutionArgs) => (args.contextValue as any).gateway.execute(args),
              subscribe: async (args: ExecutionArgs) => {
                const { gateway, ...context } = args.contextValue as any;
                const document = args.document;
                const operationName = args.operationName!;
                const operationAst = getOperationAST(document, operationName);
                if (operationAst?.operation === 'subscription') {
                  const forwardClient = createClient({
                    url: serviceMap.addons.url,
                    webSocketImpl: class extends WebSocket {
                      constructor(url: string | URL, protocols: string | string[] | undefined) {
                        super(url, protocols, { agent: localhostHttpsAgent, rejectUnauthorized: false });
                      }
                    },
                    connectionParams: {
                      Authorization: context.headers?.authorization,
                    },
                  });
                  return forwardClient.iterate({
                    query: print(document),
                    variables: args.variableValues,
                    operationName: operationName,
                  });
                }
                return gateway.execute(args);
              }
            },
            wsServer,
          );
          return {
            async drainServer() {
              await serverCleanup?.dispose();
            },
          };
        },
      },
    ],
  });

  await server.start();

  const authProxy = createProxyMiddleware({
    target: serviceMap.auth.url,
    changeOrigin: true,
    secure: false,
  });
  app.use('/api/v1/auth', authProxy);

  const streamProxy = createProxyMiddleware({
    target: serviceMap.stream.url,
    changeOrigin: true,
    secure: false,
    ws: true,
    pathRewrite: {
      '^/api/v1/stream': '',
    },
  });
  app.use('/api/v1/stream', streamProxy);

  app.use(
    '/graphql',
    express.json({ limit: '10mb' }),
    expressMiddleware(server, {
      context: async ({ req }) => ({ headers: req.headers }),
    })
  );

  const PORT = 4000;
  httpServer.listen({ port: PORT }, () => {
    const protocol = httpServer instanceof https.Server ? 'https' : 'http';
    const wsProtocol = httpServer instanceof https.Server ? 'wss' : 'ws';
    console.log(`🚀 API Gateway is ready at ${protocol}://localhost:${PORT}`);
    console.log(`🚀 GraphQL endpoint is available at ${protocol}://localhost:${PORT}/graphql`);
    console.log(`🚀 Subscriptions are available at ${wsProtocol}://localhost:${PORT}/graphql`);
    console.log(`🚀 Auth endpoints are proxied at ${protocol}://localhost:${PORT}/api/v1/auth`);
    console.log(`🚀 Stream endpoints are proxied at ${protocol}://localhost:${PORT}/api/v1/stream`);
  });
}

startGateway().catch(console.error);