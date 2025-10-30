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
import type { Socket } from 'net';
import { Duplex } from 'stream';
import fetch from 'node-fetch';

const localDevAgent = new https.Agent({
  rejectUnauthorized: false,
});

const customDevFetcher = async (url: any, options: any) => {
  return fetch(url, { ...options, agent: localDevAgent });
};

class UnsafeHttpsDataSource extends RemoteGraphQLDataSource {
  constructor(config: { url: string }) {
    super(config);
    this.fetcher = customDevFetcher;
  }
  willSendRequest({ request, context }: any) {
    if (context.headers?.authorization) {
      request.http.headers.set('authorization', context.headers.authorization);
    }
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startGateway() {
  const serviceMap = {
    accounts: {
      url: `${process.env.ACCOUNT_PROFILE_SERVICE_URL}/graphql`
    },
    addons: { url: `${process.env.ADDON_CONTROLLER_URL}/graphql` },
    auth: { url: process.env.AUTH_SERVICE_URL },
    stream: { url: 'https://localhost:8004' },
    addonController: { url: process.env.ADDON_CONTROLLER_URL }
  };

  const app = express();
  app.use(cors<cors.CorsRequest>());

  let httpServer: Server;
  try {
    const keyPath = path.resolve(__dirname, '../../../local_dev_deps/certs/localhost+2-key.pem');
    const certPath = path.resolve(__dirname, '../../../local_dev_deps/certs/localhost+2.pem');
    const httpsOptions = { key: fs.readFileSync(keyPath), cert: fs.readFileSync(certPath) };
    httpServer = https.createServer(httpsOptions, app);
  } catch (error) {
    console.warn('Could not start HTTPS server, falling back to HTTP.');

    httpServer = http.createServer(app);
  }

  const gateway = new ApolloGateway({
    supergraphSdl: new IntrospectAndCompose({
      subgraphs: [
        { name: 'accounts', url: serviceMap.accounts.url },
        { name: 'addons', url: serviceMap.addons.url },
      ],
      pollIntervalInMs: 5000,
    }),
    buildService(service) {
      return new UnsafeHttpsDataSource({ url: service.url ?? "" });
    },
  });

  const wsLifecyclePlugin = {
    async serverWillStart() {
      const gqlWsServer = new WebSocketServer({ noServer: true });
      const serverCleanup = useServer({
        schema: gateway.schema,
        context: (ctx) => {
          const { connectionParams = {}, extra } = ctx;
          const { request } = extra as { request: IncomingMessage };
          const authorization = (connectionParams.Authorization as string) || (connectionParams.authorization as string) || request.headers['authorization'];
          return { headers: { authorization }, gateway };
        },
        execute: (args: ExecutionArgs) => (args.contextValue as any).gateway.execute(args),
        subscribe: async (args: ExecutionArgs) => {
          const { gateway, ...context } = args.contextValue as any;
          const operationAst = getOperationAST(args.document, args.operationName!);
          if (operationAst?.operation === 'subscription') {
            const forwardClient = createClient({
              url: serviceMap.addons.url,
              webSocketImpl: class extends WebSocket {
                constructor(url: string | URL, protocols?: string | string[]) {
                  super(url, protocols, { agent: localDevAgent });
                }
              },
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

      const streamWsProxy = createProxyMiddleware({
        target: serviceMap.stream.url,
        ws: true,
        secure: false,
        changeOrigin: true,
      });

      httpServer.on('upgrade', (req: IncomingMessage, socket: Duplex, head: Buffer) => {
        const { pathname } = new URL(req.url!, `http://${req.headers.host}`);
        if (pathname === '/graphql') {
          gqlWsServer.handleUpgrade(req, socket as Socket, head, (ws) => {
            gqlWsServer.emit('connection', ws, req);
          });
        } else if (pathname === '/api/v1/stream') {
          streamWsProxy.upgrade(req, socket as Socket, head);
        } else {
          socket.destroy();
        }
      });

      return { async drainServer() { await serverCleanup.dispose(); } };
    },
  };

  const server = new ApolloServer({
    gateway,
    introspection: true,
    plugins: [
      wsLifecyclePlugin,
      ApolloServerPluginDrainHttpServer({ httpServer }),
    ],
  });

  await server.start();

  const authProxy = createProxyMiddleware({ target: serviceMap.auth.url, secure: false, changeOrigin: true, pathRewrite: { '^/api/v1/auth': '' } });
  app.use('/api/v1/auth', authProxy);

  const streamHttpProxy = createProxyMiddleware({ target: serviceMap.stream.url, secure: false, changeOrigin: true, pathRewrite: { '^/api/v1/stream': '' } });
  app.use('/api/v1/stream', streamHttpProxy);


  const addonControllerProxy = createProxyMiddleware({ target: serviceMap.addonController.url, secure: false, changeOrigin: true, pathRewrite: { '^/api/v1/addon-controller': '' } });
  app.use('/api/v1/addon-controller', addonControllerProxy);


  app.use('/graphql', express.json({ limit: '10mb' }), expressMiddleware(server, {
    context: async ({ req }) => ({ headers: req.headers }),
  }));

  const PORT = 4000;
  httpServer.listen({ port: PORT }, () => {
    const protocol = httpServer instanceof https.Server ? 'https' : 'http';
    console.log(`🚀 API Gateway ready at ${protocol}://localhost:${PORT}`);
  });
}

startGateway().catch(console.error);