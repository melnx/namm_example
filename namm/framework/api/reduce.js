var mongoose = require('mongoose');

module.exports = function(modelName, namm){

    var debug = namm.debug;
    var resources = namm.resources;
    var modelProperties = resources[modelName];
    var model = mongoose.model(modelName);
    this[modelName] = model;

    return function(req, res) {

        require('./util/access.js')(modelName, namm);

        var access = getRoleAccess(req, 'reduce');
        if(debug){ console.log(modelName + "/reduce Access: " + access + " [" + req.user.username + "]"); }
        if (!access){ res.status(500).end('Permission Denied'); return; }

        var privateAccess = hasPrivateAccess(req, 'reduce');
        if(debug){ console.log("PrivateAccess: " + privateAccess); }

        var q = {};

        if(debug){console.log("Keys:"); }
        var _populate = null;

        Object.keys(req.query).forEach(function(key) {
            if (!privateAccess && modelProperties[key] && modelProperties[key]['$private']) return;
            if(key[0] == '$') return;

            if(modelProperties[key] && modelProperties[key].ref){
                q[key] = mongoose.Types.ObjectId(req.query[key]);
            }else{
                if(req.query[key][0] == '{'){
                    q[key] = JSON.parse(req.query[key]);
                }else{
                    q[key] = req.query[key];
                }
            }

            console.log(key + ": " + q[key]);
        });

        if (access != 'all') addAccessLimiterToQuery(q, modelProperties, req);

        if(debug){ console.log("FINAL QUERY: ", q); }

        var groupBy = req.query.$groupBy;
        if(groupBy && groupBy.length && groupBy[0] == '{'){
            groupBy = JSON.parse(groupBy);
        }
        if(debug){ console.log("GROUPBY:",groupBy); }

        var aggregate = {$sum: 1};
        var agg =[
            {$match: q},
            {$group: {
                _id: groupBy,
                total: aggregate
            }}
        ];

        var query = model.aggregate(agg);

        query.exec(function(err, result) {
            res.send(result);
            //console.log(result);
        });

    }
}