var mongoose = require('mongoose');
var _ = require('underscore');

function vote(id, userId, direction, model, findQuery, cb){
    var Vote = mongoose.model('Vote');

    var q = {__owner:userId};
    q = _.extend(q, findQuery);

    Vote.findOne(q).exec(function(err,vote){
        if(vote){
            console.log("VOTE:", vote);
            console.log("CHANGING TO:" + direction);
            if( (direction == -1 && vote.points >= 0) || (direction == 1 && vote.points <= 0) ){
                var increment = vote.points == 0 ? direction : direction * 2;
                var response = vote.points == 0 ? "updated" : "reversed";
                console.log("increment", increment);
                vote.points = direction;
                vote.save(function(err){
                    console.log(err || "saved updated vote " + direction);
                    model.findOneAndUpdate({ _id: id }, { $inc: { points: increment }}, {new:true}).exec(function(err, res){
                        console.log(res);
                        console.log(err || "updated comment points");
                        cb({
                            result: response,
                            updated: res,
                        });
                    })
                });
            }else{
                vote.points = 0;

                console.log("already voted this wa, unvoting");

                vote.save(function(err){
                    console.log(err || "saved unvoted vote " + direction);
                    model.findOneAndUpdate({ _id: id }, { $inc: { points: -direction }}, {new:true}).exec(function(err, res){
                        console.log(res);
                        console.log(err || "updated comment points");
                        cb({
                            result: "unvoted",
                            updated: res,
                        });
                    })
                });

            }
        }else{
            var doc = {__owner:userId, points:direction, name:'vote'};
            doc = _.extend(doc, findQuery);

            console.log("new vote", doc);

            vote = new Vote(doc);
            vote.save(function(err){
                console.log(err || "saved new vote " + direction);
                model.findOneAndUpdate({ _id: id }, { $inc: { points: direction }}, {new:true}).exec(function(err, res){
                    console.log(res);
                    console.log(err || "updated comment points");
                    cb({
                        result: "voted",
                        updated: res,
                    });
                })
            });
        }
    })
}

function upvoteComment(req,res){
    var Comment = mongoose.model('Comment');
    var id = req.params.id;

    vote( id, req.user._id, 1, Comment, {_comment:id}, function(result){
        res.send(result);
    });
}

function downvoteComment(req,res){
    var Comment = mongoose.model('Comment');
    var id = req.params.id;

    vote( id, req.user._id, -1, Comment, {_comment:id}, function(result){
        res.send(result);
    });
}

function upvotePost(req,res){
    var Post = mongoose.model('Post');
    var id = req.params.id;

    vote( id, req.user._id, 1, Post, {_post:id}, function(result){
        res.send(result);
    });
}

function downvotePost(req,res){
    var Post = mongoose.model('Post');
    var id = req.params.id;

    vote( id, req.user._id, -1, Post, {_post:id}, function(result){
        res.send(result);
    });
}

module.exports = {
    "/util/upvoteComment/:id": upvoteComment,
    "/util/downvoteComment/:id": downvoteComment,
    "/util/upvotePost/:id": upvotePost,
    "/util/downvotePost/:id": downvotePost,
}