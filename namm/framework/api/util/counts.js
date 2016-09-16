var async = require('async');
var mongoose = require('mongoose');

module.exports = function(modelName, namm){

    var debug = namm.debug;
    var resources = namm.resources;
    var modelProperties = resources[modelName];
    var util = require('./util')(modelName, namm);
    //var prepareMongoQuery = util.prepareMongoQuery;
    //var mongoResultsToObjects = util.mongoResultsToObjects;

    function getCounts(modelName, groupByField, q, callback, ids){

        var model = mongoose.model(modelName);

        var match = q ? (typeof q == "string" ? JSON.parse(q) : q) : {};

        if(ids){
            match[groupByField] = {$in: ids};
        }

        //DO RECURSIVE CHECK ON ALL STRINGS THAT ARE DATES AND CONVERT THEM DYNAMICALLY
        //match.created.$gt = new Date(match.created.$gt);
        prepareMongoQuery(match);

        if(debug){ console.log("COUNT MATCH: ", JSON.stringify(match)); }

        var aggregate = {$sum: 1};

        var unwindAggregate = null;
        if(typeof resources[modelName][groupByField]){
            if(resources[modelName][groupByField][0] && resources[modelName][groupByField][0].ref){
                unwindAggregate = [
                    {$match: match },
                    {$unwind: "$" + groupByField },
                    {$group: { _id: "$" + groupByField, total: aggregate }}
                ];
            }
        }

        var agg = unwindAggregate || [
            {$match: match},
            {$group: {
                _id: "$" + groupByField,
                total: aggregate
            }}
        ];

        var query = model.aggregate(agg);

        query.exec(function(err, result) {
            callback(result);
            //console.log(result);
        });

    }

    function hydrateCounts(result, $count, counts){


        var associateBy = $count[2];

        result.forEach(function(item){
            if(counts){ counts.forEach(function(count){
                if(!associateBy || associateBy == 'null'){
                    if(count._id && item._id && count._id.toString() == item._id.toString()){
                        var countKey = $count[4] || ($count[0] + $count[1] + "$count");
                        //if(debug){ console.log(countKey); }
                        item[countKey] = count.total;
                    }
                }else if(item[associateBy] && count._id){
                    //console.log( JSON.stringify(item[associateBy]) + " contains " + count._id);
                    //console.log("IS ARRAY?", item[associateBy] instanceof Array, " INDEX:", arrayContains(item[associateBy], count._id) );

                    if( (item[associateBy] instanceof Array && arrayContains(item[associateBy], count._id)) ||
                        item[associateBy].toString() == count._id.toString()
                        ){
                        //console.log("YES");
                        var countKey = $count[4] || ($count[0] + $count[1] + $count[2] + "$count");
                        //if(debug){ console.log(countKey); }
                        if(item[countKey]){
                            //console.log("INCREMENT COUNT");
                            item[countKey] += count.total;
                        } else {
                            item[countKey] = count.total;
                        }
                    } else{
                        //console.log("NO");
                    }
                }
            });}
        })
        return result;
    }

    this.computeCounts = function computeCounts(result, _count, cb, ids){
        if(debug){ console.log("parsing count params", _count); }
        var $count = typeof _count == "string" ? JSON.parse(_count) : _count;

        var newResult = mongoResultsToObjects(result);

        if($count instanceof Array){
            getCounts($count[0], $count[1], $count[3], function(counts){
                hydrateCounts(newResult, $count, counts);
                cb(null, newResult);
            }, $count[2] ? null : ids);
        }else{
            async.forEach(Object.keys($count), function (countKey, callback){
                var $countItem = $count[countKey];
                $countItem[4] = countKey;

                getCounts($countItem[0], $countItem[1], $countItem[3], function(counts){
                    hydrateCounts(newResult, $countItem, counts);
                    callback();
                }, $countItem[2] ? null : ids);
            }, function(err) {
                cb(err, newResult);
            });
        }
    }

    return {
        computeCounts: computeCounts
    }
}