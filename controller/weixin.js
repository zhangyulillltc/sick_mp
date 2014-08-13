var c = {
	"name": "weixin"
};
var wechat = require('wechat');
var cache = require('../modules/cache')();
exports = module.exports = c;
c.index = function(req, res, callback) {
	var token = "152f8f896ad1be5b73feeab68886aeb2";
	var wx = wechat(token, req.query);
	var data = {
		"status": 200
	};
	if (wx) {
		switch (req.method) {
			case "GET":
				data.body = req.query.echostr;
				break;
			case "POST":
				dealMessage(req, wx, callback);
				break;
			default:
				data.body = "Not support this http method";
				data.status = 501;
		}
	} else {
		data.body = "Invalid signature";
		data.status = 401;
	}
	if (data.body) {
		process.nextTick(function() {
			callback(null, data);
		});
	}
}

function dealMessage(req, wx, callback) {
	var data = {
		'status': 200
	};
	wx.getMessage(req, function(err, msg) {
		let key = c.name + '_' + msg.MsgId;
		setImmediate(function() {
			cache.add(key, 1, 60, function(err) {
				if (err) {
					data.status = 400;
					data.body = ""; //超时后微信重发导致的重复消息
					callback(null, data);
				}
			});
		});
		setImmediate(function(){
			logTodb(null);
		});
		data.body = wx.text("试试先");
		data.type = "text/xml";
		callback(null, data);
	})
}

function logTodb(data){
	var time = new Date().getTime();
	data = {
		"text":"你好",
		"reply":"不好",
		"user":"sadasdasdasds",
		"time": Math.floor(time/1000),
	}
		var getdb = require("../modules/poolManger");
		getdb("mysql",function(err,db,close){
			var query = db.query("INSERT DELAYED INTO w_wxlog SET ?",data,function(err,result){
			console.log(err);
			console.log(query.sql);
			close();
		});
	});
}