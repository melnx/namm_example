var _ = require('underscore');
var mongoose = require('mongoose');

module.exports = function(modelName, namm){

    var debug = namm.debug;
    var resources = namm.resources;
    var modelProperties = resources[modelName];
    var model = mongoose.model(modelName);
    this[modelName] = model;



    return function(req, res) {

        require('./util/access')(modelName, namm);
        require('./util/util')(modelName, namm);
        require('./util/counts')(modelName, namm);

        var access = getRoleAccess(req, 'list');
        if(debug){ console.log(modelName + "/list Access: " + access + " [" + req.user.username + "]"); }
        if (!access){ res.status(500).end('Permission Denied'); return; }

        var privateAccess = hasPrivateAccess(req, 'list');
        if(debug){ console.log("PrivateAccess: " + privateAccess); }

        var q = {};

        if(debug){ console.log("Keys:"); }
        var _populate = null;
        var _count = null;

        Object.keys(req.query).forEach(function(key) {
            if (!privateAccess && modelProperties[key] && modelProperties[key]['$private']) return;

            if(key=='$populate'){
                _populate = req.query[key];
                return;
            }
            if(key=="$count"){
                _count = req.query[key];
                return;
            }
            if(key[0] == '$' && key != '$or') return;

            if(modelProperties[key] && modelProperties[key].ref){
                if(debug) console.log("attempting to create id: ", req.query[key]);
                q[key] = mongoose.Types.ObjectId(req.query[key]);
            }else{

                if(req.query[key][0] == '{' || req.query[key][0] == '['){
                    q[key] = JSON.parse(req.query[key]);
                }else{
                    q[key] = req.query[key];
                }
            }

            if(debug){ console.log(typeof q[key]); console.log(key + ": " + q[key]); }
        });

        if (access != 'all') addAccessLimiterToQuery(q, modelProperties, req);

        prepareMongoQuery(q);

        if(debug){ console.log("FINAL QUERY: ", JSON.stringify(q)); }

        if(req.query['$limit']){
            var count_query = model.count(q);
            count_query.exec(function(err, count){
                if(err){
                    res.send(err);
                    return;
                }
                var query = model.find(q);

                if(req.query['$skip']){
                    if(debug){ console.log("SKIP: " + req.query['$skip']); }
                    query.skip(req.query['$skip']);
                }
                if(req.query['$limit']){
                    if(debug){ console.log("LIMIT: " + req.query['$limit']); }
                    query.limit(req.query['$limit']);
                }
                if(req.query['$sort']){
                    var sort = req.query['$sort'].length && isJson(req.query['$sort']) ? JSON.parse(req.query['$sort']) : req.query['$sort'];
                    if(debug){ console.log("SORT: ", sort); }
                    query.sort(sort);
                }

                autoPopulate(query);

                query.exec(function(err, result) {
                    /*res.send({
                     count: count,
                     list: result
                     });*/

                    //result.unshift({count:count});

                    cleanResult(req, result, modelName, modelProperties);

                    if(_count){
                        computeCounts(result, _count, function(err, newResult){
                            if(!err && newResult && newResult.length){
                                newResult[0].$count = count;
                            }
                            res.send(err || newResult);
                        }, _.pluck(result, '_id'));
                    }else{
                        if(result && result.length){
                            var obj = result[0].toObject();
                            obj.$count = count;
                            result[0] = obj;
                        }
                        res.send(result);
                    }
                    //console.log(result);
                });
            })
        }else{
            var query = model.find(q);

            autoPopulate(query);

            if(req.query['$sort']){
                var sort = req.query['$sort'].length && req.query['$sort'][0] == '{' ? JSON.parse(req.query['$sort']) : req.query['$sort'];
                query.sort(sort);
            }

            if(req.query['$aggregate']){
                prepareMongoQuery(req.query['$aggregate']);
                console.log("AGGREGATE");
                console.log(JSON.stringify(req.query['$aggregate']));
            }

            query.exec(function(err, result) {
                cleanResult(req, result, modelName, modelProperties);

                if(_count){
                    computeCounts(result, _count, function(err, newResult){
                        res.send(err || newResult);
                    });
                }else{
                    if(debug) console.log("RESULT LENGTH:", result.length);
                    res.send(result);
                }

                //console.log(result);
            });
        }
    }
}