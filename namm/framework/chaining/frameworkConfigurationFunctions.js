module.exports = function(exports){

    var routes = exports.routeList;
    var resources = exports.resources;
    require("../util/util")();

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
}