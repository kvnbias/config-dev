
// node index.js -p 11070 -P http
const commander = require('commander');
const http = require('http');
const https = require('https');
const fs = require('fs');
const chalk = require('chalk');
const cluster = require('cluster');
const numCPUs = require('os').cpus().length;
const path = require('path');

commander
  .version('1.0.0')
  .option('-p, --port [port]', 'Port to use [11070]', 11070)
  .option('-P, --protocol [protocol]', 'Protocol to use [http]', 'http')
  .option('-w, --websocket [websocket]', 'Websocket to use [ws]', 'ws')
  .parse(process.argv);

const port = parseInt(commander.port);
const protocol = commander.protocol;
const websocket = commander.websocket;

const options = {
  key: fs.readFileSync(path.join(__dirname, '../../certificate/localhost.key')),
  cert: fs.readFileSync(path.join(__dirname, '../../certificate/localhost.crt'))
};

const server = protocol === 'https' ? https.createServer(options) : http.createServer();
let wss;

switch (websocket) {
  // with scaling and clustering support but requires redis + sticky-session.
  // long-polling doesn't work when clustered, low performance compared to others.
  case 'socketio':
    const io = require('socket.io');
    const sticky = require('sticky-session');
    const sredis = require('socket.io-redis');

    // polling doesn't work with clusters and scaling
    wss = new io(server, { path: '/socket', transports:['websocket'] });
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
    break;
  // static rooms/channels, no namespaces, needs custom function for broadcasting,
  // and no cluster support. only basic websocket functionalities.
  case 'sockjs':
    clients = [];
    const sockjs = require('sockjs');
    const multiplex = require('websocket-multiplex');
    wss = sockjs.createServer({
      sockjs_url: 'https://assets.localhost.com/sockjs/sockjs.min.js',
      prefix: '/socket'
    });

    const multiplexer = new multiplex.MultiplexServer(wss);

    /**
     * Sample non-multiplex connection:
     *
     * wss.broadcast = message => {
     *   for (var client in clients) clients[client].write(message);
     * }
     *
     * wss.on('connection', ws => {
     *   // add this client to clients object
     *   clients[ws.id] = ws;
     *
     *   wss.broadcast(`New connection from: ${port}:${process.pid}`);
     *
     *   ws.on('data', message => {
     *     wss.broadcast(message);
     *   });
     *
     *   ws.on('close', () => {});
     * });
     *
     * wss.installHandlers(server);
     */

    // consider this as room 1
    const one = multiplexer.registerChannel(1);
    // unoptimized broadcasting
    one.broadcast = message => {
      for (let client in clients) clients[client].write(message);
    }

    one.on('connection', ws => {
      clients[ws.conn.id] = ws;
      one.broadcast(`New connection from: ${port}:${process.pid} room 1:${ws.conn.id}`);
      ws.on('data', message => one.broadcast(message));
      ws.on('close', () => {});
    });

    wss.installHandlers(server);

    server.listen(port, () => {
      console.log(chalk.bold.green(`==> Listening on port ${port} with sockjs`));
    });
    break;
  // no rooms/channels, no namespaces, no broadcasting (as of now),
  // no long-polling and no cluster support.
  // only basic websocket functionalities but high performance.
  case 'uws':
    wss = require('uWebSockets.js');
    wss./*SSL*/App({
      key_file_name: options.key,
      cert_file_name: options.cert,
    }).ws('/*', {
      compression: 0,
      maxPayloadLength: 16 * 1024 * 1024,
      idleTimeout: 0,
      open: (ws, req) => ws.send(`New connection from: ${port}:${process.pid}`),
      close: (ws, code, message) => console.log(chalk.bold.red('WebSocket closed')),
      message: (ws, message, isBinary) => console.log('Backpressure: ', ws.send(message, isBinary)),
      drain: ws => console.log(chalk.bold.orange(`WebSocket backpressure: ${ ws.getBufferedAmount()}`))
    }).any('/*', (res, req) => {
      // deny all http request
      res.end('Nothing to see here!');
    }).listen(port, listenSocket => {
      if (listenSocket) console.log(chalk.bold.green(`==> Listening to port ${port} with uws`));
    });
    break;
  case 'cws':
    const ClusterWS = require('clusterws');
    const wss = new ClusterWS({
      port, // specify port of the application
      worker: function() {
        const wss = this.wss;
        const server = this.server;

        wss.on('connection', (socket, req) => {})
      },
      // tlsOptions: options
    });

    break;
  // no rooms/channels, no namespaces, needs custom function for broadcasting,
  // no long-polling and no cluster support. only basic websocket.
  default:
    const WebSocket = require('ws');
    wss = new WebSocket.Server({ server, path: '/socket' });
    // unoptimized broadcasting
    wss.broadcast = data => {
      // where wss.clients is an array of Websocket (ws) connections
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
    break;
}
