var conf = require("../config/conf.json").cache;
var pool;
var cache = function() {
	if(typeof pool == "object"){
		return pool;
	}
	var obj = require(conf.file);
	switch(conf.type) {
		case "memcached":
			pool = new obj(conf.host, conf.option);
			break;
		case "redis":
			pool = obj.createClient(conf.port, conf.host, conf.option);
			break;
		default:
			return false;
	}
	return pool;
}
module.exports = cache;