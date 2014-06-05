'use strict';

angular.module('heuristicLabControllers').
  controller('HeuristicLabUploadCtrl', ['$scope', '$location', '$http', 'SharedDataService',
    'hlConfig', function ($scope, $location, $http, SharedDataService, hlConfig) {

      if (!$scope.isAuthenticated) {
        // User is not authenticated
        $location.path('login');
        return;
      }

      $scope.experiment = SharedDataService.experiment;
      $scope.currentOptimizer = SharedDataService.currentOptimizer;

      SharedDataService.stopLoading();

      if ($scope.experiment == null || $scope.experiment['Variations'].length < 1) {
        $location.path('creation');
        return;
      }

      SharedDataService.updateCurrentView('upload');

      $scope.$watch('currentOptimizer', function() {
        SharedDataService.updateCurrentOptimizer($scope.currentOptimizer);
      }, true);

      $scope.setOptimizer = function(optimizer) {
        $scope.currentOptimizer = optimizer;
      };

      $scope.upload = function() {
        SharedDataService.startLoading('Uploading Experiment ...');
        SharedDataService.updateIsJobFinished(false);
        $scope.experiment['Token'] = SharedDataService.authenticationToken;
        $http.post(hlConfig.url + 'job/Upload', $scope.experiment).
          success(function(data, status, headers, config) {
            SharedDataService.updateJobId(data['JobId']);
            SharedDataService.updateTasks(data);
            $location.path('run');
          }).
          error(function(data, status, headers, config) {
            SharedDataService.stopLoading();
            console.error(data);
          });
      };
    }
  ]);
