
const winston = require('winston');
const path = require('path');
const fs = require('fs');

// This dir must be created by the user with the right ownership and context.
const logPath = '/var/log/nodejs';

fs.access(logPath, fs.constants.W_OK, function(err) {
  if (err) console.error('Can\'t write logs');
});

function init (port) {
  let transports = [
    new winston.transports.File({ filename: path.join(logPath, 'access.log') })
  ];

  winston.loggers.add('access', {
    // Write to all logs with level `info` and below to `accessLogFile`
    levels: winston.config.syslog.levels,
    format: winston.format.combine(
      winston.format.label({ label: `node - ${port}` }),
      winston.format.timestamp(),
      winston.format.json()
    ),
    transports,
    // unhandled exceptions
    exceptionHandlers: [
      new winston.transports.File({ filename: path.join(logPath, 'error.log') })
    ],
    exitOnError: true
  });
};

function getHandler () {
  const headerIncludes = [ 'x-real-ip', 'x-forwarded-for', 'host', 'user-agent' ];

  return async (ctx, next) => {
    let headers = {};
    const { method, url } = ctx.request;

    for (let index in ctx.request.header) {
      if (headerIncludes.includes(index) === true) {
        headers[index] = ctx.request.header[index];
      }
    }

    winston.loggers.get('access').info({
      headers: { method, url, ...headers }
    });

    try {
      await next();
    } catch (err) {
      winston.loggers.get('access').error({
        status: err.statusCode || err.status || 500,
        headers: { method, url, ...headers },
        stack: err.stack
      });

      // throw err;
      ctx.body = err.stack;
    }
  };
}

module.exports = { init, getHandler };
