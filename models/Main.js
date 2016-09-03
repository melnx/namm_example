var mongoose = require('mongoose');
var Schema = mongoose.Schema;

module.exports = {
    Main: {
        name: String,

        $init: function($scope, $route, $routeParams, $location, $http, $alert, $interval, $window, $sce, $rootScope) {
            // Initialize Variables
            $scope.$route = $route;
            $scope.$location = $location;
            $scope.$routeParams = $routeParams;


            // Create Alerts on FlashMessage event
            $scope.$on('FlashMessage', function(event, args) {
                $alert({
                    title: args.FlashTitle,
                    content: args.FlashMsg,
                    animation: 'am-fade-and-slide-top',
                    placement: 'top-right',
                    type: args.FlashType,
                    show: true,
                    duration: 5
                });
                console.log("Alert triggered");
            });

            $scope.saveUser = function(){
                $scope.action(null, 'User', 'update', null, $rootScope._user, 'post');
            }

            $scope.collectionContainsObject = function(collection, item){
                if(!item || !collection){
                    return false;
                }

                var id = item._id;
                var result = false;



                collection.forEach(function(i){
                    if(!i) return;
                    if(i._id == id){
                        result = true;
                    }
                })

                return result;
            }

            $scope.toggleCollectionContains = function(collection, item, cb){
                if(!item || !collection){
                    return false;
                }
                var id = item._id;
                var found = null;

                collection.forEach(function(i){
                    if(!i) return;
                    if(i._id == id){
                        found = i;
                    }
                })

                if(found){
                    collection.splice(collection.indexOf(found), 1);
                }else{
                    collection.push(item);
                }

                if(cb){
                    cb();
                }
            }

            $scope.getYoutubeUrl = function(url){
                var video_id = url.split('v=')[1];
                var ampersandPosition = video_id.indexOf('&');
                if(ampersandPosition != -1) {
                    video_id = video_id.substring(0, ampersandPosition);
                }
                return $sce.trustAsResourceUrl( 'https://www.youtube.com/embed/' + video_id );
            }

            $scope.getSoundcloudUrl = function(url){
                return $sce.trustAsResourceUrl( 'https://w.soundcloud.com/player/?url=' + encodeURIComponent(url) + '&amp;auto_play=false&amp;hide_related=false&amp;show_comments=true&amp;show_user=true&amp;show_reposts=false&amp;visual=true' );
            }

            $scope.createPost = function(item, sub){
                if(sub){
                    item._sub = sub;
                }

                var lowerUrl = item.url ? item.url.toLowerCase() : '';

                if(item.image && item.image.length){
                    $scope.action('result', 'Post', 'create', null, item, 'post', function(){
                        $window.location.href = sub ? '/Subs/' + sub : '/Posts/';
                    });
                }else if(lowerUrl.endsWith('.png') || lowerUrl.endsWith('.jpg') || lowerUrl.endsWith('.jpeg') || lowerUrl.endsWith('.gif') || lowerUrl.endsWith('.gifv')){
                    item.image = item.url;
                    $scope.action('result', 'Post', 'create', null, item, 'post', function(){
                        $window.location.href = sub ? '/Subs/' + sub : '/Posts/';
                    });
                }else{
                    $http({method:"GET", url:"https://opengraph.io/api/1.0/site/" + item.url}).then(
                        function(resp){
                            console.log("LOOKED UP URL DATA");
                            console.log(resp);
                            console.log("IMAGE:");
                            console.log(resp.data.openGraph.image);

                            item.image = resp.data.openGraph.image;

                            $scope.action('result', 'Post', 'create', null, item, 'post', function(){
                                $window.location.href = sub ? '/Subs/' + sub : '/Posts/';
                            });
                        },
                        function(resp){
                            console.log("FAILED TO LOOK UP URL DATA");
                        }
                    );
                }
            }

            $scope.pluck = function(collection, property){
                var result = [];
                collection.forEach(function(item){
                    result.push(item[property]);
                })
                return result;
            }


            $scope.getDateTimeOffset = function(hourDifference, minuteDifference){
                var date = new Date();
                if(hourDifference) date.setHours( date.getHours() + hourDifference );
                if(minuteDifference) date.setMinutes( date.getMinutes() + minuteDifference );
                return date;
            }

            $scope.loadPosts = function(sub){
                $scope.posts = [];

                var query = {$sort:{points:-1}, $count:{
                    commentCount:['Comment', '_post'],
                    upvoted:['Vote', '_post', null, {points:{$gt:0}}],
                    downvoted:['Vote', '_post', null, {points:{$lt:0}}],
                }};

                if(sub){
                    query._sub = sub;
                }else{
                    query.$or = [
                        {_sub:{$exists:false}},
                        {_sub:null},
                        {_sub:{$in:$scope.pluck($rootScope._user._subs, '_id')}}
                    ];
                    query.$aggregate = [
                        {
                            $project: {
                                difference: { $subtract: ["$a", "$b"] }
                                // Add other keys in here as necessary
                            }
                        },
                        {
                            $sort: { difference: -1 }
                        }
                    ];
                    query.created = {$gt: $scope.getDateTimeOffset(-24*14)};
                }

                $scope.action('posts', 'Post', 'list', null, query, 'get', function(){
                    console.log("loaded posts");
                })
            }

            $scope.loadComments = function(post){
                var query = {$sort:{points:-1}, $count:{
                    replyCount:['Comment', '_parent'],
                    upvoted:['Vote', '_comment', null, {points:{$gt:0}}],
                    downvoted:['Vote', '_comment', null, {points:{$lt:0}}],
                }};

                query._post = post || $scope._id;

                if(post && post._post){
                    query._post = post._post;
                }else{
                    $scope.comments = [];
                }

                $scope.action('comments', 'Comment', 'list', null, query, 'get', function(){
                   console.log("loaded comments");
                });
            }

            $scope.reply = function(content, post, parent, root){
                if(!content || !content.content || content.content == ''){
                    return;
                }

                var reply = {name: content.content, _post:post};
                if(parent){
                    reply._parent = parent;
                }
                if(root){
                    reply._root = root;
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
                    console.log("RESULT:");
                    console.log(result);
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
