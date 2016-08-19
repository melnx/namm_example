// Utilities
var mongoose = require('mongoose');
var express = require('express');
var config = require('./config.js');
var path = require('path');
var flash = require('express-flash');
var bodyParser = require('body-parser');
var _ = require('underscore');
var fs = require('fs');
var util = require('util');
var async = require("async");
var favicon = require("serve-favicon");

// Subsystems
var authUtil = require('./setupAuthentication');
var setupAuthentication = authUtil.setupAuthentication;
var setupUserModel = authUtil.setupUserModel;

Schema = mongoose.Schema;
var exports = {};
var app = null;
var resources = [];
var routes = [];
var connectors = [];
var debug = true;
var shared = null;

var stripeOptions = null;

exports.resources = resources;

function connectToDatabase() {
  var mongoConn = process.env.MONGOLAB_URI || config.mongooseTestConn;
  var actualConn = mongoose.connect(mongoConn);
  console.log('MONGO: ' + mongoConn);
  console.log(actualConn.connections);
  debug = !process.env.MONGOLAB_URI;
  console.log("DEBUG: " + debug);
}

function setupModel(controllerName, model) {
  // Use the schema to register a model with MongoDb
  //if(mongoose.model(controllerName)) return;

  if (controllerName == 'User') {
    return;
  }

  var clone = _.clone(model);

  if (!clone.$public) {
    clone.__owner = {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true
    };
  }

  var indexes = clone.$index;


  Object.keys(clone).forEach(function(property) {
    if (property[0] == '$') {
      delete clone[property];
    }
  });

  mongoose.model(controllerName, new Schema(clone));

  if(indexes){
    var schema = mongoose.model(controllerName);

    indexes.forEach(function(index){
      console.log("INDEX FOR " + controllerName + ": ", index);
      schema.collection.ensureIndex(index);
    });
  }


}

// As with any middleware it is quintessential to call next()
// if the user is authenticated
var isAuthenticated = function(req, res, next) {
  if (req.isAuthenticated())
    return next();
  res.redirect('/');
}

