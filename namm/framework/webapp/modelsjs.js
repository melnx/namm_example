module.exports = function(namm){
    var mongoose = require("mongoose");
    var _ = require("underscore");

    var debug = namm.debug;
    var resources = namm.resources;
    var shared = namm.shared;
    var config = namm.configuration;

    var _modelsjs = null;

    return function(req, res) {

        var User = mongoose.model('User');
        var query = User.findById(req.user._id);
        var modelName = 'User';
        var modelProperties = resources[modelName];
        Object.keys(modelProperties).forEach(function(i) {
            if(modelProperties[i][0] && modelProperties[i][0].ref){
                if(debug){ console.log(modelName + " AUTO POPULATE ARRAY " + i); }
                query.populate(i);
            }else if (modelProperties[i].ref) {
                if(debug){ console.log(modelName + " AUTO POPULATE " + i); }
                query.populate(i);
            }
        });

        query.exec(function(err, user){
            var js = null;

            if(_modelsjs){
                js = _modelsjs;
            }else{
                js =  "__models = {";
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

                _modelsjs = js;
            }

            if(req.user){
                var clone = _.clone(user.toObject());
                delete clone.password;
                js += "\n__user = ";
                js += JSON.stringify(clone);
            }

            res.send(js);
        });
    }
}