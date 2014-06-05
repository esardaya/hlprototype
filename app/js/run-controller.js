'use strict';

angular.module('heuristicLabControllers').
  controller('HeuristicLabRunCtrl', ['$scope', '$location', '$window', '$http', '$timeout', '$filter',
    'SharedDataService', 'hlConfig',
    function ($scope, $location, $window, $http, $timeout, $filter, SharedDataService, hlConfig) {

      if (!$scope.isAuthenticated) {
        // User is not authenticated
        $location.path('login');
        return;
      }

      if (SharedDataService.tasks.length < 1 || SharedDataService.jobId == null) {
        $location.path('upload');
        return;
      }

      SharedDataService.updateCurrentView('run');

      $scope.jobId = SharedDataService.jobId;
      $scope.tasks = SharedDataService.tasks;
      $scope.jobFinished = SharedDataService.isJobFinished;
      $scope.currentTaskIndex = -1;

      SharedDataService.stopLoading();

      $timeout(refreshJobStatus, hlConfig.refreshRate);

      $scope.$on('isJobFinishedUpdated', function() {
        $scope.jobFinished = SharedDataService.isJobFinished;
      });

      $scope.$on('tasksUpdated', function () {
        $scope.tasks = SharedDataService.tasks;
      });

      $scope.setTaskIndex = function(index) {
        $scope.currentTaskIndex = index;
      };

      $scope.resumeTask = function() {
        var task = $scope.tasks[$scope.currentTaskIndex];
        if (task && task['TaskId']) {
          $http.post(hlConfig.url + 'job/ResumeTask', { TaskId: task['TaskId'],
            Token: SharedDataService.authenticationToken}).
            success(function (data, status, headers, config) {
            }).
            error(function (data, status, headers, config) {
              SharedDataService.addErrorMessage('There was a problem resuming the task');
            });
        }
      };

      $scope.pauseTask = function() {
        var task = $scope.tasks[$scope.currentTaskIndex];
        if (task && task['TaskId']) {
          $http.post(hlConfig.url + 'job/PauseTask', { TaskId: task['TaskId'],
            Token: SharedDataService.authenticationToken}).
            success(function (data, status, headers, config) {
            }).
            error(function (data, status, headers, config) {
              SharedDataService.addErrorMessage('There was a problem pausing the task');
            });
        }
      };


      $scope.stopTask = function() {
        var task = $scope.tasks[$scope.currentTaskIndex];
        if (task && task['TaskId']) {
          $http.post(hlConfig.url + 'job/StopTask', { TaskId: task['TaskId'],
            Token: SharedDataService.authenticationToken}).
            success(function (data, status, headers, config) {
            }).
            error(function (data, status, headers, config) {
              SharedDataService.addErrorMessage('There was a problem stopping the task');
            });
        }
      };

      $scope.downloadExperiment = function() {
        if ($scope.jobId) {
          if (typeof chrome === "undefined") {
            SharedDataService.startLoading('Downloading Experiment');

            var url = hlConfig.url + 'job/Download?jobId=' +
              encodeURIComponent($scope.jobId) + '&token=' +
              encodeURIComponent(SharedDataService.authenticationToken);
            $http.get(url, {responseType: "blob"}).
              success(function (data, status, headers, config) {
                var url = URL.createObjectURL(data);
                $window.open(url, '_blank', '');
                SharedDataService.stopLoading();
              }).
              error(function (data, status, headers, config) {
                console.error(data);
                SharedDataService.stopLoading();
              });

          } else {
            chrome.fileSystem.chooseEntry({type: 'saveFile', suggestedName: 'experiment', accepts: [
              {extensions: ['hl']}
            ],
              acceptsAllTypes: false }, function (writableFileEntry) {
              $scope.$apply(function () {
                SharedDataService.startLoading('Saving Experiment');
              });
              writableFileEntry.createWriter(function (writer) {
                writer.onerror = function (e) {
                  SharedDataService.addErrorMessage('Write failed: ' + e.toString());
                };
                writer.onwriteend = function (e) {
                  SharedDataService.addLogMessage('Write complete');
                  $scope.$apply(function () {
                    SharedDataService.stopLoading();
                  });
                };

                var url = hlConfig.url + 'job/Download?jobId=' +
                  encodeURIComponent($scope.jobId) + '&token=' +
                  encodeURIComponent(SharedDataService.authenticationToken);
                $http.get(url, {responseType: "blob"}).
                  success(function (data, status, headers, config) {
                    writer.write(data);
                  }).
                  error(function (data, status, headers, config) {
                    console.error(data);
                    SharedDataService.stopLoading();
                  });
              });
            });
          }
        }
      };

      function refreshJobStatus() {
        if ($scope.jobId) {
          $http.get(hlConfig.url + 'job/Load?jobId=' +
            encodeURIComponent($scope.jobId) + '&token=' +
            encodeURIComponent(SharedDataService.authenticationToken)).
            success(function (data, status, headers, config) {
              SharedDataService.updateTasks(data);
              if (!$scope.jobFinished) {
                $timeout(refreshJobStatus, hlConfig.refreshRate);
              }
            }).
            error(function (data, status, headers, config) {
              console.error(data);
            });
        }
      }
    }
  ]);