function setupEndpoints(modelName, modelProperties) {

  var model = mongoose.model(modelName);
  this[modelName] = model;

  var index = function(req, res) {
    var file = config.clientside_framework == "react" ? "base_react.html" : "base.html";
    res.sendFile(path.join(__dirname, '/public/' + file));
  };

  function addAccessLimiterToQuery(q, modelProperties, req) {
    if (modelName == 'User') {
      q._id = req.user._id;
      return;
    }

    if (!modelProperties.$public) {
      q.__owner = req.user._id;
    }
  }

  //view routes
  app.get('/' + modelName, isAuthenticated, index);
  app.get('/' + modelName + 's', isAuthenticated, index);
  app.get('/' + modelName + 's/:id', isAuthenticated, index);
  app.get('/' + modelName + 's/:id/:action', isAuthenticated, index);

  //data route access determination
  function getRoleAccess(req, action) {

    var user = req.user;
    var roleName = user.role;
    if (!roleName) {
      roleName = 'user';
    }

    var access = modelProperties['$access'];
    var roleAccess = null;
    if (access) {
      roleAccess = access[roleName];
    }

    if (!roleAccess) {
      roleAccess = {
        list: 'own',
        count: 'own',
        create: true,
        get: 'own',
        update: 'own',
        delete: 'own',
        reduce: 'own',
      };
      if (modelName == 'User') roleAccess.create = false;
    }
    return roleAccess[action];
  }

  function hasPrivateAccess(req, action) {
    var privateAccess = getRoleAccess(req, '$private');

    return privateAccess == 'all' || privateAccess == "*" || (privateAccess && privateAccess.indexOf(action) >= 0);
  }

  function cleanItem(item, hiddenProperties){
      hiddenProperties.forEach(function(k){
         item[k] = null;
      });

      if(item.__owner){
          item.__owner.password = null;
          item.__owner.email = null;
          item.__owner.phone = null;
          item.__owner.fullName = null;
          item.__owner.username = null;
      }
  }
  function cleanResult(req, result){
      var hiddenProperties = [];
      Object.keys(modelProperties).forEach(function(key){
          if(modelProperties[key].$hidden && req.user.role != "admin"){
              hiddenProperties.push(key);
          }
          if(modelProperties[key].$internal){
              hiddenProperties.push(key);
          }
      });

      if(result instanceof Array){
          result.forEach(function(i){
              cleanItem(i, hiddenProperties);
          });
      }else{
          cleanItem(result, hiddenProperties);
      }
  }

  function isDate(date) {
        return ( (new Date(date) !== "Invalid Date" && !isNaN(new Date(date)) ));
  }

  function isJson(str){
      return str.length && (str[0] == '{' || str[0] == '[');
  }

  function prepareMongoQueryHelper(q){
      /*
          '_agent',
          'null',
          '{"created":{"$gt":"2005-01-17T08:12:32.062Z"}}' ]*/
    if(!q) return;


    Object.keys(q).forEach(function(k){
      if(typeof q[k] == "string"){
        if(q[k] == "null"){ q[k] = null; }
        else if(q[k] == "undefined"){ q[k] = undefined; }
        else if(q[k] == "true"){ q[k] = true; }
        else if(q[k] == "false"){ q[k] = false; }
        //else if(q[k].length == 24){q[k] = mongoose.Types.ObjectId(q[k]);}
        else if( isDate(q[k]) ){ q[k] = new Date(q[k]); }
        else if(q[k][0] == "{" || q[k][0] == '['){
            q[k] = JSON.parse(q[k]);
        }
      }else if(q[k] instanceof Object){
        prepareMongoQueryHelper(q[k]);
      }
    });

  }

  function prepareMongoQuery(q){
      return prepareMongoQueryHelper(prepareMongoQueryHelper(q));
  }


  function getCounts(modelName, groupByField, q, callback, ids){

      var model = mongoose.model(modelName);

      var match = q ? (typeof q == "string" ? JSON.parse(q) : q) : {};

      if(ids){
          match[groupByField] = {$in: ids};
      }

      //DO RECURSIVE CHECK ON ALL STRINGS THAT ARE DATES AND CONVERT THEM DYNAMICALLY
      //match.created.$gt = new Date(match.created.$gt);
      prepareMongoQuery(match);

      if(debug){ console.log("COUNT MATCH: ", JSON.stringify(match)); }

      var aggregate = {$sum: 1};
      var agg = [
          {$match: match},
          {$group: {
              _id: "$" + groupByField,
              total: aggregate
          }}
      ];

      var query = model.aggregate(agg);

      query.exec(function(err, result) {
          callback(result);
          //console.log(result);
      });

  }

  function mongoResultsToObjects(result){
      var newResult = [];

      result.forEach(function(item){
          var newItem = item.toObject();
          newResult.push(newItem);
      });

      return newResult;
  }

  function arrayContains(array, item){
      var result = false;
      array.forEach(function(i){
          if(i.toString() == item.toString()){
              result = true;
          }
      });
      return result;
  }

  function hydrateCounts(result, $count, counts){


      var associateBy = $count[2];

      result.forEach(function(item){
          if(counts){ counts.forEach(function(count){
              if(!associateBy || associateBy == 'null'){
                  if(count._id && item._id && count._id.toString() == item._id.toString()){
                      var countKey = $count[4] || ($count[0] + $count[1] + "$count");
                      //if(debug){ console.log(countKey); }
                      item[countKey] = count.total;
                  }
              }else if(item[associateBy] && count._id){
                  //console.log( JSON.stringify(item[associateBy]) + " contains " + count._id);
                  //console.log("IS ARRAY?", item[associateBy] instanceof Array, " INDEX:", arrayContains(item[associateBy], count._id) );

                  if( (item[associateBy] instanceof Array && arrayContains(item[associateBy], count._id)) ||
                      item[associateBy].toString() == count._id.toString()
                  ){
                      //console.log("YES");
                      var countKey = $count[4] || ($count[0] + $count[1] + $count[2] + "$count");
                      //if(debug){ console.log(countKey); }
                      if(item[countKey]){
                          //console.log("INCREMENT COUNT");
                          item[countKey] += count.total;
                      } else {
                          item[countKey] = count.total;
                      }
                  } else{
                      //console.log("NO");
                  }
              }
          });}
      })
      return result;
  }

  function computeCounts(result, _count, cb, ids){
      if(debug){ console.log("parsing count params", _count); }
      var $count = typeof _count == "string" ? JSON.parse(_count) : _count;

      var newResult = mongoResultsToObjects(result);

      if($count instanceof Array){
          getCounts($count[0], $count[1], $count[3], function(counts){
              hydrateCounts(newResult, $count, counts);
              cb(null, newResult);
          }, $count[2] ? null : ids);
      }else{
          async.forEach(Object.keys($count), function (countKey, callback){
              var $countItem = $count[countKey];
              $countItem[4] = countKey;

              getCounts($countItem[0], $countItem[1], $countItem[3], function(counts){
                  hydrateCounts(newResult, $countItem, counts);
                  callback();
              }, $countItem[2] ? null : ids);
          }, function(err) {
              cb(err, newResult);
          });
      }
  }

  //$internal HIDDEN FROM ALL
  //$hidden HIDDEN FROM NON-ADMINS

  //data routes

  //list()
  app.get('/' + modelName + '/list', isAuthenticated, function(req, res) {

    var access = getRoleAccess(req, 'list');
    if(debug){ console.log(modelName + "/list Access: " + access + " [" + req.user.username + "]"); }
    if (!access){ res.status(500).end('Permission Denied'); return; }

    var privateAccess = hasPrivateAccess(req, 'list');
    if(debug){ console.log("PrivateAccess: " + privateAccess); }

    var q = {};

    if(debug){ console.log("Keys:"); }
    var _populate = null;
    var _count = null;

    Object.keys(req.query).forEach(function(key) {
      if (!privateAccess && modelProperties[key] && modelProperties[key]['$private']) return;

      if(key=='$populate'){
          _populate = req.query[key];
          return;
      }
      if(key=="$count"){
          _count = req.query[key];
          return;
      }
      if(key[0] == '$' && key != '$or') return;

      if(modelProperties[key] && modelProperties[key].ref){
          q[key] = mongoose.Types.ObjectId(req.query[key]);
      }else{

          if(req.query[key][0] == '{' || req.query[key][0] == '['){
              q[key] = JSON.parse(req.query[key]);
          }else{
              q[key] = req.query[key];
          }
      }

      if(debug){ console.log(typeof q[key]); console.log(key + ": " + q[key]); }
    });

    if (access != 'all') addAccessLimiterToQuery(q, modelProperties, req);

    prepareMongoQuery(q);

    if(debug){ console.log("FINAL QUERY: ", JSON.stringify(q)); }

    if(req.query['$limit']){
        var count_query = model.count(q);
        count_query.exec(function(err, count){
            if(err){
                res.send(err);
                return;
            }
            var query = model.find(q);

            if(req.query['$skip']){
                if(debug){ console.log("SKIP: " + req.query['$skip']); }
                query.skip(req.query['$skip']);
            }
            if(req.query['$limit']){
                if(debug){ console.log("LIMIT: " + req.query['$limit']); }
                query.limit(req.query['$limit']);
            }
            if(req.query['$sort']){
                var sort = req.query['$sort'].length && isJson(req.query['$sort']) ? JSON.parse(req.query['$sort']) : req.query['$sort'];
                if(debug){ console.log("SORT: ", sort); }
                query.sort(sort);
            }

            Object.keys(modelProperties).forEach(function(i) {
                if (modelProperties[i].ref) {
                    if(debug){ console.log(modelName + " AUTO POPULATE " + i); }
                    query.populate(i);
                }
            });

            query.populate('__owner');

            query.exec(function(err, result) {
                /*res.send({
                    count: count,
                    list: result
                });*/

                //result.unshift({count:count});

                cleanResult(req, result);

                if(_count){
                    computeCounts(result, _count, function(err, newResult){
                        if(!err && newResult && newResult.length){
                            newResult[0].$count = count;
                        }
                        res.send(err || newResult);
                    }, _.pluck(result, '_id'));
                }else{
                    if(result && result.length){
                        var obj = result[0].toObject();
                        obj.$count = count;
                        result[0] = obj;
                    }
                    res.send(result);
                }
                //console.log(result);
            });
        })
    }else{
        var query = model.find(q);

        Object.keys(modelProperties).forEach(function(i) {
          if (modelProperties[i].ref) {
            if(debug){ console.log(modelName + " AUTO POPULATE " + i); }
            query.populate(i);
          }
        });

        query.populate('__owner');

        if(req.query['$sort']){
            var sort = req.query['$sort'].length && req.query['$sort'][0] == '{' ? JSON.parse(req.query['$sort']) : req.query['$sort'];
            query.sort(sort);
        }

        query.exec(function(err, result) {
          cleanResult(req, result);

          if(_count){
              computeCounts(result, _count, function(err, newResult){
                  res.send(err || newResult);
              });
          }else{
              if(debug) console.log("RESULT LENGTH:", result.length);
              res.send(result);
          }

          //console.log(result);
        });
    }
  });

  //count()
  app.get('/' + modelName + '/count', isAuthenticated, function(req, res) {

    var access = getRoleAccess(req, 'count');
    if(debug){ console.log(modelName + "/count Access: " + access + " [" + req.user.username + "]"); }
    if (!access) { res.status(500).end('Permission Denied'); return; }

    var privateAccess = hasPrivateAccess(req, 'count');
    if(debug){ console.log("PrivateAccess: " + privateAccess); }

    var q = {};

    if(debug){ console.log("Keys:"); }
    var _populate = null;

    Object.keys(req.query).forEach(function(key) {
      if (!privateAccess && modelProperties[key] && modelProperties[key]['$private']) return;

      if(key=='$populate'){
          _populate = req.query[key];
          return;
      }

      if(modelProperties[key] && modelProperties[key].ref){
          q[key] = mongoose.Types.ObjectId(req.query[key]);
      }else{
          if(req.query[key][0] == '{'){
              q[key] = JSON.parse(req.query[key]);
          }else{
              q[key] = req.query[key];
          }
      }

      if(debug){ console.log(key + ": " + q[key]); }
    });

    if (access != 'all') addAccessLimiterToQuery(q, modelProperties, req);

    if(debug){ console.log("FINAL QUERY:", q); }

    var query = model.count(q);

    query.exec(function(err, count) {
      if(err){
          res.end(JSON.stringify(err));
      }else{
          res.end(JSON.stringify(count));
      }
    });
  });

  //load()
  app.get('/' + modelName + '/get/:id', isAuthenticated, function(req, res) {

    var access = getRoleAccess(req, 'get');
    if(debug){ console.log(modelName + "/get/:id Access: " + access + " [" + req.user.username + "]"); }
    if (!access) { res.status(500).end('Permission Denied'); return;}

    var q = {
      _id: req.param('id')
    };

    if (access != 'all') addAccessLimiterToQuery(q, modelProperties, req);

    if(modelName == "User" && q._id == "0"){ q._id = req.user._id; }


    var query = model.findOne(q);

    if(debug){ console.log("GET QUERY: ", q); }

    Object.keys(modelProperties).forEach(function(i) {
        if (modelProperties[i].ref) {
          if(debug){ console.log(modelName + " AUTO POPULATE " + i); }
          query.populate(i);
        }
    });

    query.exec(function(err, result) {

      cleanResult(req, result);

      res.send(result);
    });
  });

  //save()
  app.post('/' + modelName + '/update/', isAuthenticated, function(req, res) {

    var access = getRoleAccess(req, 'update');
    var privateAccess = hasPrivateAccess(req, 'update');
    if (!access) {res.status(500).end('Permission Denied'); return; }

    if(debug){ console.log(modelName + " /update Update request:" + req.body._id); }

    var q = {
      _id: req.body._id
    };
    if (access != 'all') addAccessLimiterToQuery(q, modelProperties, req);
    var problems = [];

    model.findOne(q).exec(function(err, result) {

      if (result) {
        if(debug){ console.log(req.body); }
        Object.keys(req.body).forEach(function(key) {
          if( modelProperties[key] ){
              if ( !privateAccess && modelProperties[key]['$private'] ) return;
              if ( modelProperties[key]['$internal'] ) return;
              if ( modelProperties[key]['$hidden'] && req.user.role != "admin" ) return;

              if ( modelProperties[key]['$immutable'] && result[key] ){
                  if( (typeof req.body[key] == "string" && result[key] != req.body[key] ) ||
                      (req.body[key] && result[key] != req.body[key]["_id"]) ){
                      problems.push("not allowed to overwrite " + key + " with a new value once it's set"); return;
                  }
              }
          }

          //console.log("[" + key + "] " + result[key] + " = " + req.body[key]);
          result[key] = req.body[key];
        });

        result['updated'] = new Date();

        if(problems.length){
            res.status(401).send(problems);
            return;
        }

        result.save(function(err) {
          if (err) {
            console.log(err)
          } else {
            if(debug){ console.log('saved'); }
            res.send(result);
          }
        })

      } else {
        if(debug){ res.send('item not found'); }
      }
    });
  });

  //create()
  app.post('/' + modelName + "/create", isAuthenticated, function(req, res) {

    var access = getRoleAccess(req, 'create');

    if(debug){ console.log(modelName + '/create Access ' + access); }

    var privateAccess = hasPrivateAccess(req, 'create');
    if (!access) return;

    function getDocument(raw, bulk){

        var obj = {
          created: new Date(),
          updated: new Date()
        };
        var originalOwner = raw.__owner;
        if(debug){ console.log("ORIGINAL OWNER: " + raw.__owner); }
        var result = obj;

        Object.keys(raw).forEach(function(key) {
          if (!privateAccess && modelProperties[key] && modelProperties[key]['$private']) return;

          if(bulk && modelProperties[key] && modelProperties[key].ref){
            if(typeof raw[key] == 'string'){
                result[key] = mongoose.Types.ObjectId(raw[key]);
            }else{
                result[key] = mongoose.Types.ObjectId(raw[key]._id);
            }
          }else{
            result[key] = raw[key];
          }
        });

        addAccessLimiterToQuery(result, modelProperties, req);
        if(originalOwner) result.__owner = originalOwner;

        if(debug){ console.log("CREATE FINAL OBJECT " + modelName + " :", result); }
        return result;
    }

    if(Array.isArray(req.body)){
        if(debug){ console.log("BATCH INSERT"); }
        var documents = [];
        req.body.forEach(function(raw){
            documents.push(getDocument(raw, true));
        });
        this[modelName].collection.insert(documents, function(err, docs){
            if(err){
                console.log(err);
                res.send(err);
            }else{
                if(debug){ console.log("created batch"); }
                res.send(docs);
            }
        });
    }else{
        if(debug){ console.log("SINGLE INSERT"); }
        var document = getDocument(req.body);
        var instance = new this[modelName](document);
        instance.save(function(err) {
          if (err) {
            console.log(err);
            res.send(err);
          } else {
            if(debug){ console.log('created'); }
            res.send(instance);
          }
        });
    }
  });

  //delete()
  app.get('/' + modelName + "/delete", isAuthenticated, function(req, res) {
    var access = getRoleAccess(req, 'delete');

    if(debug){ console.log(modelName + "/delete Access: " + access + " [" + req.user.username + "]"); }
    if (!access) {res.status(500).end('Permission Denied'); return; }

    var q = {
      _id: req.param('id')
    };
    if (access != 'all') addAccessLimiterToQuery(q, modelProperties, req);

    model.remove(q, function(err) {
      if (err) {
        res.send(err);
      } else {
        res.send('success');
      }
    });
  });

  //reduce()
  app.get('/' + modelName + '/reduce', isAuthenticated, function(req, res) {

    var access = getRoleAccess(req, 'reduce');
    if(debug){ console.log(modelName + "/reduce Access: " + access + " [" + req.user.username + "]"); }
    if (!access){ res.status(500).end('Permission Denied'); return; }

    var privateAccess = hasPrivateAccess(req, 'reduce');
    if(debug){ console.log("PrivateAccess: " + privateAccess); }

    var q = {};

    if(debug){console.log("Keys:"); }
    var _populate = null;

    Object.keys(req.query).forEach(function(key) {
      if (!privateAccess && modelProperties[key] && modelProperties[key]['$private']) return;
      if(key[0] == '$') return;

      if(modelProperties[key] && modelProperties[key].ref){
          q[key] = mongoose.Types.ObjectId(req.query[key]);
      }else{
          if(req.query[key][0] == '{'){
              q[key] = JSON.parse(req.query[key]);
          }else{
              q[key] = req.query[key];
          }
      }

      console.log(key + ": " + q[key]);
    });

    if (access != 'all') addAccessLimiterToQuery(q, modelProperties, req);

    if(debug){ console.log("FINAL QUERY: ", q); }

    var groupBy = req.query.$groupBy;
    if(groupBy && groupBy.length && groupBy[0] == '{'){
        groupBy = JSON.parse(groupBy);
    }
    if(debug){ console.log("GROUPBY:",groupBy); }

    var aggregate = {$sum: 1};
    var agg =[
      {$match: q},
      {$group: {
          _id: groupBy,
          total: aggregate
      }}
    ];

    var query = model.aggregate(agg);

    query.exec(function(err, result) {
      res.send(result);
      //console.log(result);
    });

  });
}

