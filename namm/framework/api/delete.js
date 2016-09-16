var _ = require('underscore');
var mongoose = require('mongoose');

module.exports = function(modelName, namm){

    var debug = namm.debug;
    var resources = namm.resources;
    var modelProperties = resources[modelName];
    var model = mongoose.model(modelName);
    this[modelName] = model;

    return function(req, res) {

        require('./util/access.js')(modelName, namm);

        var access = getRoleAccess(req, 'delete');

        if(debug){ console.log(modelName + "/delete Access: " + access + " [" + req.user.username + "]"); }
        if (!access) {res.status(500).end('Permission Denied'); return; }

        var q = {
            _id: req.param('id')
        };
        if (access != 'all') addAccessLimiterToQuery(q, modelProperties, req);

        model.remove(q, function(err) {
            if (err) {
                res.send(err);
            } else {
                res.send('success');
            }
        });

    }
}