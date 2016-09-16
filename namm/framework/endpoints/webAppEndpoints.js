module.exports = function(namm){

    require("../auth/isAuthenticated")(namm);

    this.setupModelWebAppEndpoints = function setupModelWebAppEndpoints(modelName) {
        var app = namm.app;

        //send layout file for the SPA
        var index = function(req, res) {
            res.sendFile(namm.layoutPath);
        };

        //view routes (in case the user refreshers the browser)
        app.get('/' + modelName, isAuthenticated, index);
        app.get('/' + modelName + 's', isAuthenticated, index);
        app.get('/' + modelName + 's/:id', isAuthenticated, index);
        app.get('/' + modelName + 's/:id/:action', isAuthenticated, index);
    }

    return {
        setupModelWebAppEndpoints: setupModelWebAppEndpoints
    }
}