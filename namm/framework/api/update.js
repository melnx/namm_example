var mongoose = require('mongoose');

module.exports = function(modelName, namm){

    var debug = namm.debug;
    var resources = namm.resources;
    var modelProperties = resources[modelName];
    var model = mongoose.model(modelName);
    this[modelName] = model;

    return function(req, res) {

        require('./util/access.js')(modelName, namm);

        var access = getRoleAccess(req, 'update');
        var privateAccess = hasPrivateAccess(req, 'update');
        if (!access) {res.status(500).end('Permission Denied'); return; }

        if(debug){ console.log(modelName + " /update Update request:" + req.body._id); }

        var q = {
            _id: req.body._id
        };

        if (access != 'all') addAccessLimiterToQuery(q, modelProperties, req);
        var problems = [];

        console.log("query");
        console.log(q);


        model.findOne(q).exec(function(err, result) {

            if (result) {
                if(debug){ console.log(req.body); }
                Object.keys(req.body).forEach(function(key) {
                    if( modelProperties[key] ){
                        if ( !privateAccess && modelProperties[key]['$private'] ) return;
                        if ( modelProperties[key]['$internal'] ) return;
                        if ( modelProperties[key]['$hidden'] && result.__owner && (req.user._id.toString() != result.__owner.toString() || req.user.role != "admin") ) return;
                        if ( modelProperties[key]['$hidden'] && modelName == "User" && req.user._id.toString() != result._id.toString()) return;

                        if ( modelProperties[key]['$immutable'] && result[key] ){
                            if( typeof req.body[key] == "string" ){
                                if(result[key] != req.body[key]){
                                    problems.push("not allowed to overwrite " + key + " with a new value once it's set " + result[key] + "->" + req.body[key]); return;
                                }
                            }else{
                                if(req.body[key] && result[key] != req.body[key]["_id"]){
                                    problems.push("not allowed to overwrite " + key + " with a new reference once it's set " + result[key] + "->" + req.body[key]["_id"]); return;
                                }
                            }
                        }
                    }

                    //console.log("[" + key + "] " + result[key] + " = " + req.body[key]);
                    if(modelProperties[key]){
                        if(modelProperties[key][0] && modelProperties[key][0].ref){
                            //console.log(key + ":REF COLLECTION");
                            if(req.body[key]){
                                if(req.body[key].length){
                                    var definedIds= [];
                                    req.body[key].forEach(function(item){
                                        if(item._id){
                                            definedIds.push(item._id);
                                        }else{
                                            definedIds.push(item);
                                        }
                                    });
                                    //console.log("NONEMPTY PLUCK", definedIds);
                                    result[key] = definedIds;
                                }else{
                                    //console.log("EMPTY REF ARRAY");
                                    result[key] = [];
                                }
                            }
                        }else if(modelProperties[key].ref){
                            //console.log(key + ":REF");
                            if(typeof req.body[key] == "string"){
                                result[key] = req.body[key];
                            }else{
                                result[key] = req.body[key]._id;
                            }
                        }else{
                            //console.log(key + ":VALUE");
                            result[key] = req.body[key];
                        }
                    }
                });

                result['updated'] = new Date();

                if(problems.length){
                    res.status(401).send(problems);
                    return;
                }

                //console.log(result);

                result.save(function(err) {
                    if (err) {
                        console.log(err)
                    } else {
                        if(debug){ console.log('saved'); }
                        res.send(result);
                    }
                })

            } else {
                if(debug){ res.send('item not found'); }
            }
        });
    }
}