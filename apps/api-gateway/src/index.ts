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
import cors from 'cors';


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
  const app = express();

  const gateway = new ApolloGateway({
    supergraphSdl: new IntrospectAndCompose({
      subgraphs: [
        { name: 'accounts', url: 'https://localhost:8002/graphql' },
        { name: 'addons', url: 'https://localhost:8001/graphql' },
      ],
      pollIntervalInMs: 5000,
    }),
  });

  const server = new ApolloServer({
    gateway,
    introspection: true,
  });

  await server.start();

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


  app.use('/graphql', cors(), express.json(), expressMiddleware(server));

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

startGateway().catch(console.error);