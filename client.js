function Client(settings){
  this.dropbox = new Dropbox.Client(settings);

  var prefix = "ynab";
  this.hasLocalStorageSupport = (function(){
    try {
      var key = "ynab:localStorage:test";
      localStorage.setItem(key, "a");
      localStorage.removeItem(key);
      return true;
    } catch(e) {
      return false;
    }
  })();

  this.load = function (path, method){
    var deferred = new $.Deferred;
    var cached = undefined;//fetchCache(method, path);
    if(cached !== undefined) {
      setTimeout(function(){
        deferred.resolve(cached);        
      }, 10)
    } else {
      this.dropbox[method](path, function(error, data) {
        if (error) {
          deferred.reject(error);
        }else{
          pushCache(method, path, data);
          deferred.resolve(data);
        }
      });      
    }

    return deferred;
  }

  this.loadJson = function(path){
    return this.load(path, "readFile").then(function(data){
      return JSON.parse(data);
    });
  }

  this.readDir = function(path){
    return this.load(path, "readdir");
  }

  this.authenticate = function(){
    var deferred = new $.Deferred;
    this.dropbox.authenticate(function(error, client) {
      if (error) {
        deferred.reject(error);
      }else{
        deferred.resolve(client);
      }
    });
    return deferred;
  }

  this.flushCache = function() {
    if(this.hasLocalStorageSupport) {
      Object.keys(localStorage).forEach(function(key){
        if(key.indexOf("ynab") === 0) {
          localStorage.removeItem(key);
        }
      });
    }
  }

  var cacheTTL = 5 * 60 * 1000;

  function fetchCache(method, path) {
    if(this.hasLocalStorageSupport) {
      var key = cacheKey(method, path);
      var cached = localStorage[key];
      if(cached) {
        try {
          var parsed = JSON.parse(cached);
          var expired = now() - (cacheTTL + parsed.timestamp) > 0;
          if(expired) {
            localStorage.removeItem(key);
            return undefined;
          } else {
            return parsed.data;
          }
        } catch(e) {}
      }
    }
    return undefined;
  }

  function now(){
    return (new Date).getTime()
  }

  function pushCache(method, path, value) {
    if(this.hasLocalStorageSupport) {
      localStorage[cacheKey(method, path)] = JSON.stringify({ data: value, timestamp: now() });
    }
  }

  function cacheKey(method, path) {
    return [prefix, method, path].join(":");
  }
}