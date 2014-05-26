'use strict';


// Declare app level module which depends on filters, and services
var heuristicLab = angular.module('heuristicLab', [
  'ngRoute',
  'heuristicLabControllers',
  'heuristicLabServices'
]);

heuristicLab.config(['$compileProvider',
  function($compileProvider) {
    $compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|ftp|mailto|chrome-extension):/);
  }
]);

heuristicLab.config(['$routeProvider',
  function($routeProvider) {
    $routeProvider.
      when('/login', {
        templateUrl: 'partials/login.html',
        controller: 'HeuristicLabLoginCtrl'
      }).
      when('/creation', {
        templateUrl: 'partials/creation.html',
        controller: 'HeuristicLabCreationCtrl'
      }).
      when('/upload', {
        templateUrl: 'partials/upload.html',
        controller: 'HeuristicLabUploadCtrl'
      }).
      when('/run', {
        templateUrl: 'partials/run.html',
        controller: 'HeuristicLabRunCtrl'
      }).
      otherwise({
        redirectTo: '/login'
      });
  }
]);

heuristicLab.directive('slimScroll', function() {
  return {
    // Restrict it to be an attribute in this case
    restrict: 'A',
    // responsible for registering DOM listeners as well as updating the DOM
    link: function(scope, element, attrs) {
      $(element).slimScroll({
        height: attrs.slimScroll + 'px'
      });
    }
  };
});

heuristicLab.constant('hlConfig', {
  url: 'http://localhost:51802/api/',
  refreshRate: 4000
});
