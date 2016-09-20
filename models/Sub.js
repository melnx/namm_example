var mongoose = require('mongoose');
var Schema = mongoose.Schema;

module.exports = {
    Sub: {
        name: {type: String, unique:true},
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
        }
    }
}