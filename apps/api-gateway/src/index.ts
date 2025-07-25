import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@as-integrations/express5';
import { ApolloGateway, IntrospectAndCompose } from '@apollo/gateway';
import express from 'express';
import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Server } from 'http';

// =================================================================
// ==              LOCALHOST SSL CERTIFICATE FIX                   ==
// =================================================================
// This patches HTTPS requests to localhost only, allowing Apollo Gateway
// to connect to local development services with self-signed certificates
// without affecting other HTTPS requests or requiring global env vars.

// Create a custom HTTPS agent for localhost connections
const localhostHttpsAgent = new https.Agent({
  rejectUnauthorized: false,
  checkServerIdentity: () => undefined,
});

// Store original HTTPS methods
const originalHttpsRequest = https.request;
const originalHttpsGet = https.get;

// Patch https.request to use custom agent for localhost
https.request = function (options, callback) {
  if (typeof options === 'string') {
    options = new URL(options);
  }

  // Apply custom SSL handling only to localhost requests
  const isLocalhost = options.hostname === 'localhost' ||
    options.host === 'localhost' ||
    (typeof options === 'object' && options.hostname?.includes('localhost'));

  if (isLocalhost) {
    options.agent = localhostHttpsAgent;
    options.rejectUnauthorized = false;
  }

  return originalHttpsRequest(options, callback);
};

// Patch https.get for localhost
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

// =================================================================

// ESM-compatible way to get __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Initialize and start the Apollo Gateway
 */
async function startGateway() {
  const app = express();

  const gateway = new ApolloGateway({
    supergraphSdl: new IntrospectAndCompose({
      subgraphs: [
        { name: 'accounts', url: 'https://localhost:8002/graphql' },
        { name: 'addons', url: 'https://localhost:8001/graphql' },
      ],
    }),
  });

  const server = new ApolloServer({
    gateway,
  });

  await server.start();

  app.use('/graphql', express.json(), expressMiddleware(server));

  // Start HTTPS server with local certificates
  try {
    const keyPath = path.resolve(__dirname, '../../../local_dev_deps/certs/localhost+2-key.pem');
    const certPath = path.resolve(__dirname, '../../../local_dev_deps/certs/localhost+2.pem');

    const httpsOptions = {
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath),
    };

    const httpsServer = https.createServer(httpsOptions, app);
    startServer(httpsServer, 4000, true);

  } catch (error) {
    console.error('Could not start HTTPS server. Is `local_dev_deps/certs` set up correctly?');
    console.error(error);
    const httpServer = http.createServer(app);
    startServer(httpServer, 4000, false);
  }
}

function startServer(server: Server, port: number, isHttps: boolean) {
  server.listen({ port }, () => {
    const protocol = isHttps ? 'https' : 'http';
    console.log(`🚀 API Gateway (${protocol.toUpperCase()}) is ready at ${protocol}://localhost:${port}/graphql`);
  });
}

// Start the application
startGateway().catch(console.error);