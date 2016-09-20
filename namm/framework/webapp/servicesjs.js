module.exports = function(namm){
    var mongoose = require("mongoose");
    var _ = require("underscore");

    var debug = namm.debug;
    var services = namm.serviceList;

    var _servicesjs = null;

    return function(req,res){

        _servicesjs = "__services = {\n";
        for(var servicePath in services){
            var service = services[servicePath];
            //console.log(Object.keys(service));
            //_servicesjs += "hi";
            for(var serviceName in service){
                if(serviceName == "$path") continue;
                _servicesjs += serviceName + " : " + service[serviceName].toString() + ",\n";
            } ;
        };
        _servicesjs += "}\n";

        res.send(_servicesjs);
    }
}