module.exports = {
    CommentUtil: function($http){
        this.loadComments = function(post){
            var query = {$sort:{points:-1}, $count:{
                replyCount:['Comment', '_parent'],
                upvoted:['Vote', '_comment', null, {points:{$gt:0}}],
                downvoted:['Vote', '_comment', null, {points:{$lt:0}}],
            }};

            query._post = post || $scope._id;

            if(post && post._post){
                query._post = post._post;
            }else{
                //$scope.comments = [];
            }

            return $http({
                method:"GET",
                url:"/api/1.0/Comment/",
                params: query
            })
        }

        this.reply = function(content, post, parent, root){
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

            return $http({
                method:"POST",
                url:"/api/1.0/Comment/",
                headers: {
                    'Accept': 'application/json'
                },
                data: reply
            })
        }

        this.upvoteComment = function(comment){
            $http({
                method:"GET",
                url:"/util/upvoteComment/" + comment._id,
            }).then(function(resp){
                var result = resp.data;
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

        this.downvoteComment = function(comment){
            $http({
                method:"GET",
                url:"/util/downvoteComment/" + comment._id,
            }).then(function(resp){
                var result = resp.data;
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
    }
}