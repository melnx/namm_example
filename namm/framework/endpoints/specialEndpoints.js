module.exports = function(namm){

    require("../auth/isAuthenticated")(namm);

    this.setupSpecialEndpoints = function setupSpecialEndpoints(){
        var app = namm.app;

        app.get('/client.js', isAuthenticated, function(req,res){
            res.sendFile( __dirname + '/public/client.js');
        });

        app.get('/sockjs.js', isAuthenticated, function(req,res){
            console.log("SOCKJS", __dirname);
            res.sendFile( __dirname + '/public/sockjs.js');
        });

        app.get('/_models.js', isAuthenticated, require('../webapp/modelsjs')(namm));

        app.get('/views/:entity/:view', isAuthenticated, require('../webapp/views')(namm));
    }

    return {
        setupSpecialEndpoints: setupSpecialEndpoints
    }
}