function startServer(app) {

  var http_port = process.env.PORT || config.port;

  var server = app.listen(http_port, function() {
    var host = server.address().address;
    var port = server.address().port;

    console.log('Banzai app listening at http://%s:%s', host, port);
  });
}

function setupModels(){
    Object.keys(resources).forEach(function(modelName) {
        setupModel(modelName, resources[modelName]);
    });
}

function setupModelsEndpoints(){
    Object.keys(resources).forEach(function(modelName) {
        setupEndpoints(modelName, resources[modelName]);
    });
}

function initAppIfNeeded(){
    if(!app){
        app = express();
    }
}

exports.nothing = function(stuff){};
exports.setupModels = setupModels;
exports.setupEndpoints = setupEndpoints;
exports.startServer = startServer;


///////////////////////////////////////////////////////////////
function route(method, endpoint, handler, $public){
    var params = {method: method, endpoint: endpoint, handler:handler};
    if($public) params.$public = true;

    routes[method + "|" + endpoint] = params;
    return exports;
}

function get(endpoint, handler, $public){
    return route('get', endpoint, handler, $public);
}
function post(endpoint, handler, $public){
    return route('post', endpoint, handler, $public);
}

exports.get = get;
exports.post = post;

function load_directory(path, target, nested){

    var items = fs.readdirSync(path);

    for (var i=0; i<items.length; i++) {
        var decls = require(path + '/' + items[i]);
        if(nested){
            var sub = {};
            Object.keys(decls).forEach(function(key){ sub[key] = decls[key]; })
            sub.$path = path + '/' + items[i];
            target[items[i].replace(".js","")] = sub;
        }else{
            Object.keys(decls).forEach(function(key){ target[key] = decls[key]; })
        }
    }

    console.log( path + ":", Object.keys(target));

    return exports;
}

