var mongoose = require('mongoose');
var Schema = mongoose.Schema;

module.exports = {
    Main: {
        name: String,

        $init: function($scope, $route, $routeParams, $location, $http, $alert, $interval, $window, $sce, $rootScope, PostUtil, MediaEmbedUtil, CommentUtil) {
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

            $scope.MediaEmbedUtil = MediaEmbedUtil;
            $scope.CommentUtil = CommentUtil;
            $scope.PostUtil = PostUtil;

            $scope.setPosts = function(resp){
                $scope.posts = resp.data;
            }

            $scope.setComments = function(resp){
                $scope.comments = resp.data;
            }

            $scope.reloadComments = function(resp){
                CommentUtil.loadComments(resp.data).then($scope.setComments);
            }
        }
    }
}
