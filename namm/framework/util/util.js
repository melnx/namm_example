//##################################################################
//## UTILITY FUNCTIONS FOR SPECIFYING ROUTES
//##################################################################

module.exports = function(){
    var fs = require("fs");

    this.load_directory = function load_directory(path, target, nested){

        var items = fs.readdirSync(path);

        for (var i=0; i<items.length; i++) {
            var decls = require(path + '/' + items[i]);
            if(nested){
                var sub = {};
                Object.keys(decls).forEach(function(key){ sub[key] = decls[key]; })
                sub.$path = path + '/' + items[i];
                target[items[i].replace(".js","")] = sub;
            }else{
                Object.keys(decls).forEach(function(key){ target[key] = decls[key]; })
            }
        }

        console.log( path + ":", Object.keys(target));

        return exports;
    }


    this.splitToObject = function splitToObject(string, separator){
        var result = {};

        var parts = string.split(separator);

        parts.forEach(function(p){
            result[p] = true;
        });

        return result;
    }

    return {
        load_directory: load_directory,
        splitToObject: splitToObject
    }
}