function require_routes(path){
    var raw_routes = {};
    load_directory(path, raw_routes);
    Object.keys(raw_routes).forEach(function(route){
       var parts = route.split(' ');
       var method = parts.length == 2 ? parts[0].toLowerCase() : "get";
       var endpoint = parts[parts.length-1];
       var route = {method:method, endpoint:endpoint, handler:raw_routes[route]};
       routes.push(route)
    });
    return exports;
}

exports.routes = require_routes;

function require_path(path){
    load_directory(path, resources);
    return exports;
}

exports.require = require_path;

function require_connectors(path){
    load_directory(path, connectors, true);
    console.log("CONNECTORS");
    console.log(connectors);
    return exports;
}

exports.connectors = require_connectors;

///////////////////////////////////////////////////////////////

function setupCustomEndpoints(){
    Object.keys(routes).forEach(function(key){
        var route = routes[key];
        console.log(route);

        if(!route.$public){
            app[route.method](route.endpoint, isAuthenticated, route.handler);
        }else{
            app[route.method](route.endpoint, route.handler);
        }
    });
}

function setupSpecialEndpoints(){
    app.get('/_models.js', isAuthenticated, function(req, res) {
        var js = "__models = {";
        Object.keys(resources).forEach(function(modelName) {
            js += "\n    " + modelName + " : { " ;

            if(config.clientside_framework == "react"){
                js += "nothing:null,";
            }else{
                js += "$init : ";

                if (resources[modelName].$init) {
                    js += resources[modelName].$init + ",";
                } else {
                    js += 'null,';
                }
            }

            js += "\n    },"

        });

        js += "\n}"

        if(shared){
            js += "\n__shared = ";
            js += JSON.stringify(shared);
        }

        if(req.user){
            var clone = _.clone(req.user.toObject());
            delete clone.password;
            js += "\n__user = ";
            js += JSON.stringify(clone);
        }

        res.send(js);
    });

    app.get('/views/:entity/:view', isAuthenticated, function(req, res) {

        var entity = req.param('entity');
        var view = req.param('view');
        var dir = config.clientside_framework == "react" ? "partials_react" : "partials";


        var path = __dirname + '/public/' + dir +'/' + entity.toLowerCase() + "/" + view;

        if(debug){ console.log('Loading View: ' + path); }

        fs.exists(path, function(exists) {

            if (exists) {
                res.sendFile(path);
            } else {
                path = __dirname + '/public/' + dir + '/generic/' + view;

                if(debug){ console.log('Loading Generic View: ' + path); }
                res.sendFile(path);
            }
        });
    });
}

