exports.Pool = function (factory) {
  var me = {},
      idleTimeoutMillis = factory.idleTimeoutMillis || 30000,
      reapInterval = factory.reapIntervalMillis || 1000,
      refreshIdle = ('refreshIdle' in factory) ? factory.refreshIdle : true,
      aliveClients = [],
      count = 0,
      removeIdleScheduled = false,
      removeIdleTimer = null,
      draining = false;
      // Prepare a logger function.
      var log = factory.log ?
        (function (str, level) {
           if (typeof factory.log === 'function') {
             factory.log(str, level);
           }
           else {
             console.log(level.toUpperCase() + " pool " + factory.name + " - " + str);
           }
         }
        ) :
        function () {};
    factory.removeby = factory.removeby?factory.removeby:"ctime";
    factory.max = parseInt(factory.max, 10);
    factory.min = parseInt(factory.min, 10);
    factory.max = Math.max(isNaN(factory.max) ? 1 : factory.max, 1);
    factory.min = Math.min(isNaN(factory.min) ? 0 : factory.min, factory.max-1);
    function clientsStatus(tolog){
      var  status={'wait':0,'used':0};
      var length = aliveClients.length;
      for(var i=0;i<length;i++){
        var obj = aliveClients[i];
        if(obj){
          if(obj.used){
            status.used++;
          }else{
            status.wait++;
            typeof status.touse =="undefined" && (status.touse = i);
          }      
        }else{
            typeof status.topush =="undefined" && (status.topush = i);
        }
      }
      if(tolog)
      log("clientsStatus: waited=" + status.wait + " used=" +status.used+" touse:"+status.touse, 'Status');
      return status;
    }
 
  me.destroy = function(obj) {
    log("destroy:"+obj.poolindex,'me');
    factory.destroy(obj);
  };
  /**
   * Checks and removes the available (idle) clients that have timed out.
   */
  function removeIdle() {
    var  now = new Date().getTime(),
        i, tr=0,length=aliveClients.length,
        removeby = factory.removeby,
        client,
        timeout;
    removeIdleScheduled = false;
    // Go through the available (idle) items,
    // check if they have timed out
      now = now - idleTimeoutMillis;
    for (i = 0;i < length && (refreshIdle && (count>factory.min));i++) {
      client=aliveClients[i];
      if(client){
        timeout = client[removeby];
        if (now >= timeout && !client.used) {
          log("removeIdle: destroying obj - now:" + now + " timeout:" + timeout, 'verbose');
          me.destroy(client.obj);
          aliveClients.splice(i,1,null);
          count--;
        }
      }
    }
    log("aliveclient.length=" + count, 'verbose');
    if (count>0) {
      scheduleRemoveIdle();
    } 
  }
  /**
   * Schedule removal of idle items in the pool.
   * More schedules cannot run concurrently.
   */
  function scheduleRemoveIdle() {
    if (!removeIdleScheduled) {
      removeIdleScheduled = true;
      removeIdleTimer = setTimeout(removeIdle, reapInterval);
    }
  }

  function createclient(callback,topush,allowtmp) {
    factory.create(function () {
      var err, obj;
      if (arguments.length > 1) {
        err = arguments[0];
        obj = arguments[1];
      } else {
        err = (arguments[0] instanceof Error) ? arguments[0] : null;
        obj = (arguments[0] instanceof Error) ? null : arguments[0];
      }
      if (err) {
        log("create connection failure:"+err,"create");
         return callback(err,null);
      } else {
            if(count<factory.max){
              log("createclient - creating obj alive", 'verbose');
              if(typeof topush=="undefined"){
                obj.poolindex = count;
                aliveClients.push({"obj":obj,"ctime":new Date().getTime(),"used":true});
              }else{
                obj.poolindex = topush;
                aliveClients[topush]={"obj":obj,"ctime":new Date().getTime(),"used":true};
              }
              count++;
              scheduleRemoveIdle();
            }else{
              if(allowtmp){
                obj.poolindex = "tmp";
                log("createclient - creating obj tmp", 'verbose');   
              }else{
                var status =clientsStatus();
                while(status.waited==0){
                  var status =clientsStatus();
                    if(status.waited>0){
                      log("createclient - wait obj alive", 'verbose');
                      aliveClients[status.touse].used=true;
                      callback(null,aliveClients[status.touse].obj);
                    }
                }
              }
            }
          callback(null,obj);
      }
    });
  }
  me.acquire = function (callback, allowtmp) {
  if (draining) {
      throw new Error("pool is draining and cannot accept work");
    }
    var status = clientsStatus(true);
    if (status.wait > 0) {
        log("getOneclient: - reusing obj", 'client');
        aliveClients[status.touse].used=true;
        callback(null,aliveClients[status.touse].obj);
      }else{
        createclient(callback,status.topush,allowtmp);
      }
  };
  me.release = function (obj) {
    console.log("ds");
    if(obj.poolindex=="tmp"){
      return me.destroy(obj);
    }
    log("towait: client("+obj.poolindex+")","me")
    aliveClients[obj.poolindex].used=false;
  };
  /**
   * Disallow any new requests and let the request backlog dissapate.
   *
   * @param {Function} callback
   *   Optional. Callback invoked when all work is done and all clients have been
   *   released.
   */
  me.drain = function(callback) {
    log("draining", 'info');
    // disable the ability to put more work on the queue.
    draining = true;
    var check = function() {
      var status = clientsStatus();
      if (status.used > 0) {
        // wait until all client requests have been satisfied.
        setTimeout(check, 100);
      } else if (status.waited!=count) {
        // wait until all objects have been released.
        setTimeout(check, 100);
      } else {
        if (callback) {
          callback();
        }
      }
    };
    check();
  };
  me.destroyAllNow = function(callback) {
    log("force destroying all clients", 'info');
    var willDie = availableObjects;
    availableObjects = [];
    var obj = willDie.shift();
    while (obj !== null && obj !== undefined) {
      me.destroy(obj.obj);
      obj = willDie.shift();
    }
    removeIdleScheduled = false;
    clearTimeout(removeIdleTimer);
    if (callback) {
      callback();
    }
  };
  me.getPoolSize = function() {
    return count;
  };
  me.getName = function() {
    return factory.name;
  };
  return me;
};
