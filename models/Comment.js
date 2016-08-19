var mongoose = require('mongoose');
var Schema = mongoose.Schema;

module.exports = {
    Comment: {
        name: String,
        content: String,
        points: {type:Number, default:0},

        _post: {
            type: Schema.Types.ObjectId,
            ref: 'Post'
        },

        _parent: {
            type: Schema.Types.ObjectId,
            ref: 'Comment'
        },

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
                $scope.$parent.controllerheader = "Comments";
                $scope.$parent.controllerdescription = "comments";
            });

        }
    }
}