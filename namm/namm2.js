// Utilities
var mongoose = require('mongoose');
var express = require('express');
var config = null;
var path = require('path');
var flash = require('express-flash');
var bodyParser = require('body-parser');
var _ = require('underscore');
var fs = require('fs');
var util = require('util');
var async = require("async");
var favicon = require("serve-favicon");
var colors = require('colors');
var http = require('http');

// Subsystems
var authUtil = require('./framework/auth/setupAuthentication');
var setupAuthentication = authUtil.setupAuthentication;
var setupUserModel = authUtil.setupUserModel;


Schema = mongoose.Schema;
var exports = {};
var app = null;
var resources = [];
var routes = [];
var connectors = [];
var connections = [];
var debug = true;

exports.debug = debug;
exports.resources = resources;
exports.socketConnections = connections;
exports.routeList = routes;

require("./framework/util/util")();
require("./framework/database/setup")(exports);
require("./framework/auth/isAuthenticated")(exports);

//##################################################################
//## SETUP THE API ENDPOINTS AND THE WEBAPP ROUTES
//##################################################################


require("./framework/endpoints/webAppEndpoints")(exports);
require("./framework/endpoints/apiEndpoints")(exports);


//##################################################################
//## SETUP MODELS, THE API, AND START SERVER
//##################################################################


function initAppIfNeeded(){
    if(!app){
        app = express();
        exports.app = app;
    }
}

function startServer(app, server) {

    var http_port = process.env.PORT || config.port;

    server.listen(http_port, function(){
        var host = server.address().address;
        var port = server.address().port;

        console.log('NAMM app listening at http://%s:%s', host, port);
    });
}

function setupModels(){
    Object.keys(resources).forEach(function(modelName) {
        setupModel(modelName, resources[modelName]);
    });
}

function setupModelEndpoints(modelName){
    setupModelWebAppEndpoints(modelName);
    setupModelApiEndpoints(modelName);
}

function setupModelsEndpoints(){
    Object.keys(resources).forEach(function(modelName) {
        setupModelEndpoints(modelName);
    });
}


//##################################################################
//## SPECIAL(Internal) AND CUSTOM ENDPOINTS
//##################################################################

require("./framework/endpoints/customEndpoints")(exports);
require("./framework/endpoints/specialEndpoints")(exports);

//##################################################################
//## CHAINING FUNCTIONS FOR CONFIGURING THE FRAMEWORK
//##################################################################

function route(method, endpoint, handler, $public){
    var params = {method: method, endpoint: endpoint, handler:handler};
    if($public) params.$public = true;

    routes[method + "|" + endpoint] = params;
    return exports;
}

exports.get = function get(endpoint, handler, $public){
    return route('get', endpoint, handler, $public);
}
exports.post = function post(endpoint, handler, $public){
    return route('post', endpoint, handler, $public);
}

exports.routes = function require_routes(path){
    var raw_routes = {};
    load_directory(path, raw_routes);
    Object.keys(raw_routes).forEach(function(route){
        var parts = route.split(' ');
        var methodSpec = parts.length == 2 ? splitToObject(parts[0].toLowerCase(),'|') : null;
        var method = methodSpec ? (methodSpec.get ? "get" : methodSpec.post ? "post" : "get") : "get";
        var isPublic = methodSpec ? (methodSpec.public ? true : false) : false;
        var endpoint = parts[parts.length-1];
        var route = {method:method, endpoint:endpoint, handler:raw_routes[route]};
        if(isPublic){
            route.$public = true;
        }
        routes.push(route)
    });
    return exports;
}

exports.require = exports.models = function require_path(path){
    load_directory(path, resources);
    return exports;
}

exports.connectors = function require_connectors(path){
    load_directory(path, connectors, true);
    console.log("CONNECTORS");
    console.log(connectors);
    exports.connectorList = connectors;
    return exports;
}

var partialsPath = null;
exports.partials = function set_partials(path){
    partialsPath = path;
    exports.partialsPath = path;
    return exports;
}

var stripeOptions = null;
exports.stripe = function stripe(options){
    stripeOptions = options;
    exports.stripeOptions = options;
    return exports;
}

var faviconPath = null;
exports.favicon = function set_favicon(path){
    faviconPath = path;
    exports.faviconPath = path;
    return exports;
}

var staticPath = null;
exports.public = function set_public(path){
    staticPath = path;
    exports.staticPath = path;
    return exports;
}

var viewPath = null;
exports.views = function set_views(path){
    viewPath = path;
    exports.viewPath = path;
    return exports;
}

var layoutPath = null;
exports.layout = function set_layout(path){
    layoutPath = path;
    exports.layoutPath = path;
    return exports;
}

var shared = null;
exports.share = function share(data){
    shared = data;
    exports.shared = shared;
    return exports;
}

exports.config = function conf(settings){
    config = settings;
    exports.configuration = config;
    return exports;
}

var useSockets = false;
exports.sockets = function use_sockets(){
    useSockets = true;
    exports.useSockets = true;
    return exports;
}

//##################################################################
//## ACTUALLY INITIALIZE APP BY CALLING ALL THE HELPER FUNCTIONS
//##################################################################

function init(models) {
    initAppIfNeeded();

    app.use(flash());
    app.use(bodyParser.urlencoded({extended: true}));
    app.use(bodyParser.json());
    if(faviconPath){
        app.use(favicon(faviconPath));
    }
    app.set('view engine', 'ejs');
    app.set('views', viewPath);

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
    setupAuthentication(app, config);

    if(stripeOptions){
        require("./framework/payments/setupStripeRoutes")(exports);
    }

    setupModels();
    setupModelsEndpoints();

    setupSpecialEndpoints();

    setupCustomEndpoints();

    app.use(express.static(staticPath));

    var server = http.createServer(app);
    exports.server = server;

    if(useSockets){
        require("./framework/sockets/setupSockets")(server, exports);
    }

    startServer(app, server);

    return exports;
}

exports.init = init;


module.exports = exports;
