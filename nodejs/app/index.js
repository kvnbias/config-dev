
// For custom TMP dir. Add the prefix: TMPDIR='/path/to/custom/tmp'
// node index.js -p 3500 -P https
const Koa = require('koa');
const favicon = require('koa-favicon');
const session = require('koa-session');
const commander = require('commander');
const http = require('http');
const https = require('https');
const fs = require('fs');
const chalk = require('chalk');
const path = require('path');
const cluster = require('cluster');
const WebSocket = require('ws');
const numCPUs = require('os').cpus().length;
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
  .option('-p, --port [port]', 'Port to use [3500]', 3500)
  .option('-P, --protocol [protocol]', 'Protocol to use [http]', 'http')
  .parse(process.argv);

const port = parseInt(commander.port);
const protocol = commander.protocol;

logger.init(port);
app.use(logger.getHandler());

app.use(async (ctx, next) => {
  console.log(chalk.bold.green(`==> Accessed: ${port}`));
  await next();
});

const router = routes.getRouter(port);
app.use(router.routes()).use(router.allowedMethods());

const options = {
  key: fs.readFileSync(path.join(__dirname, '../../certificate/www.localhost.com.key')),
  cert: fs.readFileSync(path.join(__dirname, '../../certificate/www.localhost.com.crt'))
};

const server = protocol === 'http'
  ? http.createServer(app.callback()) : https.createServer(options, app.callback());

const wss = new WebSocket.Server({ server, path: '/socket' });

wss.on('connection', ws => {
  const time = new Date().toISOString();
  ws.send(`New connection from: ${port} - ${time}`);

  ws.on('message', message => {
    const time = new Date().toISOString();
    ws.send(`Message received by server: ${message} - ${time}`);
  });
});

if (cluster.isMaster) {
  console.log(chalk.bold.green(`==> Master ${process.pid} is running`));

  // Fork workers.
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
    console.log(chalk.bold.red(`==> Worker ${worker.process.pid} died`));
  });
} else {
  // Workers can share any TCP connection
  server.listen(port, () => {
    console.log(chalk.bold.green(`==> Listening on port ${port}`));
  });
}
