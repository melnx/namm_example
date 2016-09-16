require("colors");

module.exports = function(modelName, namm){

    var debug = namm.debug;
    var resources = namm.resources;
    var modelProperties = resources[modelName];

    this.isDate = function isDate(date) {
        return ( (new Date(date) !== "Invalid Date" && !isNaN(new Date(date)) ));
    }

    this.isJson = function isJson(str){
        return str.length && (str[0] == '{' || str[0] == '[');
    }

    function prepareMongoQueryHelper(q){
        /*
         '_agent',
         'null',
         '{"created":{"$gt":"2005-01-17T08:12:32.062Z"}}' ]*/
        if(!q) return;


        Object.keys(q).forEach(function(k){
            if(typeof q[k] == "string"){
                if(q[k] == "null"){ q[k] = null; }
                else if(q[k] == "undefined"){ q[k] = undefined; }
                else if(q[k] == "true"){ q[k] = true; }
                else if(q[k] == "false"){ q[k] = false; }
                //else if(q[k].length == 24){q[k] = mongoose.Types.ObjectId(q[k]);}
                else if( isDate(q[k]) ){ q[k] = new Date(q[k]); }
                else if(q[k][0] == "{" || q[k][0] == '['){
                    q[k] = JSON.parse(q[k]);
                }
            }else if(q[k] instanceof Object){
                prepareMongoQueryHelper(q[k]);
            }
        });

    }

    this.prepareMongoQuery = function prepareMongoQuery(q){
        return prepareMongoQueryHelper(prepareMongoQueryHelper(q));
    }


    this.mongoResultsToObjects = function mongoResultsToObjects(result){
        var newResult = [];

        result.forEach(function(item){
            var newItem = item.toObject();
            newResult.push(newItem);
        });

        return newResult;
    }

    this.arrayContains = function arrayContains(array, item){
        var result = false;
        array.forEach(function(i){
            if(i.toString() == item.toString()){
                result = true;
            }
        });
        return result;
    }


    this.autoPopulate = function autoPopulate(query){
        Object.keys(modelProperties).forEach(function(i) {
            if(modelProperties[i][0] && modelProperties[i][0].ref){
                if(debug){ console.log(modelName + " AUTO POPULATE ARRAY " + i); }
                query.populate(i);
            }else if (modelProperties[i].ref) {
                if(debug){ console.log(modelName + " AUTO POPULATE " + i); }
                query.populate(i);
            }
        });

        query.populate('__owner');
    }

    return {
        isDate: isDate,
        isJson: isJson,

        prepareMongoQuery: prepareMongoQuery,
        mongoResultsToObjects: mongoResultsToObjects,
        arrayContains: arrayContains,

        autoPopulate: autoPopulate,
    }
}