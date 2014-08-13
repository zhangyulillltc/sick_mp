var koa = require('koa');
var fs = require("fs");
var app = koa();
var func = require('./modules/func');
// logger
var cache = require("./modules/cache");
app.use(function * (next) {
  let start = new Date;
  yield next;
  let ms = new Date - start;
  this.set('X-Response-Time', ms + 'ms');
});

// favicon
app.use(function * (next) {
  if ('/favicon.ico' != this.path) return yield next;
  var realPath = __dirname + '/assets/favicon.ico';
  var _this = this;
  app.async = true;
  fs.readFile(realPath, function(err, data) {
    if (err) {
      data = '';
    } else {
      _this.set('Cache-Control', 'public, max-age=' + (864000 | 0));
    }
    if ('GET' !== _this.method && 'HEAD' !== _this.method) {
      _this.status = 'OPTIONS' == _this.method ? 200 : 405;
      _this.set('Allow', 'GET, HEAD, OPTIONS');
      return;
    }
    _this.type = 'image/x-icon';
    _this.status = 200;
    _this.res.end(data);
    app.async = false;
  });
});
app.use(function * (next) {
  let path = this.path == "/" ? "/index" : this.path;
  let paths = path.substr(1).split('/');
  var controller = __dirname + '/controller/' + paths[0] + '.js';
  var action = paths[1] ? paths[1] : 'index';
  console.log(controller);
  try {
    var module = require(controller);
    var method = module[action]
    var _this = this;
    _this.req.query=this.query;
    func.Async(function*(callback) {
      var data = yield method.apply(null, [_this.req, _this.res,callback].concat(paths.slice(2)));
      if(typeof data=="string"){
        _this.body = data;
      }else{
        for(let i in data){
          _this[i] = data[i];
        }
      }
    });
  } catch (err) {
    throw err;
  }

});
app.on('error', function(err, ctx) {
  console.log('server error', err);
});
app.listen(3100);