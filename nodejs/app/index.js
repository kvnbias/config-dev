
// For custom TMP dir. Add the prefix: TMPDIR='/path/to/custom/tmp'
// node index.js -p 11060 -P http
const Koa = require('koa');
const favicon = require('koa-favicon');
const session = require('koa-session');
const commander = require('commander');
const http = require('http');
const https = require('https');
const fs = require('fs');
const chalk = require('chalk');
const path = require('path');
const numCPUs = require('os').cpus().length;
const cluster = require('cluster');
const logger = require('./modules/logger');
const routes = require('./modules/routes');

const app = new Koa();

app.use(favicon(`${__dirname}/assets/favicon.ico`));

app.keys = ['aa389156a794ff50a3f2d92b'];

const SESSION_CONFIG = {
  key: 'koa:sess',
  maxAge: 86400000,
  autoCommit: true,
  overwrite: true,
  httpOnly: true,
  signed: true,
  renew: true,
};

app.use(session(SESSION_CONFIG, app));

commander
  .version('1.0.0')
  .option('-p, --port [port]', 'Port to use [11060]', 11060)
  .option('-P, --protocol [protocol]', 'Protocol to use [http]', 'http')
  .option('-w, --websocket [websocket]', 'Websocket to use [none]', 'none')
  .option('-i, --internal [internal]', 'If socket to use is in the same domain  [false]', 'false')
  .parse(process.argv);

const port = parseInt(commander.port);
const protocol = commander.protocol;
const websocket = commander.websocket;
const isInternal = commander.internal === 'true';
const websocketHost = isInternal ? 'www.localhost.com' : 'socket.localhost.com';

logger.init(port);
app.use(logger.getHandler());

app.use(async (ctx, next) => {
  console.log(chalk.bold.green(`==> Accessed: ${port}`));
  await next();
});

const router = routes.getRouter(port, process.pid, websocket, websocketHost);
app.use(router.routes()).use(router.allowedMethods());

const options = {
  key: fs.readFileSync(path.join(__dirname, '../../certificate/www.localhost.com.key')),
  cert: fs.readFileSync(path.join(__dirname, '../../certificate/www.localhost.com.crt'))
};

const server = protocol === 'https'
  ? https.createServer(options, app.callback()) : http.createServer(app.callback());

if (isInternal && websocket === 'socketio') {
  // with scaling support using redis
  const io = require('socket.io');
  const sticky = require('sticky-session');
  const sredis = require('socket.io-redis');

  // polling doesn't work with clusters and scaling
  const wss = new io(server, { path: '/socket', transports:['websocket'] });
  // Passing events between nodes
  // Tell Socket.IO to use the redis adapter. By default, the redis
  // server is assumed to be on localhost:6379. You don't have to
  // specify them explicitly unless you want to change them.
  wss.adapter(sredis());

  wss.of('/namespace').on('connect', client => {
    client.on('message', data => {
      const { room, message } = data;
      wss.of('/namespace').to(`room ${room}`).emit('message', message);
    });

    client.on('join', room => {
      client.join(`room ${room}`, () => {
        wss.of('/namespace').to(`room ${room}`).emit('message', `
          A new user has joined room ${room}:${port}:${process.pid}
        `);
      });
    });
  });

  if (!sticky.listen(server, port)) {
    server.on('listening', () => {
      console.log(chalk.bold.green(`==> Master is running at port ${port} process: ${process.pid} with socketio`));
    });

    cluster.on('listening', (worker, code, signal) => {
      console.log(chalk.bold.yellow(`==> Worker ${worker.id} started on process ${worker.process.pid}`));
    });

    cluster.on('exit', (worker, code, signal) => {
      console.log(chalk.bold.red(`==> Worker ${worker.id} died on process ${worker.process.pid}`));
    });
  } else {
    // Don't use a port here because the master listens on it for the workers.
    // Don't expose our internal server to the outside.
    server.listen(0, () => {
      console.log(chalk.bold.green(`==> Listening on port ${port}`));
    });
  }
}
else if (isInternal && websocket === 'ws') {
  // no rooms, namespaces and scaling support. only basic websocket.
  const WebSocket = require('ws');

  const wss = new WebSocket.Server({ server, path: '/socket' });
  wss.broadcast = data => {
    wss.clients.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) ws.send(data)
    });
  }

  wss.on('connection', ws => {
    wss.broadcast(`New connection from: ${port}:${process.pid}`);

    ws.on('message', message => {
      wss.broadcast(message);
    });
  });

  server.listen(port, () => {
    console.log(chalk.bold.green(`==> Listening on port ${port} with ws`));
  });
}
else {
  // no websocket
  const options = {
    key: fs.readFileSync(path.join(__dirname, '../../certificate/www.localhost.com.key')),
    cert: fs.readFileSync(path.join(__dirname, '../../certificate/www.localhost.com.crt'))
  };

  const server = protocol === 'https'
    ? https.createServer(options, app.callback()) : http.createServer(app.callback());

  if (cluster.isMaster) {
    console.log(chalk.bold.green(`==> Master is running at process: ${process.pid}`));
    for (let i = 0; i < numCPUs; i++) {
      cluster.fork();
    }

    cluster.on('listening', (worker, code, signal) => {
      console.log(chalk.bold.yellow(`==> Worker ${worker.process.pid} started`));
    });

    cluster.on('exit', (worker, code, signal) => {
      console.log(chalk.bold.red(`==> Worker ${worker.process.pid} died`));
    });
  } else {
    server.listen(port, () => {
      console.log(chalk.bold.green(`==> Listening on port ${port}`));
    });
  }
}

