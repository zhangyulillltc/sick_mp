var conf = require("../config/conf.json").poolConf;
var POOL = {};
var poolManger = require("./pool");
module.exports = function(type,callback) {
	var dbConf = conf[type];
	if (typeof dbConf != "object") {
		return false;
	}
	switch (type) {
		case "mysql":
			var key = 'mysql_' + dbConf.host + '_' + dbConf.user;
			if (!POOL[key]) {
				mysqldb_with_Pool(key, dbConf);
			}
			var clientManger = POOL[key];
			clientManger.acquire(function(err,client){
					if(err){
						clientManger.release(client);
						return callback(err,null,null);
					}
					return callback(null,client,function(){
						clientManger.release(client);
					});
			});
			break;
		case "mongodb":
			// var poolKey ='mongodb_'+dbname;
			// if(!POOL[poolKey]){
			// 	init_mongodbpool(poolKey,dbname);
			// }
			// var client = MXPOOL[poolKey];
			// 	client.acquire(function(err,db){
			// 		if(err){
			// 			console.log(err);
			// 			client.release(db);
			//  			return callback(err,null,null);
			//  		}
			//  	var collection = db.collection(option.name);
			//  		return callback(null,collection,function(){
			// 			    client.release(db); 
			// 			});
			// 	},0);
			break;
		case "redis":
			// 	var poolKey ='redis';
			// if(!MXPOOL[poolKey]){
			// 	init_mongodbpool(poolKey,dbname);
			// }
			// var client = MXPOOL[poolKey];
			// 	client.acquire(function(err,db){
			// 		if(err){
			//  			return callback(err,null,null);
			//  		}
			// 	var collection = db.collection(option.name);
			// 		return callback(null,collection,function(){
			// 		client.release(db);
			// 	});
			// });
			break;
			case "sphinx":
			break;
		default:
			break;
	}
}
function mysqldb_with_Pool(key, option) {
	var mysql = require("mysql");
	var pool = poolManger.Pool({
		name: key,
		create: function(callback) {
			var connection = mysql.createConnection({
				host: option.host,
				user: option.user,
				password: option.password
			});
			connection.connect(function(err) {
				callback(err, connection);
			});
		},
		destroy: function(client, callback) {
			client.end(function(err) {
				if(typeof callback !="undefined")
				callback(err);
			});
		},
		log: true
	});
	POOL[key] = pool;
}

function mysqldb_selfPool(key, option) {
	var mysql = require("mysql");
	var pool = mysql.createPool({
		connectionLimit: 10,
		host: option.host,
		user: option.user,
		password: option.password
	});
	pool.acquire = pool.getConnection;
	pool.release = function(client){
		client.release();
	}
	POOL[key]=pool;
}
function init_sphinx(key,option){
	var sphinx = require("limestone");
		var pool = poolManger.Pool({
		name: key,
		create: function(callback) {
			var connection = sphinx.connect(option.host,function(err){
				callback(err,connection)
			});
		},
		destroy: function(client, callback) {
			client.disconnetc(function(err) {
				if(typeof callback !="undefined")
				callback(err);
			});
		},
		log: true
	});
	POOL[key] = pool;
}
// function init_mongodbpool(key,database){
// 	var poolModule = require('generic-pool');
// 	var pool = poolModule.Pool({
// 		    name     : "mongodb",
// 		    create   : function(callback) {
// 		    	var mongodb =require('mongodb');
// 		    	 	mongodb.MongoClient.connect(conf[database],conf.mongodb.option,function(err,db){
// 				        callback(err, db);
// 		    	 	});
// 		    },
// 		    destroy  : function(client) { client.close(); },
// 		    max      : conf.mongodb.max,
// 		    // optional. if you set this, make sure to drain() (see step 3)
// 		    min      : conf.mongodb.min, 
// 		    // specifies how long a resource can stay idle in pool before being removed
// 		  //  idleTimeoutMillis : 30000,
// 		     // if true, logs via console.log - can also be a function
// 		    log : true 
// 	});
// 	MXPOOL[key]=pool;
// }
// function init_redis_pool(key){
// 	var poolModule = require('generic-pool');
// 	var pool = poolModule.Pool({
// 		    name     : "redis",
// 		    create   : function(callback) {
//     			var redis  = require('redis');
// 				var client = redis.createClient();
// 				    callback(null, client);
// 		    },
// 		    destroy  : function(client) { client.end(); },
// 		    max      : 10,
// 		    // optional. if you set this, make sure to drain() (see step 3)
// 		    min      : 0, 
// 		    // specifies how long a resource can stay idle in pool before being removed
// 		//    idleTimeoutMillis : 3000,
// 		     // if true, logs via console.log - can also be a function
// 		    log : false 
// 	});
// 	MXPOOL[key]=pool;	
// }