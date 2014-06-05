'use strict';

angular.module('heuristicLabControllers').
  controller('HeuristicLabLoginCtrl', ['$scope', '$http', '$location', 'SharedDataService',
  'StorageService', 'hlConfig', function ($scope, $http, $location, SharedDataService, StorageService, hlConfig) {

    if ($scope.isAuthenticated) {
      // User is already authenticated
      $location.path('creation');
      return;
    }

    SharedDataService.stopLoading();

    // Scope variables
    $scope.username = null;
    $scope.password = null;
    $scope.rememberMe = false;
    $scope.errorMessage = null;

    var storagePromise = StorageService.loadUser();
    storagePromise.then(function (data) {
      if (data != null) {
        $scope.username = data.username;
        $scope.password = data.password;
        $scope.login();
      }
    }, function (error) {
      SharedDataService.addErrorMessage(error.message);
    }, function (update) {
    });

    $scope.login = function() {
      SharedDataService.startLoading('Authenticating ...');
      $http.post(hlConfig.url + 'login/Authenticate', { username: $scope.username, password: $scope.password }).
        success(function(data, status, headers, config) {
          $scope.errorMessage = null;
          data = data.replace(/(^"|"$)/g, '');
          SharedDataService.updateAuthenticationToken(data);
          SharedDataService.updateAuthenticated(true);

          if ($scope.rememberMe) {
            var storagePromise = StorageService.saveUser($scope.username, $scope.password);
            storagePromise.then(function (data) {
              $location.path('creation');
            }, function (error) {
              SharedDataService.addErrorMessage(error.message);
            }, function (update) {
            });
          } else {
            $location.path('creation');
          }
        }).
        error(function(data, status, headers, config) {
          $scope.password = null;
          if (data.Message) {
            $scope.errorMessage = data.Message;
          } else {
            $scope.errorMessage = "Could not connect to server";
          }
          SharedDataService.stopLoading();
        });
    };
  }
]);
