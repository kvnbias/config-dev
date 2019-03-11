
// Just used to serve assets, if not using nginx (which is unlikely)
// node index.js -p 6500 -P https
const Koa = require('koa');
const serve = require('koa-static');
const favicon = require('koa-favicon');
const commander = require('commander');
const http = require('http');
const https = require('https');
const fs = require('fs');
const chalk = require('chalk');
const path = require('path');
const cluster = require('cluster');
const numCPUs = require('os').cpus().length;

const app = new Koa();

app.use(serve(`${__dirname}/assets`));
app.use(favicon(`${__dirname}/assets/favicon.ico`));

commander
  .version('1.0.0')
  .option('-p, --port [port]', 'Port to use [6500]', 6500)
  .option('-P, --protocol [protocol]', 'Protocol to use [http]', 'http')
  .parse(process.argv);

const port = parseInt(commander.port);
const protocol = commander.protocol;

app.use(async (ctx, next) => {
  console.log(chalk.bold.green(`==> Accessed: ${port}`));
  await next();
});

const options = {
  key: fs.readFileSync(path.join(__dirname, '../../certificate/www.localhost.com.key')),
  cert: fs.readFileSync(path.join(__dirname, '../../certificate/www.localhost.com.crt'))
};

const server = protocol === 'http'
  ? http.createServer(app.callback()) : https.createServer(options, app.callback());

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
