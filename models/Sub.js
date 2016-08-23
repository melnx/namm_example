var mongoose = require('mongoose');
var Schema = mongoose.Schema;

module.exports = {
    Sub: {
        name: String,
        description: String,
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

        $init: function($scope, $http, $sce) {
            $scope.$on('$routeChangeSuccess', function() {
                $scope.$parent.controllericon = "fa-file-text-o";
                $scope.$parent.controllerheader = "Subs";
                $scope.$parent.controllerdescription = "subs";
            });

        }
    }
}