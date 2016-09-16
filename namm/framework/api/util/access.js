module.exports = function(modelName, namm){

    var debug = namm.debug;
    var resources = namm.resources;
    var modelProperties = resources[modelName];

    //add access limiter to query
    this.addAccessLimiterToQuery = function addAccessLimiterToQuery(q, modelProperties, req) {
        if (modelName == 'User') {
            q._id = req.user._id;
            return;
        }

        if (!modelProperties.$public) {
            q.__owner = req.user._id;
        }
    }

    //data route access determination
    this.getRoleAccess = function getRoleAccess(req, action) {

        var user = req.user;
        var roleName = user.role;
        if (!roleName) {
            roleName = 'user';
        }

        var access = modelProperties['$access'];
        var roleAccess = null;
        if (access) {
            roleAccess = access[roleName];
        }

        if (!roleAccess) {
            roleAccess = {
                list: 'own',
                count: 'own',
                create: true,
                get: 'own',
                update: 'own',
                delete: 'own',
                reduce: 'own',
            };
            if (modelName == 'User') roleAccess.create = false;
        }
        return roleAccess[action];
    }

    //check if user has access to $private fields
    this.hasPrivateAccess = function hasPrivateAccess(req, action) {
        var privateAccess = getRoleAccess(req, '$private');

        return privateAccess == 'all' || privateAccess == "*" || (privateAccess && privateAccess.indexOf(action) >= 0);
    }

    this.cleanItem = function cleanItem(item, user, modelName, modelProperties, hiddenProperties, internalProperties){
        var cleanHidden = true;
        if(modelName == "User" && user._id.toString() == item._id.toString()){
            cleanHidden = false;
        }
        if(user.role == "admin"){
            cleanHidden = false;
        }

        if(cleanHidden){
            hiddenProperties.forEach(function(k){
                item[k] = null;
            });
        }

        internalProperties.forEach(function(k){
            item[k] = null;
        });

        if(item.__owner && item.__owner._id){
            item.__owner.password = null;
            item.__owner.email = null;
            item.__owner.phone = null;
            item.__owner.fullName = null;
            item.__owner.username = null;
        }
    }

    this.cleanResult = function cleanResult(req, result, modelName, modelProperties){
        var hiddenProperties = [];
        var internalProperties = [];
        Object.keys(modelProperties).forEach(function(key){
            if(modelProperties[key].$hidden){
                hiddenProperties.push(key);
            }
            if(modelProperties[key].$internal){
                internalProperties.push(key);
            }
        });

        if(result instanceof Array){
            result.forEach(function(i){
                cleanItem(i, req.user, modelName, modelProperties, hiddenProperties, internalProperties);
            });
        }else{
            cleanItem(result, req.user, modelName, modelProperties, hiddenProperties, internalProperties);
        }
    }

    return {
        addAccessLimiterToQuery: addAccessLimiterToQuery,
        getRoleAccess: getRoleAccess,
        hasPrivateAccess: hasPrivateAccess,
        cleanResult: cleanResult,
        cleanItem: cleanItem,
    }
}