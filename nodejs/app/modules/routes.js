
const Router = require('koa-router');
const twig = require('twig');
const path = require('path');
const body = require('koa-body')({ multipart: true });

const getRouter = function (port, pid, websocket, websocketHost) {

  const router = new Router();

  router.all('/', body, async ctx => {
    const time = new Date().toISOString();
    let hasUpload = false
    let fileName = '';

    if (ctx.request.method === 'POST') {
      // ctx.request.body
      fileName = ctx.request.files.doc.name;
      hasUpload = ctx.request.files.doc.size > 0;
    }

    if (typeof ctx.session.datetime == 'undefined') {
      ctx.session.datetime = new Date().toLocaleString();
    }

    const datetime = ctx.session.datetime;
    const content = new Promise((resolve, reject) => {
      twig.renderFile(
        path.join(__dirname, '../views/index.html.twig'),
        { port, pid, websocket, websocketHost, time, hasUpload, fileName, datetime },
        (err, html) => err ? reject(err) : resolve(html)
      );
    });

    ctx.body = await content;
  });

  return router;
}

module.exports = { getRouter };
