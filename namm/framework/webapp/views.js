module.exports = function(namm){

    var fs = require("fs");

    var debug = namm.debug;
    var partialsPath = namm.partialsPath;
    var staticPath = namm.staticPath;
    var config = namm.configuration;

    return function(req, res) {

        var entity = req.param('entity');
        var view = req.param('view');
        var dir = config.clientside_framework == "react" ? "partials_react" : "partials";


        var path = (partialsPath ? partialsPath : staticPath + '/' + dir) + '/' + entity.toLowerCase() + "/" + view;

        if(debug){ console.log('Loading View: ' + path); }

        fs.exists(path, function(exists) {

            if (exists) {
                res.sendFile(path);
            } else {
                path = __dirname + '/partials/generic/' + view;

                if(debug){ console.log('Loading Generic View: ' + path); }
                res.sendFile(path);
            }
        });
    }
}