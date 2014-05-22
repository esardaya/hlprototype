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
    console.log("Configured");
  }
]);

heuristicLab.config(['$sceDelegateProvider',
  function($sceDelegateProvider) {
    $sceDelegateProvider.resourceUrlWhitelist([
      // Allow same origin resource loads.
      'self',
      // Allow loading from our assets domain.  Notice the difference between * and **.
      'http://localhost:8000/app/partials/**']);
  }
]);

heuristicLab.config(['$routeProvider',
  function($routeProvider) {
    $routeProvider.
      when('/login', {
        templateUrl: 'http://localhost:8000/app/partials/login.html',
        controller: 'HeuristicLabLoginCtrl'
      }).
      when('/creation', {
        templateUrl: 'http://localhost:8000/app/partials/creation.html',
        controller: 'HeuristicLabCreationCtrl'
      }).
      when('/results', {
        templateUrl: 'http://localhost:8000/app/partials/upload.html',
        controller: 'HeuristicLabUploadCtrl'
      }).
      when('/job', {
        templateUrl: 'http://localhost:8000/app/partials/job.html',
        controller: 'HeuristicLabJobCtrl'
      }).
      otherwise({
        redirectTo: '/creation'
      });
  }
]);
