module.exports = function(namm){

    require("../auth/isAuthenticated")(namm);

    this.setupCustomEndpoints = function setupCustomEndpoints(){
        var routes = namm.routeList;
        var app = namm.app;

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

    module.exports = {
        setupCustomEndpoints: setupCustomEndpoints
    }
}