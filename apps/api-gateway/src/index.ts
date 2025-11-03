import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@as-integrations/express5';
import { ApolloGateway, IntrospectAndCompose, RemoteGraphQLDataSource } from '@apollo/gateway';
import express from 'express';
import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';
import cors from 'cors';
import { WebSocketServer, WebSocket } from 'ws';
import { useServer } from 'graphql-ws/use/ws';
import { createClient } from 'graphql-ws';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { Server, IncomingMessage } from 'http';
import { ExecutionArgs, getOperationAST, print } from 'graphql';
import { createProxyMiddleware } from 'http-proxy-middleware';
import type { Socket } from 'net';
import { Duplex } from 'stream';
import fetch from 'node-fetch';
import { config } from 'dotenv';

const PROJECT_ROOT = process.cwd();

// Load environment variables for development
config({ path: path.resolve(PROJECT_ROOT, '../../.env') });


// Certificate paths
const devKeyPath = path.resolve(PROJECT_ROOT, '../../local_dev_deps/certs/localhost+2-key.pem');
const devCertPath = path.resolve(PROJECT_ROOT, '../../local_dev_deps/certs/localhost+2.pem');
const prodKeyPath = path.resolve(PROJECT_ROOT, './certs/localhost+2-key.pem');
const prodCertPath = path.resolve(PROJECT_ROOT, './certs/localhost+2.pem');

// Check certificate availability
const haveDevCerts = fs.existsSync(devKeyPath) && fs.existsSync(devCertPath);
const haveProdCerts = fs.existsSync(prodKeyPath) && fs.existsSync(prodCertPath);
const env = (process.env.APP_ENV || '').toLowerCase();

// HTTPS agent for development with self-signed certs
const localDevAgent = new https.Agent({
  rejectUnauthorized: false,
});

// Custom fetcher for HTTPS services in development
const customDevFetcher = async (url: any, options: any) => {
  return fetch(url, { ...options, agent: localDevAgent });
};

// Data source that handles both HTTP and HTTPS services
class FlexibleDataSource extends RemoteGraphQLDataSource {
  constructor(config: { url: string }) {
    super(config);

    // Only use custom fetcher for HTTPS URLs in development
    if (config.url.startsWith('https:') && env === 'development') {
      this.fetcher = customDevFetcher;
    }
  }

  willSendRequest({ request, context }: any) {
    if (context.headers?.authorization) {
      request.http.headers.set('authorization', context.headers.authorization);
    }
  }
}

// Service configuration
const serviceMap = {
  accounts: {
    url: `${process.env.ACCOUNT_PROFILE_SERVICE_URL}/graphql`
  },
  addons: {
    url: `${process.env.ADDON_CONTROLLER_SERVICE_URL}/graphql`
  },
  auth: {
    url: process.env.AUTH_SERVICE_URL,
  },
  addonController: {
    url: process.env.ADDON_CONTROLLER_SERVICE_URL
  }
};

