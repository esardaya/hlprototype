'use strict';

/* Controllers */
angular.module('heuristicLabControllers', ['heuristicLabServices']).
  controller('HeuristicLabMainCtrl', ['$scope', '$location', '$http', 'SharedDataService', 'StorageService',
    'hlConfig', function ($scope, $location, $http, SharedDataService, StorageService, hlConfig) {
      // Scope variables
      $scope.logMessages = [];
      $scope.isAuthenticated = SharedDataService.isAuthenticated;
      $scope.currentView = SharedDataService.currentView;
      $scope.experimentAvailable = false;
      $scope.jobAvailable = false;
      $scope.jobFinished = false;
      $scope.progress = { visible: false, text: "", class: "progress", value: 0 };

      $scope.$on('isJobFinishedUpdated', function() {
        $scope.jobFinished = SharedDataService.isJobFinished;
      });

      $scope.$on('currentViewUpdated', function () {
        $scope.currentView = SharedDataService.currentView;
      });

      $scope.$on('authenticationUpdated', function () {
        $scope.isAuthenticated = SharedDataService.isAuthenticated;
      });

      $scope.$on('logUpdated', function () {
        $scope.logMessages = SharedDataService.logMessages;
      });

      $scope.$on('progressUpdated', function () {
        var data = SharedDataService.progressData;
        updateProgress(data.prefix, data.suffix, data.bytesLoaded, data.bytesTotal);
      });

      $scope.$on('loadingStarted', function () {
        $scope.progress.visible = true;
        $scope.progress.text = SharedDataService.loadingMessage;
        $scope.progress.class = "progress progress-striped active";
        $scope.progress.value = 100;
      });

      $scope.$on('loadingStopped', function () {
        $scope.progress.visible = false;
      });

      $scope.$on('experimentUpdated', function () {
        $scope.experimentAvailable = (SharedDataService.experiment != null &&
          SharedDataService.experiment['Variations'].length > 0);
      });

      $scope.$on('tasksUpdated', function () {
        $scope.jobAvailable = SharedDataService.tasks.length > 0;
      });

      $scope.logout = function () {
        SharedDataService.startLoading('Signing out ...');
        logout();
      };

      function updateProgress(prefix, suffix, bytesLoaded, bytesTotal) {
        var progressClass;
        var progressText;
        var progressValue;
        // A negative bytesTotal will show an animated stripped progress bar instead
        if (bytesTotal > 0) {
          progressValue = Math.round((bytesLoaded / bytesTotal) * 100);
          progressClass = "progress";
        } else {
          progressClass = "progress progress-striped active";
          progressValue = 100;
        }

        if (suffix === null) {
          progressText = prefix;
        } else {
          progressText = prefix + Math.floor(bytesLoaded) + suffix + " / " + Math.floor(bytesTotal) + suffix;
        }

        $scope.progress.text = progressText;
        $scope.progress.class = progressClass;
        $scope.progress.value = progressValue;
      }

      var logout = function () {
        $http.post(hlConfig.url + 'login/Logout', { Token: SharedDataService.authenticationToken }).
          success(function (data, status, headers, config) {
            SharedDataService.updateAuthenticationToken(null);
            SharedDataService.updateAuthenticated(false);

            var storagePromise = StorageService.removeUser();
            storagePromise.then(function (data) {
              $location.path('login');
            }, function (error) {
              SharedDataService.addErrorMessage(error.message);
            }, function (update) {
            });
          }).
          error(function (data, status, headers, config) {
            if (data.Message) {
              SharedDataService.addErrorMessage(data.Message);
            } else {
              SharedDataService.addErrorMessage("Could not connect to server");
            }
            SharedDataService.stopLoading();
          });
      }
    }
  ]);

