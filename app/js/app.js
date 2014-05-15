'use strict';


// Declare app level module which depends on filters, and services
var heuristicLab = angular.module('heuristicLab', [
  'ngRoute',
  'heuristicLabControllers',
  'heuristicLabServices'
]);

heuristicLab.config(['$routeProvider',
  function($routeProvider) {
    $routeProvider.
      when('/creation', {
        templateUrl: 'partials/creation.html',
        controller: 'HeuristicLabCreationCtrl'
      }).
      when('/results', {
        templateUrl: 'partials/results.html',
        controller: 'HeuristicLabResultsCtrl'
      }).
      otherwise({
        redirectTo: '/creation'
      });
  }
]);
