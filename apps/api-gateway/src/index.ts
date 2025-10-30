import type { Options as ProxyOptions } from 'http-proxy-middleware';
import type { ServerResponse } from 'http';
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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ENV
const APP_ENV = process.env.APP_ENV || process.env.NODE_ENV || 'development';
const PORT = Number(process.env.PORT || 4000);

function getErrorMessage(err: unknown): string {
  if (!err) return String(err);
  if (typeof err === 'string') return err;
  if (typeof err === 'object') {
    // common shapes: Error-like with message, or { message: string }
    const maybe = err as { message?: unknown; stack?: unknown };
    if (typeof maybe.message === 'string') return maybe.message;
    if (typeof maybe.stack === 'string') return maybe.stack.split('\n')[0];
  }
  try { return String(err); } catch { return 'Unknown error'; }
}


// Helper: use a fetcher that disables TLS verification ONLY in development
function makeFetcher() {
  if (APP_ENV === 'development') {
    const localDevAgent = new https.Agent({ rejectUnauthorized: false });
    return async (url: any, options: any) => fetch(url, { ...options, agent: localDevAgent });
  }
  // production: use default fetch (secure)
  return async (url: any, options: any) => fetch(url, options);
}

class ConditionalHttpsDataSource extends RemoteGraphQLDataSource {
  constructor(config: { url: string }) {
    super(config);
    // Only replace fetcher in dev (to accept mkcert / self-signed dev certs).
    if (APP_ENV === 'development') {
      this.fetcher = makeFetcher();
    }
  }
  willSendRequest({ request, context }: any) {
    if (context.headers?.authorization) {
      request.http.headers.set('authorization', context.headers.authorization);
    }
  }
}