function stripe(options){
    stripeOptions = options;
    return exports;
}
exports.stripe = stripe;

function init(models) {
  initAppIfNeeded();

  app.use(flash());
  app.use(bodyParser.urlencoded({extended: true}));
  app.use(bodyParser.json());
  app.use(favicon(__dirname + '/public/img/favicon.ico'));
  app.set('view engine', 'ejs');
  app.set('views', __dirname + '/views');

   //console.log(mongoose.model('User').schema.tree);
  if(models){
    Object.keys(models).forEach(function(modelName) {
      resources[modelName] = models[modelName];
    });
  }

  if (!resources.User) {
    resources.User = {};
  }

  connectToDatabase();

  setupUserModel(resources.User);
  setupAuthentication(app);

  if(stripeOptions){
    var userSchema = mongoose.model('User');
    var stripeCustomer = require('./stripeCustomer');
    userSchema.plugin(stripeCustomer, stripeOptions);
    var setupStripe = require('./setupStripe');
    app.post('/billing/updateBilling', isAuthenticated, setupStripe.postBilling);
    app.post('/billing/updatePlan', isAuthenticated, setupStripe.postPlan);
  }

  setupModels();
  setupModelsEndpoints();

  setupSpecialEndpoints();

  setupCustomEndpoints();

  app.use(express.static(__dirname + '/public/'));

  startServer(app);

  return exports;
}

exports.init = init;

function share(data){
    shared = data;
    return exports;
}

exports.share = share;

module.exports = exports;
