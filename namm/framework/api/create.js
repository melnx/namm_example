var _ = require('underscore');
var mongoose = require('mongoose');

module.exports = function(modelName, namm){

    var debug = namm.debug;
    var resources = namm.resources;
    var modelProperties = resources[modelName];
    var model = mongoose.model(modelName);
    this[modelName] = model;

    return  function(req, res) {

        require('./util/access.js')(modelName, namm);

        var access = getRoleAccess(req, 'create');

        if(debug){ console.log(modelName + '/create Access ' + access); }

        var privateAccess = hasPrivateAccess(req, 'create');
        if (!access) return;

        function getDocument(raw, bulk){

            var obj = {
                created: new Date(),
                updated: new Date()
            };
            var originalOwner = raw.__owner;
            if(debug){ console.log("ORIGINAL OWNER: " + raw.__owner); }
            var result = obj;

            Object.keys(raw).forEach(function(key) {
                if (!privateAccess && modelProperties[key] && modelProperties[key]['$private']) return;

                if(bulk && modelProperties[key] && modelProperties[key].ref){
                    if(typeof raw[key] == 'string'){
                        result[key] = mongoose.Types.ObjectId(raw[key]);
                    }else{
                        result[key] = mongoose.Types.ObjectId(raw[key]._id);
                    }
                }else{
                    result[key] = raw[key];
                }
            });

            addAccessLimiterToQuery(result, modelProperties, req);
            if(originalOwner) result.__owner = originalOwner;

            if(debug){ console.log("CREATE FINAL OBJECT " + modelName + " :", result); }
            return result;
        }

        if(Array.isArray(req.body)){
            if(debug){ console.log("BATCH INSERT"); }
            var documents = [];
            req.body.forEach(function(raw){
                documents.push(getDocument(raw, true));
            });
            this[modelName].collection.insert(documents, function(err, docs){
                if(err){
                    console.log(err);
                    res.send(err);
                }else{
                    if(debug){ console.log("created batch"); }
                    res.send(docs);
                }
            });
        }else{
            if(debug){ console.log("SINGLE INSERT"); }
            var document = getDocument(req.body);
            var instance = new this[modelName](document);
            instance.save(function(err) {
                if (err) {
                    console.log(err);
                    res.send(err);
                } else {
                    if(debug){ console.log('created'); }
                    res.send(instance);
                }
            });
        }
    }
}