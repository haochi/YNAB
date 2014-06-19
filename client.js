function Client(settings){
  this.dropbox = new Dropbox.Client(settings);

  this.load = function (path, method){
    var deferred = new $.Deferred;
    this.dropbox[method](path, function(error, data) {
      if (error) {
        deferred.reject(error);
      }else{
        deferred.resolve(data);
      }
    });
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
}