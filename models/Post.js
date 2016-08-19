var mongoose = require('mongoose');
var Schema = mongoose.Schema;

module.exports = {
    Post: {
        name: String,
        content: String,
        url: String,
        image: String,
        points: {type:Number, default:0},

        created: Date,
        updated: Date,

        $access: {
            user: {
                list: 'all',
                create: true,
                get: 'all',
                update: 'own',
                delete: 'own'
            },
        },

        $init: function($scope, $http) {
            $scope.$on('$routeChangeSuccess', function() {
                $scope.$parent.controllericon = "fa-tachometer";
                $scope.$parent.controllerheader = "Posts";
                $scope.$parent.controllerdescription = "posts";
            });

            $scope.createPost = function(){
                if($scope.item.image && $scope.item.image.length){
                    $scope.create();
                }else{
                    $http({method:"GET", url:"http://opengraph.io/api/1.0/site/" + $scope.item.url}).then(
                        function(resp){
                            console.log("LOOKED UP URL DATA");
                            console.log(resp);
                            console.log("IMAGE:");
                            console.log(resp.data.openGraph.image);

                            $scope.item.image = resp.data.openGraph.image;
                            $scope.create();
                        },
                        function(resp){
                            console.log("FAILED TO LOOK UP URL DATA");
                        }
                    );
                }
            }

            $scope.loadPosts = function(){
                var query = {$sort:{points:-1}, $count:{
                    commentCount:['Comment', '_post'],
                    upvoted:['Vote', '_post', null, {points:{$gt:0}}],
                    downvoted:['Vote', '_post', null, {points:{$lt:0}}],
                }};
                $scope.action('posts', 'Post', 'list', null, query, 'get', function(){
                    console.log("loaded posts");
                })
            }

            $scope.loadComments = function(){
                var query = {$sort:{points:-1}, _post:$scope._id, $count:{
                    replyCount:['Comment', '_parent'],
                    upvoted:['Vote', '_comment', null, {points:{$gt:0}}],
                    downvoted:['Vote', '_comment', null, {points:{$lt:0}}],
                }};
                $scope.action('comments', 'Comment', 'list', null, query, 'get', function(){
                   console.log("loaded comments");
                });
            }

            $scope.reply = function(content, comment){
                if(!content || !content.content || content.content == ''){
                    return;
                }

                var reply = {name: content.content, _post:$scope._id};
                if(comment){
                    reply._parent = comment;
                }
                content.content = '';
                $scope.action('result', 'Comment', 'create', null, reply, 'post', 'loadComments');
            }

            $scope.upvoteComment = function(comment){
                $scope.action("voteResult", "util", "upvoteComment", comment._id, null, 'get', function(result){
                    if(result.result == 'unvoted'){
                        comment.upvoted = false;
                        comment.downvoted = false;
                    }else{
                        comment.upvoted = true;
                        comment.downvoted = false;
                    }
                    comment.points = result.updated.points;
                });
            }
            $scope.downvoteComment = function(comment){
                $scope.action("voteResult", "util", "downvoteComment", comment._id, null, 'get', function(result){
                    if(result.result == 'unvoted'){
                        comment.upvoted = false;
                        comment.downvoted = false;
                    }else{

                        comment.upvoted = false;
                        comment.downvoted = true;
                    }
                    comment.points = result.updated.points;
                });
            }
            $scope.upvotePost = function(post){
                $scope.action("voteResult", "util", "upvotePost", post._id, null, 'get', function(result){
                    if(result.result == "unvoted"){
                        post.upvoted = false;
                        post.downvoted = false;
                    }else{
                        post.upvoted = true;
                        post.downvoted = false;
                    }
                    post.points = result.updated.points;
                });
            }
            $scope.downvotePost = function(post){
                $scope.action("voteResult", "util", "downvotePost", post._id, null, 'get', function(result){
                    if(result.result == 'unvoted'){
                        post.upvoted = false;
                        post.downvoted = false;
                    }else{
                        post.upvoted = false;
                        post.downvoted = true;
                    }
                    post.points = result.updated.points;
                });
            }
        }
    }
}