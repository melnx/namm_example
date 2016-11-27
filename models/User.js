var mongoose = require('mongoose');
var Schema = mongoose.Schema;

module.exports = {
    User: {
        $home: {
            "user": "/Analytics"
        },

        _subs: [{
            type: Schema.Types.ObjectId,
            ref: 'Sub'
        }],

        _shortcuts: [{
            type: Schema.Types.ObjectId,
            ref: 'Sub'
        }],

        $access: {
            user: {
                list: 'all',
                create: false,
                get: 'all',
                update: 'own',
                delete: false,
            },
        },

        $init: function($scope, $http) {
            $scope.$on('$routeChangeSuccess', function() {
                $scope.$parent.controllericon = "fa-tachometer";
                $scope.$parent.controllerheader = "Users";
                $scope.$parent.controllerdescription = "users";
            });

        }
    }
}