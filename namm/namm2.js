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
exports.connectorList = connectors;

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

    var http_port = process.env.PORT || exports.configuration.port;

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

require("./framework/chaining/frameworkConfigurationFunctions")(exports);

//##################################################################
//## ACTUALLY INITIALIZE APP BY CALLING ALL THE HELPER FUNCTIONS
//##################################################################

function init(models) {
    initAppIfNeeded();

    app.use(flash());
    app.use(bodyParser.urlencoded({extended: true}));
    app.use(bodyParser.json());
    if(exports.faviconPath){
        app.use(favicon(exports.faviconPath));
    }
    app.set('view engine', 'ejs');
    app.set('views', exports.viewPath);

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

    if(exports.stripeOptions){
        require("./framework/payments/setupStripeRoutes")(exports);
    }

    setupModels();
    setupModelsEndpoints();

    setupSpecialEndpoints();

    setupCustomEndpoints();

    app.use(express.static(exports.staticPath));

    var server = http.createServer(app);
    exports.server = server;

    if(exports.useSockets){
        require("./framework/sockets/setupSockets")(exports.server, exports);
    }

    startServer(exports.app, exports.server);

    return exports;
}

exports.init = init;


module.exports = exports;
