(function(angular) {
  'use strict';

  var models = __models; //{Campaign:null, Contact:null, Lead:null, Meeting:null, Message:null};
  var app = angular.module("BanzaiApp", ['mgcrea.ngStrap', 'ngRoute', 'ngAnimate', 'angularUtils.directives.dirPagination', 'textAngular', 'chart.js', 'ladda']);

  var timezones = [
      ["EST	Eastern Standard Time (North America)	UTC−05", -5],
      ["CST	Central Standard Time (North America)	UTC−06", -6],
      ["MST	Mountain Standard Time (North America)	UTC−07", -7],
      ["PST	Pacific Standard Time (North America)	UTC−08", -8],
  ];

  function getFunctionBody(func) {
    var fn = "" + func;
    var fnBody = fn.substring(fn.indexOf("{") + 1, fn.lastIndexOf("}"));
    return fnBody;
  }

  function getParamNames(func) {
    var STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;
    var ARGUMENT_NAMES = /([^\s,]+)/g;
    var fnStr = func.toString().replace(STRIP_COMMENTS, '');
    var result = fnStr.slice(fnStr.indexOf('(') + 1, fnStr.indexOf(')')).match(ARGUMENT_NAMES);
    if (result === null)
      result = [];
    return result;
  }

  function callCallback($scope, callback, data, target, parameters) {
    if (!callback) return;
    console.log("have a callback");
    if (typeof callback === "function") {
      console.log("its a function")
      callback(data, target, parameters);
    } else if ($scope[callback]) {
      console.log('its a string');
      $scope[callback](data, target, parameters);
    }
  }

  function setTargetProperty($scope, property, data) {
    if (property instanceof Array) {
      var target = property[0];
      target[property[1]] = data;
    } else {
      $scope[property] = data;
    }
  }

  function getActionHttpParams(modelName, action, id, data, method) {
    var url = "/" + modelName + "/" + action + "/";

    if (id) url += id;
    console.log('action');
    console.log(url);
    method = method ? method.toLowerCase() : 'get';

    var result = {
      method: method,
      url: url,
      params: method == 'post' ? null : data,
      data: method == 'post' ? data : null,
      headers: method == 'post' ? {
        'Accept': 'application/json'
      } : null
    };

    console.log("HTTP PARAMS");
    console.log(result);

    return result;
  }

  initApp();

  function initApp() {

    console.log('init');

    app.directive('myDownload', function($compile) {
      return {
        restrict: 'E',
        scope: {
          getUrlData: '&getData'
        },
        link: function(scope, elm, attrs) {
          var url = URL.createObjectURL(scope.getUrlData());
          elm.append($compile(
            '<a class="btn" download="export.csv"' +
            'href="' + url + '">' +
            'Export' +
            '</a>'
          )(scope));
        }
      };
    });

    app.directive("formatDate", function() {
      return {
        require: 'ngModel',
        link: function(scope, elem, attr, modelCtrl) {
          modelCtrl.$formatters.push(function(modelValue) {
            return new Date(modelValue);
          })
        }
      }
    });

    app.directive('onFinishRender', ['$timeout', '$parse', function($timeout, $parse) {
      return {
        restrict: 'A',
        link: function(scope, element, attr) {
          if (scope.$last === true) {
            $timeout(function() {
              scope.$emit('ngRepeatFinished');
              if (!!attr.onFinishRender) {
                $parse(attr.onFinishRender)(scope);
              }
            });
          }
        }
      }
    }]);

    app.filter('parseUrl', function() {
        var urls = /(\b(https?|ftp):\/\/[A-Z0-9+&@#\/%?=~_|!:,.;-]*[-A-Z0-9+&@#\/%=~_|])/gim
        var emails = /(\w+@[a-zA-Z_]+?\.[a-zA-Z]{2,6})/gim

        return function(text) {
            if(text.match(urls)) {
                text = text.replace(urls, "<a href=\"$1\" target=\"_blank\">$1</a>")
            }
            if(text.match(emails)) {
                text = text.replace(emails, "<a href=\"mailto:$1\">$1</a>")
            }

            return text
        }
    });

    app.filter('timeago', function() {
        return function(input, p_allowFuture) {
            var substitute = function (stringOrFunction, number, strings) {
                    var string = $.isFunction(stringOrFunction) ? stringOrFunction(number, dateDifference) : stringOrFunction;
                    var value = (strings.numbers && strings.numbers[number]) || number;
                    return string.replace(/%d/i, value);
                },
                nowTime = (new Date()).getTime(),
                date = (new Date(input)).getTime(),
            //refreshMillis= 6e4, //A minute
                allowFuture = p_allowFuture || false,
                strings= {
                    prefixAgo: null,
                    prefixFromNow: null,
                    suffixAgo: "ago",
                    suffixFromNow: "from now",
                    seconds: "less than a minute",
                    minute: "about a minute",
                    minutes: "%d minutes",
                    hour: "about an hour",
                    hours: "about %d hours",
                    day: "a day",
                    days: "%d days",
                    month: "about a month",
                    months: "%d months",
                    year: "about a year",
                    years: "%d years"
                },
                dateDifference = nowTime - date,
                words,
                seconds = Math.abs(dateDifference) / 1000,
                minutes = seconds / 60,
                hours = minutes / 60,
                days = hours / 24,
                years = days / 365,
                separator = strings.wordSeparator === undefined ?  " " : strings.wordSeparator,

            // var strings = this.settings.strings;
                prefix = strings.prefixAgo,
                suffix = strings.suffixAgo;

            if (allowFuture) {
                if (dateDifference < 0) {
                    prefix = strings.prefixFromNow;
                    suffix = strings.suffixFromNow;
                }
            }

            words = seconds < 45 && substitute(strings.seconds, Math.round(seconds), strings) ||
                seconds < 90 && substitute(strings.minute, 1, strings) ||
                minutes < 45 && substitute(strings.minutes, Math.round(minutes), strings) ||
                minutes < 90 && substitute(strings.hour, 1, strings) ||
                hours < 24 && substitute(strings.hours, Math.round(hours), strings) ||
                hours < 42 && substitute(strings.day, 1, strings) ||
                days < 30 && substitute(strings.days, Math.round(days), strings) ||
                days < 45 && substitute(strings.month, 1, strings) ||
                days < 365 && substitute(strings.months, Math.round(days / 30), strings) ||
                years < 1.5 && substitute(strings.year, 1, strings) ||
                substitute(strings.years, Math.round(years), strings);

            return $.trim([prefix, words, suffix].join(separator));
            // conditional based on optional argument
            // if (somethingElse) {
            //     out = out.toUpperCase();
            // }
            // return out;
        }
    });

    app.filter('join', function() {
      return function(list, token) {
        return (list || []).join(token);
      }
    });

    app.filter('pluck', function() {
      function pluck(objects, property) {
        if (!(objects && property && angular.isArray(objects))) return [];

        property = String(property);

        return objects.map(function(object) {
          // just in case
          object = Object(object);

          if (object.hasOwnProperty(property)) {
            return object[property];
          }

          return '';
        });
      }

      return function(objects, property) {
        return pluck(objects, property);
      }
    });

    app.filter('offset', function() {
      return function(input, start) {
        if (!input) return input;
        start = parseInt(start, 10);
        return input.slice(start);
      };
    });

    app.filter('toArray', function() {
      return function(obj, addKey) {
        if (!angular.isObject(obj)) return obj;
        if (addKey === false) {
          return Object.keys(obj).map(function(key) {
            return obj[key];
          });
        } else {
          return Object.keys(obj).map(function(key) {
            var value = obj[key];
            return angular.isObject(value) ?
              Object.defineProperty(value, '$key', {
                enumerable: false,
                value: key
              }) : {
                $key: key,
                $value: value
              };
          });
        }
      };
    });

    app.filter('setDecimal', function ($filter) {
      return function (input, places) {
        if (isNaN(input)) return input;
        // If we want 1 decimal place, we want to mult/div by 10
        // If we want 2 decimal places, we want to mult/div by 100, etc
        // So use the following to create that factor
        var factor = "1" + Array(+(places > 0 && places + 1)).join("0");
        return Math.round(input * factor) / factor;
      };
    });

    app.filter('titlecase', function() {
      return function (input) {
        var smallWords = /^(a|an|and|as|at|but|by|en|for|if|in|nor|of|on|or|per|the|to|vs?\.?|via)$/i;

        input = input.toLowerCase();
        return input.replace(/[A-Za-z0-9\u00C0-\u00FF]+[^\s-]*/g, function(match, index, title) {
          if (index > 0 && index + match.length !== title.length &&
            match.search(smallWords) > -1 && title.charAt(index - 2) !== ":" &&
            (title.charAt(index + match.length) !== '-' || title.charAt(index - 1) === '-') &&
            title.charAt(index - 1).search(/[^\s-]/) < 0) {
            return match.toLowerCase();
          }

          if (match.substr(1).search(/[A-Z]|\../) > -1) {
            return match;
          }

          return match.charAt(0).toUpperCase() + match.substr(1);
        });
      }
    });

    if(typeof __services !== 'undefined' && __services){
        for(var serviceName in __services){
            console.log("SERVICE: " , serviceName);
            app.service(serviceName, __services[serviceName] );
        }
    }

    function mainControllerInit($scope, $route, $routeParams, $location, $http, $alert, $rootScope) {
      //////////////////////
      // Global Utilities //
      //////////////////////
      console.log("MAIN CONTROLLER DEFAULT INIT");
      // Universal signout function
      $scope.signout = function() {
        console.log("signout triggered")
        var request = $http({
          method: "GET",
          url: "/signout"
        });
        return (request.then(
          function(res) {
            window.location = "/";
          },
          function(err) {
            console.log(err);
          }));
      }

      if(typeof __shared !== 'undefined' && __shared){
        $rootScope._shared = __shared;
      }

      if(typeof __user !== 'undefined' && __user){
        $rootScope._user = __user;
      }

      // Helper function to load external data
      $scope.action = function(targetProperty, modelName, action, id, data, method, callback, callbackError, callbackParameters) {
        var url = getActionHttpParams(modelName, action, id, data, method);
        console.log("Action: ");
        console.log(url);
        $http(url).then(
          function(response) {
            console.log(response.data);
            if (targetProperty) {
              setTargetProperty($scope, targetProperty, response.data);
            }
            callCallback($scope, callback, response.data, targetProperty, callbackParameters);
          },
          function(err) {
            console.log(err);
            callCallback($scope, callbackError, err, targetProperty, callbackParameters);
          }
        );
      }

      $scope.saveUser = function(){
          $scope.action(null, 'User', 'update', null, $rootScope._user, 'post');
      }

      // Helper function to fix blocking $apply
      $scope.safeApply = function(fn) {
        var phase = this.$root.$$phase;
        if (phase == '$apply' || phase == '$digest') {
          if (fn && (typeof(fn) === 'function')) {
            fn();
          }
        } else {
          this.$apply(fn);
        }
      }

      var socks = {};
      var network_users = {};
      $scope.chat_log = [];

      $scope.sendChatMessage = function(text, endpoint){
          if(!endpoint){
              endpoint = '/activity';
          }
          var sock = socks[endpoint];
          var message = {
              message: text,
              userName: __user.name,
              userId: __user._id,
          }
          console.log(message);
          sock.send(JSON.stringify(message));
      }

      $scope.connectToSocket = function(endpoint){
            if(typeof SockJS === "undefined"){
                console.log("CANNOT SETUP socket connection PLEASE ADD sockjs.js <script> TO <head>");
                return;
            }
            if(!endpoint){
                endpoint = '/activity';
            }
            var sock = socks[endpoint];
            if(!sock){
                socks[endpoint] = sock = new SockJS(endpoint);
            }
            sock.onmessage = function(e) {
                if(e.type == "message"){
                    var parsed = JSON.parse(e.data);
                    for(var key in parsed){
                        e[key] = parsed[key];
                    }
                    delete e.data;
                    delete e.type;

                    //console.log("RAW SOCKET MESSAGE");
                    //console.log(e);

                    if(e.message){
                        var msg = {_user: e._user, userId: e.userId, userName: e.userName, message: e.message};
                        console.log("CHAT MESSAGE");
                        console.log(msg);
                        $scope.chat_log.push(msg);

                        $scope.safeApply(function(){
                            $scope.chat_message = msg;
                        })
                    }

                    if(e.youruserid && !e.message){
                        var userid = e.youruserid;
                        console.log("Your user Index: " + userid);
                        var message = {
                            associateIds: true,
                            userIndex: userid,
                            name: __user.name,
                            userId: __user._id
                        }
                        console.log(message);
                        sock.send(JSON.stringify(message));
                    }

                    if(e._user){
                        if(e.disconnect){
                            console.log('DISCONNECTED NETWORK USER: ' + e._user);
                            delete network_users[e._user];
                        }else if(e.connect){
                            console.log('CONNECTED NETWORK USER: ' + e._user);
                            network_users[e._user] = e;
                        }
                    }
                    e.__qt = 1;
                }else{
                    alert("unknown message type");
                }
            };
        }

        $scope.updateStatus = function(status){
            var user = $rootScope._user;
            user.status = status;
            user.statusUpdated = new Date();
            $scope.action(null, "User", "update", null, user, "post", function(user){
                console.log("Updated status to: " + user.status);
            });
        }
    }

    initDefaultControllers(models);
    initDefaultRoutes(models);

    function initDefaultActions(modelName, $scope, $http, $window, $route, $location) {

      $scope.$on('$routeChangeSuccess', function() {
         console.log('route changed');
         //console.log($location.search());
         $scope._parameters = $location.search();
      });

      $scope.get_date = function(str) {
        if (!str) return new Date()
        return new Date(str)
      }

      $scope.timezones = timezones;

      $scope.getDateTimeOffset = function(hourDifference, minuteDifference){
        var date = new Date();
        if(hourDifference) date.setHours( date.getHours() + hourDifference );
        if(minuteDifference) date.setMinutes( date.getMinutes() + minuteDifference );
        return date;
      }

      $scope.getActiveTimezones = function(from, until){

          var start = from || 9;
          var end = until || 17;
          var now = new Date();
          var hour = now.getUTCHours();
          var result = [];

          timezones.forEach(function(tz){
              var tzHour = hour + tz[1];
              if(tzHour > start && tzHour < end){
                  result.push(tz);
              }
          });

          return result;
      }

      $scope.getTimezoneQuery = function(){
          return { $or: [
              {timezone:{$exists:false}},
              {timezone:null},
              {timezone:""},
              {timezone:{$in: $scope.getActiveTimezones()}}
          ]};
      }

      $scope.sort = function(keyname, items) {
        if (!items) {
          $scope.sortKey = keyname; //set the sortKey to the param passed
          $scope.reverse = !$scope.reverse; //if true make it false and vice versa
        } else {
          var sort = items.$sort;
          if (!sort) {
            sort = {};
          }

          var sorted = sort[keyname];
          var direction = sort[keyname] ? -sort[keyname] : 1;

          sort[keyname] = direction;

          if (direction > 0 && sorted) {
            delete sort[keyname];
          }

          items.$sort = sort;
          console.log("SORT DESCRIPTOR:");
          console.log(sort);
        }
      }

      //SELECT HELPERS

      $scope.selectAll = function(list) {
        if (!list) return;
        var toggleStatus = list.isAllSelected;
        angular.forEach(list, function(itm) {
          itm.selected = toggleStatus;
        });

      }

      $scope.optionToggled = function(list) {
        if (!list) return;
        list.isAllSelected = list.every(function(itm) {
          return itm.selected;
        })
      }

      //DATA ACTIONS
      $scope.create = function(data) {

        var item = data || $scope.item;

        $http({
          method: "post",
          url: "/" + modelName + "/create",
          headers: {
            'Accept': 'application/json'
          },
          data: item
        }).then(
          function(response) {
            //console.log('create '+response.data);
            $scope.$emit('FlashMessage', {
              FlashType: 'success',
              FlashTitle: 'Cowabunga!',
              FlashMsg: 'Successfully created new ' + modelName
            });
            if ($window.location.href.indexOf(modelName + 's/new') >= 0) {
              //window.setTimeout(function() {
                $window.location.href = '/' + modelName + 's/';
              //}, 3000);
            }
            $scope.reset();
            if ($scope._listed) {
              $scope.list($scope.listParams);
            }
          },
          function(err) {
            console.log(err);
            $scope.$emit('FlashMessage', {
              FlashType: 'danger',
              FlashTitle: 'Wipeout!',
              FlashMsg: 'Failed to create ' + modelName
            });
          }
        );
      };

      $scope.new = function() {
        $scope.item = {
          name: ""
        };
      }

      $scope.delete = function(item, target, noConfirm, model) {
        if(!noConfirm){
            if(!confirm("Are you sure you would like to delete '" + item.name + "'?")){
                return;
            }
        }

        $http({
          method: "get",
          url: "/" + (model || modelName) + "/delete",
          params: {
            id: item._id
          }
        }).then(
          function(response) {
            console.log(response.data);
            $scope.$emit('FlashMessage', {
              FlashType: 'success',
              FlashTitle: 'Cowabunga!',
              FlashMsg: 'Successfully deleted ' + modelName
            });
            target = target || 'items';
            var items = typeof target == "string" ? $scope[target] : target;
            var index = items ? items.indexOf(item) : -1;
            console.log("REMOVING ITEM FROM LOCAL COLLECTION AT INDEX", index);
            if (index >= 0) {
              items.splice(index, 1);
            } else {
              if ($scope._listed) {
                $scope.list($scope.listParams);
              } else if ($scope._paginated) {
                $scope.paginate(target);
              }
            }
          },
          function(err) {
            console.log(err);
            $scope.$emit('FlashMessage', {
              FlashType: 'danger',
              FlashTitle: 'Wipeout!',
              FlashMsg: 'Failed to delete ' + modelName
            });

          }
        );
      };



      $scope.listEx = function(query, cb, modelNameOverride){

        var query2 = query || {};
        var items = null;
        if(items){
            query2 = angular.copy(items.query, query2);
            query2.$sort = items.$sort;
        }

        var pageSize = 1000;
        query2.$limit = pageSize;
        var allOutcomes = [];
        var page = 0;
        var totalCount = 0;

        function getNextPage(skip){
            if(!$scope.downloading){
                $scope.download_progress = 0;
                $scope.downloading = true;
            }
            query2.$skip = skip;

            console.log("loading page " + page);
            $scope.action(null, modelNameOverride || modelName, "list", null, query2, "get", function(outcomes){
                totalCount = outcomes.length ? outcomes[0].$count : 0;

                page++;
                allOutcomes.push.apply(allOutcomes, outcomes);

                $scope.download_progress = Math.round( (totalCount ? allOutcomes.length / totalCount : 0) * 100);

                if(outcomes.length == pageSize){
                    getNextPage(skip + pageSize);
                }else{
                    $scope.downloading = false;
                    cb(allOutcomes);
                }
            });
        };

        getNextPage(0);
      };

      $scope.list = function(params) {
        /*var parameters = {};
        if(params){
            Object.keys(params).forEach(function(key){
              parameters[key] = JSON.stringify(params[key]);
            });
        } */
        $scope.listParams = params;

        $http({
          method: "get",
          url: "/" + modelName + "/list",
          params : params,
        }).then(
          function(response) {
            console.log(response.data);
            $scope.items = response.data;
            $scope[modelName.toLowerCase() + 's'] = response.data;
            $scope._listed = true;
          },
          function(err) {
            console.log(err);
          }
        );
      };

      $scope.pageSize = 10;
      $scope.page = 0;
      $scope.pages = [];

      $scope.paginate = function(target, pageSizes, theModel, parameters) {
        var page = 0;
        var params = parameters ? parameters : $scope.query;
        var sorting = null;

        if (target) {
          if ($scope[target]) {
            page = $scope[target].page ? $scope[target].page : 0;
            params = $scope[target].query || parameters;
            sorting = $scope[target].$sort;
          }
        } else if ($scope.items) {
          page = $scope.items.page ? $scope.items.page : 0;
          params = $scope.items.query ? $scope.items.query : $scope.query;
        }

        var pageSize = pageSizes ? pageSizes : $scope.pageSize;
        var sourceModel = theModel ? theModel : modelName;
        var skip = page * pageSize;
        var limit = pageSize;

        console.log(page, limit);
        console.log(target);

        var filtered = false;
        if(params){
            Object.keys(params).forEach(function(k){
                if(k[0] != '$' || k == '$or'){
                    filtered = true;
                }
            });
        }

        if(target){
            if($scope[target]){
                $scope[target]._paginating = true;
            }else{
                $scope[target] = [];
                $scope[target]._paginating = true;
            }
            $scope[target]._filtered = filtered;
        }else{
            $scope._paginating = true;
            $scope._filtered = filtered;
        }

        $http({
          method: "get",
          url: "/" + sourceModel + "/list?$skip=" + skip + "&$limit=" + limit + (sorting ? "&$sort=" + JSON.stringify(sorting) : ""),
          params: params
        }).then(
          function(response) {
            console.log(response.data);
            if (target) {
              if ($scope[target]) {
                $scope[target].splice(0, $scope[target].length);
                $scope[target].push.apply($scope[target], response.data);
              } else {
                $scope[target] = response.data;
              }
              $scope[target].pageCount = response.data.length ? Math.floor(response.data[0].$count / pageSize) : 0;
              $scope[target].totalCount = response.data.length ? response.data[0].$count : 0;
              $scope[target].pageSize = pageSize;
              $scope[target].sourceModel = sourceModel;
              $scope[target].parameters = parameters;
              $scope[target]._paginated = true;
              $scope[target]._paginating = false;
            } else {
              $scope.items = response.data;
              $scope[modelName.toLowerCase() + 's'] = response.data;
              $scope.items.pageCount = response.data.length ? Math.floor(response.data[0].$count / pageSize) : 0;
              $scope.items.totalCount = response.data.length ? response.data[0].$count : 0;
              $scope.items.pageSize = pageSize;
              $scope.items.sourceModel = sourceModel;
              $scope.items.parameters = parameters;
              $scope._paginated = true;
              $scope._paginating = false;
            }
          },
          function(err) {
            console.log(err);
          }
        );
      };

      $scope.load = function(populate, callback, callbackErr, parameters) {
        var id = $route.current.params.id;
        $scope._id = id;
        $scope._item_url = modelName + 's/' + id;

        var params = populate ? (populate instanceof Array ? {
          populate: populate.join()
        } : {
          populate: populate
        }) : null;

        console.log("GET PARAMS");
        console.log(params);

        $http({
          method: "get",
          url: "/" + modelName + "/get/" + id,
          params: params
        }).then(
          function(response) {
            console.log(response.data);
            $scope.item = response.data;
            $scope.master = angular.copy(response.data);
            $scope[modelName.toLowerCase()] = response.data;
            $scope._loaded = true;

            /*if (after) {
              if (after instanceof Array) {
                after.forEach(function(i) {
                  $scope.action(after.target, after.model, 'get', response.data[i.source]);
                });
              } else {
                $scope.action(after.target, after.model, 'get', response.data[after.source]);
              }
            }*/
            callCallback($scope, callback, response, null, parameters);
          },
          function(err) {
            console.log(err);
            callCallback($scope, callbackErr, err, null, parameters);
          }
        );
      }

      $scope.action = function(targetProperty, modelName, action, id, data, method, callback, callbackError, callbackParameters) {
        $http(getActionHttpParams(modelName, action, id, data, method)).then(
          function(response) {
            console.log(response.data);
            if (targetProperty) {
              setTargetProperty($scope, targetProperty, response.data);
            }
            if (callback) {
              callCallback($scope, callback, response.data, targetProperty, callbackParameters);
            }
          },
          function(err) {
            console.log(err);
            if (callbackError) {
              callCallback($scope, callbackError, err, targetProperty, callbackParameters);
            }
          }
        );
      }

      $scope.master = {};

      $scope.update = function(item) {
        $scope.master = angular.copy(item);
      };

      $scope.reset = function() {
        console.log('reverting to');
        console.log($scope.master);
        $scope.item = angular.copy($scope.master);
      };

      $scope.save = function(item, callback, callbackErr) {
        if (!item) {
          $scope.master = angular.copy($scope.item);
        }

        console.log('trying to save');
        console.log($scope.item);

        $http({
          method: "post",
          url: "/" + modelName + "/update",
          headers: {
            'Accept': 'application/json'
          },
          data: item ? item : $scope.item
        }).then(
          function(response) {
            console.log('saved');
            if (callback) {
              callCallback($scope, callback, response);
            }

            $scope.$emit('FlashMessage', {
              FlashType: 'success',
              FlashTitle: 'Cowabunga!',
              FlashMsg: 'Successfully updated ' + modelName
            });
            if ($window.location.href.indexOf('/edit') >= 0) {
              //window.setTimeout(function() {
                $window.location.href = '/' + modelName + 's/';
              //}, 3000);
            }
            console.log(response.data);
            //$scope.list();
          },
          function(err) {
            console.log(err);
            if (callbackErr) {
              callCallback($scope, callbackErr, err);
            }
            $scope.$emit('FlashMessage', {
              FlashType: 'danger',
              FlashTitle: 'Wipeout!',
              FlashMsg: 'Failed to update ' + modelName
            });
          }
        );
      }
    }

    function execDefaultActions($scope) {
      //$scope.list();
      $scope.reset();
    }

    function initDefaultControllers(models) {
      if(!models['Main']){ models['Main'] = {}; }

      Object.keys(models).forEach(function(modelName) {

        var model = models[modelName];

        var defaultInitFunction = function($scope, $http, $window, $route, $location) {
          initDefaultActions(modelName, $scope, $http, $window, $route, $location);
          execDefaultActions($scope);
          $scope.$parent._controller = $scope._controller = model;
          console.log("CONTROLLER: " + modelName);
          $scope.$parent._controllerName = $scope._controllerName = modelName;
        };

        if(modelName == "Main"){ defaultInitFunction = mainControllerInit; }

        function mergeFunctions(a, b) {
          var paramsA = getParamNames(a);
          var paramsB = getParamNames(b);

          var codeA = getFunctionBody(a);
          var codeB = getFunctionBody(b);

          var addedParams = {};
          for (var i in paramsA) {
            addedParams[paramsA[i]] = true;
          }
          for (var i in paramsB) {
            addedParams[paramsB[i]] = true;
          }

          var result = "(function(" + Object.keys(addedParams).join() + "){\n" + codeA + '\n' + codeB + "\n})";

          return result;
        }

        function evalInContext(js, context) {
          return function() {
            return eval(js);
          }.call(context);
        }

        function mergeFunctionsInContext(a, b, context) {
          evalInContext(mergeFunctions(a, b), context);
        }

        console.log(modelName + "Controller");

        if (model && model.$init) {
          //console.log('custom init function:');
          //console.log(model.$init);

          //var func = (defaultInitFunction, model.$init, this);
          var func = evalInContext(mergeFunctions(defaultInitFunction, model.$init), this);
          //console.log(func);

          app.controller(modelName + "Controller", func);
        } else {
          app.controller(modelName + "Controller", defaultInitFunction);
          //console.log('default init function:');
          //console.log(defaultInitFunction);
        }
      });
    }

    function initDefaultRoutes(models) {
      app.config(function($routeProvider, $locationProvider) {

        Object.keys(models).forEach(function(modelName) {

          $routeProvider.when('/' + modelName + 's/', {
            templateUrl: '/views/' + modelName + 's/index.html',
            controller: modelName + 'Controller'
          });

          $routeProvider.when('/' + modelName + '/', {
            templateUrl: '/views/' + modelName + 's/index.html',
            controller: modelName + 'Controller'
          });

          $routeProvider.when('/' + modelName + 's/:id', {
            templateUrl: function(urlattr) {
              var url = '/views/' + modelName + 's/show.html';
              if (urlattr.id.length != 24) {
                url = '/views/' + modelName + 's/' + urlattr.id + '.html';
              }
              console.log("SHOW URL" + url);
              return url;
            },
            controller: modelName + 'Controller'
          });

          $routeProvider.when('/' + modelName + 's/:id/:action', {
            templateUrl: function(urlattr) {
              var url = '/views/' + modelName + "s/" + urlattr.action + '.html';
              console.log(url);
              return url;
            },
            controller: modelName + 'Controller'
          });

          $routeProvider.when('/' + modelName + 's/:action', {
            templateUrl: function(urlattr) {
              var url = '/views/' + modelName + "s/" + urlattr.action + '.html';
              console.log(url);
              return url;
            },
            controller: modelName + 'Controller'
          });
        });

        // configure html5 to get links working on jsfiddle
        //$locationProvider.html5Mode(true);

        $locationProvider.html5Mode({
          enabled: true,
          requireBase: false
        });
      });
    }

  }

})(window.angular);