async function startGateway() {
  const app = express();
  app.use(cors<cors.CorsRequest>());

  let httpServer: Server;

  // Determine server type based on environment and certificate availability
  if (env === 'development' && haveDevCerts) {
    console.warn('Development environment - starting HTTPS server with dev certs');
    const httpsOptions = {
      key: fs.readFileSync(devKeyPath),
      cert: fs.readFileSync(devCertPath)
    };
    httpServer = https.createServer(httpsOptions, app);
  } else if ((env === 'local_production' || env === 'production') && haveProdCerts) {
    console.warn('Production environment - starting HTTPS server with production certs');
    const httpsOptions = {
      key: fs.readFileSync(prodKeyPath),
      cert: fs.readFileSync(prodCertPath)
    };
    httpServer = https.createServer(httpsOptions, app);
  } else if (haveProdCerts) {
    console.warn('Found production certs - starting HTTPS server regardless of APP_ENV');
    const httpsOptions = {
      key: fs.readFileSync(prodKeyPath),
      cert: fs.readFileSync(prodCertPath)
    };
    httpServer = https.createServer(httpsOptions, app);
  } else {
    console.warn('No certificates found - falling back to HTTP server');
    httpServer = http.createServer(app);
  }

  // Initialize Apollo Gateway
  const gateway = new ApolloGateway({
    supergraphSdl: new IntrospectAndCompose({
      subgraphs: [
        { name: 'accounts', url: serviceMap.accounts.url },
        { name: 'addons', url: serviceMap.addons.url },
      ],
      pollIntervalInMs: 5000,
    }),
    buildService(service) {
      return new FlexibleDataSource({ url: service.url ?? "" });
    },
  });

  // WebSocket setup for GraphQL subscriptions
  const wsLifecyclePlugin = {
    async serverWillStart() {
      const gqlWsServer = new WebSocketServer({ noServer: true });

      const serverCleanup = useServer({
        schema: gateway.schema,
        context: (ctx) => {
          const { connectionParams = {}, extra } = ctx;
          const { request } = extra as { request: IncomingMessage };
          const authorization = (connectionParams.Authorization as string) ||
            (connectionParams.authorization as string) ||
            request.headers['authorization'];
          return { headers: { authorization }, gateway };
        },
        execute: (args: ExecutionArgs) => (args.contextValue as any).gateway.execute(args),
        subscribe: async (args: ExecutionArgs) => {
          const { gateway, ...context } = args.contextValue as any;
          const operationAst = getOperationAST(args.document, args.operationName!);

          if (operationAst?.operation === 'subscription') {
            const addonsUrl = serviceMap.addons.url;
            const isHttps = addonsUrl.startsWith('https:');

            const forwardClient = createClient({
              url: addonsUrl,
              webSocketImpl: isHttps ? class extends WebSocket {
                constructor(url: string | URL, protocols?: string | string[]) {
                  super(url, protocols, { agent: localDevAgent });
                }
              } : WebSocket,
              connectionParams: { Authorization: context.headers?.authorization },
            });

            return forwardClient.iterate({
              query: print(args.document),
              variables: args.variableValues,
              operationName: args.operationName,
            });
          }
          return gateway.execute(args);
        }
      }, gqlWsServer);

      // Handle WebSocket upgrades
      httpServer.on('upgrade', (req: IncomingMessage, socket: Duplex, head: Buffer) => {
        const { pathname } = new URL(req.url!, `http://${req.headers.host}`);
        if (pathname === '/graphql') {
          gqlWsServer.handleUpgrade(req, socket as Socket, head, (ws) => {
            gqlWsServer.emit('connection', ws, req);
          });
        } else {
          socket.destroy();
        }
      });

      return {
        async drainServer() {
          await serverCleanup.dispose();
        }
      };
    },
  };

  // Create Apollo Server
  const server = new ApolloServer({
    gateway,
    introspection: true,
    plugins: [
      wsLifecyclePlugin,
      ApolloServerPluginDrainHttpServer({ httpServer }),
    ],
  });

  await server.start();

  // API proxies
  const authProxy = createProxyMiddleware({
    target: serviceMap.auth.url,
    secure: false,
    changeOrigin: true,
    pathRewrite: { '^/api/v1/auth': '' }
  });
  app.use('/api/v1/auth', authProxy);

  const addonControllerProxy = createProxyMiddleware({
    target: serviceMap.addonController.url,
    secure: false,
    changeOrigin: true,
    pathRewrite: { '^/api/v1/addon-controller': '' }
  });
  app.use('/api/v1/addon-controller', addonControllerProxy);

  // GraphQL endpoint
  app.use('/graphql',
    express.json({ limit: '10mb' }),
    expressMiddleware(server, {
      context: async ({ req }) => ({ headers: req.headers }),
    })
  );

  // Start server
  const PORT = 4000;
  httpServer.listen({ port: PORT }, () => {
    const protocol = httpServer instanceof https.Server ? 'https' : 'http';
    console.log(`🚀 API Gateway ready at ${protocol}://localhost:${PORT}`);
    console.log(`📊 GraphQL endpoint: ${protocol}://localhost:${PORT}/graphql`);
    console.log(`🔐 Auth proxy: ${protocol}://localhost:${PORT}/api/v1/auth`);
    console.log(`⚡ Addon controller proxy: ${protocol}://localhost:${PORT}/api/v1/addon-controller`);
  });
}

startGateway().catch(console.error);