module.exports = function(namm){

    require("../auth/isAuthenticated")(namm);

    this.setupModelApiEndpoints = function setupModelApiEndpoints(modelName){

        var app = namm.app;

        //list()
        app.get('/' + modelName + '/list', isAuthenticated, require('../api/list')(modelName, namm));

        //count()
        app.get('/' + modelName + '/count', isAuthenticated, require('../api/count')(modelName, namm));

        //load()
        app.get('/' + modelName + '/get/:id', isAuthenticated, require('../api/get')(modelName, namm));

        //save()
        app.post('/' + modelName + '/update', isAuthenticated, require('../api/update')(modelName, namm));

        //create()
        app.post('/' + modelName + "/create", isAuthenticated, require('../api/create')(modelName, namm));

        //delete()
        app.get('/' + modelName + "/delete", isAuthenticated, require('../api/delete')(modelName, namm));

        //reduce()
        app.get('/' + modelName + '/reduce', isAuthenticated, require('../api/reduce')(modelName, namm));
    }


    return {
        setupModelApiEndpoints: setupModelApiEndpoints
    }
}