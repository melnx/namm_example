module.exports = {
    PostUtil: function($http, $window, $rootScope){
        function pluck(collection, property){
            var result = [];
            collection.forEach(function(item){
                result.push(item[property]);
            })
            return result;
        }

        function getDateTimeOffset(hourDifference, minuteDifference){
            var date = new Date();
            if(hourDifference) date.setHours( date.getHours() + hourDifference );
            if(minuteDifference) date.setMinutes( date.getMinutes() + minuteDifference );
            return date;
        }

        this.createPost = function(item, sub){
            if(sub){
                item._sub = sub;
            }

            var lowerUrl = item.url ? item.url.toLowerCase() : '';

            function postPostToApi(){
                var request = $http({
                    method:"POST",
                    url:"/api/1.0/Post/",
                    headers: {
                        'Accept': 'application/json'
                    },
                    data: item
                })

                request.then(function(resp){
                    $window.location.href = sub ? '/Subs/' + sub : '/Posts/';
                })

                return request;
            }

            if(item.image && item.image.length){
                return postPostToApi();
            }else if(lowerUrl.endsWith('.png') || lowerUrl.endsWith('.jpg') || lowerUrl.endsWith('.jpeg') || lowerUrl.endsWith('.gif') || lowerUrl.endsWith('.gifv')){
                item.image = item.url;

                return postPostToApi();
            }else{
                $http({method:"GET", url:"https://opengraph.io/api/1.0/site/" + item.url}).then(
                    function(resp){
                        console.log("LOOKED UP URL DATA");
                        console.log(resp);
                        console.log("IMAGE:");
                        console.log(resp.data.openGraph.image);

                        item.image = resp.data.openGraph.image;

                        return postPostToApi();
                    },
                    function(resp){
                        console.log("FAILED TO LOOK UP URL DATA");
                    }
                );
            }
        }

        this.loadPosts = function(sub){
            //$scope.posts = [];

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
                    {_sub:{$in:pluck($rootScope._user._subs, '_id')}}
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
                //query.created = {$gt: getDateTimeOffset(-24*14)};
            }

            return $http({
                method:"GET",
                url:"/api/1.0/Post/",
                params: query,
            })
        }

        this.upvotePost = function(post){
            $http({
                method:"GET",
                url:"/util/upvotePost/" + post._id,
            }).then(function(resp){
                 var result = resp.data;
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

        this.downvotePost = function(post){
            $http({
                method:"GET",
                url:"/util/downvotePost/" + post._id,
            }).then(function(resp){
                var result = resp.data;
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