async function startGateway() {
  // SERVICE URLS - expect real production URLs in env
  const serviceMap = {
    accounts: { url: `${process.env.ACCOUNT_PROFILE_SERVICE_URL}/graphql` },
    addons: { url: `${process.env.ADDON_CONTROLLER_URL}/graphql` },
    auth: { url: process.env.AUTH_SERVICE_URL }, // full URL expected, e.g. https://auth.example.com
    stream: { url: process.env.STREAM_SERVICE_URL || 'https://localhost:8004' },
    addonController: { url: process.env.ADDON_CONTROLLER_URL }
  };

  const app = express();

  // Basic middleware
  app.use(express.json({ limit: '10mb' }));

  // Trust proxy so req.protocol and req.secure reflect client-facing proto (Render/Cloudflare)
  if (APP_ENV === 'production') {
    app.set('trust proxy', true);
  }

  // Minimal logging for auth endpoints while debugging (remove when stable)
  app.use((req, res, next) => {
    if (req.originalUrl.includes('/auth') || req.originalUrl.includes('/login')) {
      try {
        console.log(`[REQ] ${req.method} ${req.originalUrl} host:${req.headers.host} xfp:${req.headers['x-forwarded-proto']}`);
        console.log('[REQ BODY]', typeof req.body === 'object' ? JSON.stringify(req.body).slice(0, 2000) : String(req.body || ''));
      } catch (e) {
        console.log('[REQ LOG ERR]', getErrorMessage(e));
      }
    }
    next();
  });

  // Health
  app.get('/health', (_req, res) => res.status(200).json({ ok: true, env: APP_ENV, ts: new Date().toISOString() }));

  // CORS: set production origins explicitly (replace with your frontends)
  const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
  app.use(cors({
    origin: allowedOrigins.length ? allowedOrigins : true,
    credentials: true,
  }));

  // Cookie options helper (for reference where you set cookies)
  const cookieOptions = {
    httpOnly: true,
    secure: APP_ENV === 'production',
    sameSite: APP_ENV === 'production' ? 'none' : 'lax',
  };

  // SERVER: HTTPS in dev using local mkcert certs (if available), otherwise HTTP server.
  let httpServer: Server;
  let protocol = 'http';
  if (APP_ENV === 'development') {
    // Try reading dev certs, but fall back to HTTP if missing (so dev still runs)
    try {
      const keyPath = path.resolve(__dirname, '../../../local_dev_deps/certs/localhost+2-key.pem');
      const certPath = path.resolve(__dirname, '../../../local_dev_deps/certs/localhost+2.pem');
      if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
        const httpsOptions = { key: fs.readFileSync(keyPath), cert: fs.readFileSync(certPath) };
        httpServer = https.createServer(httpsOptions, app);
        protocol = 'https';
        console.warn('Dev: running HTTPS using local dev certs.');
      } else {
        console.warn('Dev: certs not found, falling back to HTTP.');
        httpServer = http.createServer(app);
      }
    } catch (e) {
      console.warn('Dev: error loading certs, falling back to HTTP.', getErrorMessage(e));
      httpServer = http.createServer(app);
    }
  } else {
    // production: we expect TLS at the edge (Render), so run plain HTTP on origin
    httpServer = http.createServer(app);
    protocol = 'http';
  }

  httpServer.keepAliveTimeout = 120000;
  httpServer.headersTimeout = 120000;

  // Apollo Gateway
  const gateway = new ApolloGateway({
    supergraphSdl: new IntrospectAndCompose({
      subgraphs: [
        { name: 'accounts', url: serviceMap.accounts.url },
        { name: 'addons', url: serviceMap.addons.url },
      ],
      pollIntervalInMs: 5000,
    }),
    buildService(service) {
      return new ConditionalHttpsDataSource({ url: service.url ?? "" });
    },
  });

  // Websocket + upgrade handling plugin
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
            // For dev allow insecure agent if needed; in prod use default secure client
            const devAgent = APP_ENV === 'development' ? new https.Agent({ rejectUnauthorized: false }) : undefined;
            const forwardClient = createClient({
              url: serviceMap.addons.url,
              webSocketImpl: class extends WebSocket {
                constructor(url: string | URL, protocols?: string | string[]) {
                  // pass dev agent only in development
                  super(url, protocols, { agent: devAgent });
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

      // stream websocket proxy middleware (ws upgrade only)
      const streamWsProxy = createProxyMiddleware({
        target: serviceMap.stream.url,
        ws: true,
        secure: APP_ENV !== 'development', // verify TLS in prod; allow self-signed in dev if needed
        changeOrigin: true,
      });

      httpServer.on('upgrade', (req: IncomingMessage, socket: Duplex, head: Buffer) => {
        try {
          const base = `${req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http'}://${req.headers.host}`;
          const { pathname } = new URL(req.url!, base);
          if (pathname === '/graphql') {
            gqlWsServer.handleUpgrade(req, socket as Socket, head, (ws) => {
              gqlWsServer.emit('connection', ws, req);
            });
          } else if (pathname.startsWith('/api/v1/stream')) {
            streamWsProxy.upgrade(req, socket as Socket, head);
          } else {
            socket.destroy();
          }
        } catch (e) {
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

  // PROXIES: in prod we verify downstream TLS; in dev allow self-signed
  const proxySecureFlag = APP_ENV !== 'development';

  // fast-safe: build the options and cast to any to satisfy TypeScript
  const authProxyOptions = {
    target: serviceMap.auth.url,
    secure: proxySecureFlag,
    changeOrigin: true,
    pathRewrite: { '^/api/v1/auth': '' },
    proxyTimeout: 30000,
    timeout: 30000,
    onProxyReq(proxyReq: any, req: any, res: any) {
      if (req.headers && req.headers.authorization) {
        proxyReq.setHeader('authorization', req.headers.authorization as string);
      }
      if (req.headers && req.headers.host) {
        proxyReq.setHeader('x-forwarded-host', req.headers.host as string);
      }
    },
    onProxyRes(proxyRes: any, req: any, res: any) {
      try {
        console.log(`[PROXY RES] ${req.method} ${req.originalUrl} -> ${serviceMap.auth.url} status:${proxyRes.statusCode}`);
      } catch (e) {
        console.log('[PROXY RES LOG ERR]', (e as any)?.message ?? String(e));
      }
    },
    onError(err: any, req: any, res: any) {
      console.error('[PROXY ERROR]', {
        url: serviceMap.auth.url,
        message: (err && (err as any).message) || String(err),
        code: (err && (err as any).code) || undefined,
        method: req.method,
        path: req.originalUrl,
      });
      if (!res.headersSent) {
        res.writeHead(502, { 'Content-Type': 'application/json' });
      }
      res.end(JSON.stringify({ ok: false, error: 'proxy_error', details: (err && (err as any).message) || String(err) }));
    }
  } as any;

  const authProxy = createProxyMiddleware(authProxyOptions);
  app.use('/api/v1/auth', authProxy);


  const streamHttpProxy = createProxyMiddleware({
    target: serviceMap.stream.url,
    secure: proxySecureFlag,
    changeOrigin: true,
    pathRewrite: { '^/api/v1/stream': '' },
  });
  app.use('/api/v1/stream', streamHttpProxy);

  const addonControllerProxy = createProxyMiddleware({
    target: serviceMap.addonController.url,
    secure: proxySecureFlag,
    changeOrigin: true,
    pathRewrite: { '^/api/v1/addon-controller': '' },
  });
  app.use('/api/v1/addon-controller', addonControllerProxy);

  // GraphQL endpoint
  app.use('/graphql', express.json({ limit: '10mb' }), expressMiddleware(server, {
    context: async ({ req }) => ({ headers: req.headers }),
  }));

  // global error handler (convert crashes into JSON)
  app.use((err: unknown, _req: any, res: any, _next: any) => {
    // normalize error for logging and avoid TS complaining about unknown.message
    const errObj = (err && typeof err === 'object') ? err as { message?: string; stack?: string } : { message: String(err) };
    console.error('[UNHANDLED ERROR]', errObj.stack ?? errObj.message ?? err);
    res.status(500).json({ ok: false, message: errObj.message ?? 'internal server error' });
  });


  // LISTEN on port and 0.0.0.0 for Render
  httpServer.listen({ port: PORT, host: '0.0.0.0' }, () => {
    console.log(`🚀 API Gateway ready at ${protocol}://0.0.0.0:${PORT} (APP_ENV=${APP_ENV})`);
  });
}

startGateway().catch((err: unknown) => {
  const errObj = (err && typeof err === 'object') ? err as { message?: string; stack?: string } : { message: String(err) };
  console.error('Failed to start gateway', errObj.stack ?? errObj.message ?? err);
  process.exit(1);
});
