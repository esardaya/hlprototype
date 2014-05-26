'use strict';

/* Controllers */
var heuristicLabControllers = angular.module('heuristicLabControllers', [
  'heuristicLabServices'
]);

heuristicLabControllers.controller('HeuristicLabMainCtrl', ['$scope', '$location', '$http', 'SharedDataService',
  'hlConfig', function ($scope, $location, $http, SharedDataService, hlConfig) {
    // Scope variables
    $scope.logMessages = [];
    $scope.isAuthenticated = SharedDataService.isAuthenticated;
    $scope.currentView = SharedDataService.currentView;
    $scope.experimentAvailable = false;
    $scope.jobAvailable = false;
    $scope.progress = { visible: false, text: "", class: "progress", value: 0 };

    $scope.$on('currentViewUpdated', function () {
      $scope.currentView = SharedDataService.currentView;
    });

    $scope.$on('authenticationUpdated', function() {
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

    $scope.$on('jobUpdated', function () {
      $scope.jobAvailable = SharedDataService.job.hasOwnProperty('HiveTasks') &&
        SharedDataService.job['HiveTasks'].length > 0;
    });

    $scope.logout = function() {
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

    var logout = function() {
      $http.post(hlConfig.url + 'login/Logout', { Token: SharedDataService.authenticationToken }).
        success(function(data, status, headers, config) {
          SharedDataService.updateAuthenticationToken(null);
          SharedDataService.updateAuthenticated(false);
          chrome.storage.local.remove('user', function() {
            $scope.$apply(function() {
              SharedDataService.stopLoading();
              $location.path('login');
            });
          });
        }).
        error(function(data, status, headers, config) {
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

heuristicLabControllers.controller('HeuristicLabLoginCtrl', ['$scope', '$http', '$location', 'SharedDataService',
  'hlConfig', function ($scope, $http, $location, SharedDataService, hlConfig) {

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

    chrome.storage.local.get('user', function(data) {
      if (data.user) {
        if (data.user.username && data.user.password) {
          $scope.$apply(function () {
            $scope.username = data.user.username;
            var decrypted = CryptoJS.AES.decrypt(data.user.password, "HeuristicLab").toString(CryptoJS.enc.Utf8);
            $scope.password = decrypted;

            $scope.login();
          });
        }
      }
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
            var encrypted = CryptoJS.AES.encrypt($scope.password, "HeuristicLab").toString();
            chrome.storage.local.set({'user': { username: $scope.username, password: encrypted}}, function() {
              $scope.$apply(function() {
                $location.path('creation');
              });
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

heuristicLabControllers.controller('HeuristicLabCreationCtrl', ['$scope', '$location', 'WorkerService', 'SharedDataService',
  'CreationService', function ($scope, $location, WorkerService, SharedDataService, CreationService) {

    if (!$scope.isAuthenticated) {
      // User is not authenticated
      $location.path('login');
      return;
    }
    // Model variables
    $scope.algorithms = CreationService.algorithms;
    $scope.problems = CreationService.problems;
    $scope.parameters = CreationService.parameters;
    $scope.parameterDetails = CreationService.parameterDetails;
    $scope.currentAlgorithm = CreationService.currentAlgorithm;
    $scope.currentProblem = CreationService.currentProblem;
    $scope.currentParameter = CreationService.currentParameter;
    $scope.currentParameterDetails = CreationService.currentParameterDetails;
    $scope.variations = CreationService.variations;
    $scope.initialized =  CreationService.initialized;

    // Initialize
    if (!$scope.initialized) {
      initialize();
    }

    SharedDataService.updateCurrentView('creation');

    // Listen to local changes to modify model service
    $scope.$watch('algorithms', function() {
      CreationService.updateAlgorithms($scope.algorithms);
    }, true);

    $scope.$watch('problems', function() {
      CreationService.updateProblems($scope.problems);
    }, true);

    $scope.$watch('parameters', function() {
      CreationService.updateParameters($scope.parameters);
    }, true);

    $scope.$watch('parameterDetails', function() {
      CreationService.updateParameterDetails($scope.parameterDetails);
    }, true);

    $scope.$watch('currentAlgorithm', function() {
      CreationService.updateCurrentAlgorithm($scope.currentAlgorithm);
    }, true);

    $scope.$watch('currentProblem', function() {
      CreationService.updateCurrentProblem($scope.currentProblem);
    }, true);

    $scope.$watch('currentParameter', function() {
      CreationService.updateCurrentParameter($scope.currentParameter);
    }, true);

    $scope.$watch('currentParameterDetails', function() {
      CreationService.updateCurrentParameterDetails($scope.currentParameterDetails);
    }, true);

    $scope.$watch('variations', function() {
      CreationService.updateVariations($scope.variations);
    }, true);

    $scope.setAlgorithm = function (algorithm) {
      $scope.currentAlgorithm = algorithm;
      getProblems();
    };

    $scope.setProblem = function (problem) {
      $scope.currentProblem = problem;
      $scope.parameters = {};
      $scope.currentParameter = null;
      $scope.currentParameterDetails = null;
      $scope.parameterDetails = {};
      $scope.variations = 1;
      getParameters();
    };

    $scope.setParameter = function(parameter) {
      if ($scope.currentParameter != parameter) {
        if (!$scope.areDetailsValid()) {
          return;
        }
      }
      if ($scope.currentParameter) {
        // Cache details
        $scope.parameterDetails[$scope.currentParameter] = $scope.currentParameterDetails;
      }

      $scope.currentParameter = parameter;
      $scope.currentParameterDetails = null;
      // toggleParameter will be called before this function when clicking on a checkbox
      if ($scope.parameters[parameter]) {
        getParameterDetails();
      } else {
        $scope.calculateVariations();
      }
    };

    $scope.toggleParameter = function(parameter) {
      $scope.parameters[parameter] = !$scope.parameters[parameter];
      parameterToggled(parameter, $scope.parameters[parameter]);
    };

    $scope.toggleChoice = function(value) {
      $scope.currentParameterDetails.values[value] = !$scope.currentParameterDetails.values[value];
      $scope.calculateVariations();
    };

    $scope.validateInput = function(input) {
      if ($scope.currentParameterDetails != null) {
        if ($scope.currentParameterDetails.type == 'intarray') {
          // Validate integer
          var intValue = parseInt(input.value);
          if (intValue != input.value || intValue < 0) {
            if (input.isValid) {
              input.isValid = false;
              $scope.currentParameterDetails.invalidCount++;
            }
          } else {
            if (!input.isValid) {
              input.isValid = true;
              $scope.currentParameterDetails.invalidCount--;
            }
          }
        } else if ($scope.currentParameterDetails.type == 'doublearray') {
          // Validate float
          var floatValue = parseFloat(input.value);
          if (floatValue != input.value || floatValue < 0) {
            if (input.isValid) {
              input.isValid = false;
              $scope.currentParameterDetails.invalidCount++;
            }
          } else {
            if (!input.isValid) {
              input.isValid = true;
              $scope.currentParameterDetails.invalidCount--;
            }
          }
        }
      }
    };

    $scope.areDetailsValid = function() {
      return !($scope.currentParameterDetails != null &&
        $scope.currentParameterDetails.invalidCount &&
        $scope.currentParameterDetails.invalidCount > 0);
    };

    $scope.calculateVariations = function() {
      var instanceCount = 1;
      var intParameterVariations = 1;
      var doubleParameterVariations = 1;
      var boolParameterVariations = 1;
      var choiceParameterVariations = 1;

      // Loop through all current details, only ignoring the current details because they haven't been cached yet
      for(var key in $scope.parameterDetails) {
        if ($scope.parameterDetails.hasOwnProperty(key)) {
          var details = $scope.parameterDetails[key];
          if (key == $scope.currentParameter){
            details = $scope.currentParameterDetails;
          }
          if (details != null) {
            switch (details.type) {
              case 'choice':
                choiceParameterVariations *= Math.max(getSelectedChoiceCount(details.values), 1);
                break;
              case 'intarray':
                intParameterVariations *= Math.max(details.values.length, 1);
                break;
              case 'doublearray':
                doubleParameterVariations *= Math.max(details.values.length, 1);
                break;
              case 'bool':
                boolParameterVariations *= 2;
                break;
            }
          }
        }
      }

      $scope.variations = (instanceCount * intParameterVariations * doubleParameterVariations *
        boolParameterVariations * choiceParameterVariations);
    };

    $scope.generateExperiment = function() {
      if ($scope.currentParameter) {
        $scope.parameterDetails[$scope.currentParameter] = $scope.currentParameterDetails;
      }
      SharedDataService.startLoading('Generating Experiment ...');
      // Clear job data
      SharedDataService.updateJob({});
      var promise = WorkerService.doWork({ operation: 'generateExperiment', data: $scope.parameterDetails });
      promise.then(function (data) {
        var experiment = data != null ? data.experiment : { 'Variations': [] };
        SharedDataService.updateExperiment(experiment);
        if (experiment['Variations'].length > 0) {
          SharedDataService.updateCurrentOptimizer(experiment['Variations'][0]);
        }
        $location.path('upload');
      }, function (error) {
        SharedDataService.addErrorMessage(error.message);
      }, function (update) {
        handleNotification(update);
      });
    };

    function initialize() {
      // Show loading bar
      SharedDataService.startLoading('Initializing ...');
      var promise = WorkerService.doWork({ operation: 'initialize', url: $location.absUrl() });
      promise.then(function () {
        CreationService.initialized = true;
        $scope.initialized = true;
        getAlgorithms();
      }, function (error) {
        SharedDataService.stopLoading();
        SharedDataService.addErrorMessage(error.message);
      }, function (update) {
        handleNotification(update);
      });
    }

    function handleNotification(data) {
      if (data.operation) {
        switch (data.operation) {
          case 'progress':
            SharedDataService.updateProgress(data);
            break;
          case 'log':
            SharedDataService.addLogMessage(data.message);
            break;
        }
      }
    }

    function getSelectedChoiceCount(values) {
      var count = 0;
      for (var key in values) {
        if (values.hasOwnProperty(key)) {
          if (values[key]) {
            count++;
          }
        }
      }
      return count;
    }

    function parameterToggled(parameter, checked) {
      var promise = WorkerService.doWork({
        operation: 'parameterToggled',
        parameter: parameter,
        checked: checked
      });

      promise.then(function (data) {
        if (data != null) {
          $scope.parameters[parameter] = data.checked;
        }
      }, function (error) {
        SharedDataService.addErrorMessage(error.message);
      }, function (update) {
        handleNotification(update);
      });
    }

    function getAlgorithms() {
      SharedDataService.startLoading('Loading Algorithms ...');
      var promise = WorkerService.doWork({ operation: 'getAlgorithms'});
      promise.then(function (data) {
        $scope.algorithms = data != null ? data.names : [];
        if ($scope.algorithms.length > 0) {
          $scope.setAlgorithm($scope.algorithms[0]);
        }
      }, function (error) {
        SharedDataService.stopLoading();
        SharedDataService.addErrorMessage(error.message);
      }, function (update) {
        handleNotification(update);
      });
    }

    function getParameterDetails() {
      // Get parameter details for the current parameter
      // Check if details are cached
      if ($scope.currentParameter in $scope.parameterDetails) {
        if ($scope.parameterDetails[$scope.currentParameter] != null) {
          $scope.currentParameterDetails = $scope.parameterDetails[$scope.currentParameter];
          $scope.calculateVariations();
          return;
        }
      }

      var promise = WorkerService.doWork({
        operation: 'getParameterDetails',
        parameter: $scope.currentParameter
      });

      promise.then(function (data) {
        if (data != null && data.type) {
          $scope.currentParameterDetails = {};
          $scope.currentParameterDetails.type = data.type;
          switch (data.type) {
            case 'choice':
              $scope.currentParameterDetails.values = {};
              for (var c = 0; c < data.values.length; c++) {
                $scope.currentParameterDetails.values[data.values[c].key] = data.values[c].checked;
              }
              break;
            case 'intarray':
            case 'doublearray':
              $scope.currentParameterDetails.values = [];
              for (var a = 0; a < data.values.length; a++) {
                $scope.currentParameterDetails.values.push({ value: data.values[a], isValid: true });
                $scope.currentParameterDetails.invalidCount = 0;
              }
              break;
            case 'bool':
              // No other data necessary besides the type
              break;
            default:
              $scope.currentParameterDetails = null;
          }
        } else {
          $scope.currentParameterDetails = data;
        }
        // Add details to cache
        $scope.parameterDetails[$scope.currentParameter] = $scope.currentParameterDetails;
        $scope.calculateVariations();
      }, function (error) {
        SharedDataService.addErrorMessage(error.message);
      }, function (update) {
        handleNotification(update);
      });
    }

    function getParameters() {
      SharedDataService.startLoading('Loading Parameters ...');
      // Get parameters for current algorithm and problem combination
      var promise = WorkerService.doWork({
        operation: 'getParameters',
        problem: $scope.currentProblem
      });

      promise.then(function (data) {
        SharedDataService.stopLoading();
        var parameters = data != null ? data.names : [];
        $scope.parameters = {};
        for (var i = 0; i < parameters.length; i++) {
          $scope.parameters[parameters[i]] = false;
        }
      }, function (error) {
        SharedDataService.stopLoading();
        SharedDataService.addErrorMessage(error.message);
      }, function (update) {
        handleNotification(update);
      });
    }

    function getProblems() {
      SharedDataService.startLoading('Loading Problems ...');
      var promise = WorkerService.doWork({
        operation: 'getProblems',
        algorithm: $scope.currentAlgorithm
      });

      promise.then(function (data) {
        $scope.problems = data != null ? data.names : [];
        if ($scope.problems.length > 0) {
          $scope.setProblem($scope.problems[0]);
        }
      }, function (error) {
        SharedDataService.stopLoading();
        SharedDataService.addErrorMessage(error.message);
      }, function (update) {
        handleNotification(update);
      });
    }
  }
]);

heuristicLabControllers.controller('HeuristicLabUploadCtrl', ['$scope', '$location', '$http', 'SharedDataService',
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
      // Clear job data
      SharedDataService.updateJob({});
      $scope.experiment['Token'] = SharedDataService.authenticationToken;

      $http.post(hlConfig.url + 'job/Upload', $scope.experiment).
        success(function(data, status, headers, config) {
          SharedDataService.updateJob(data);
          $location.path('run');
        }).
        error(function(data, status, headers, config) {
          SharedDataService.stopLoading();
          console.error(data);
        });
    };
  }
]);

heuristicLabControllers.controller('HeuristicLabRunCtrl', ['$scope', '$location', '$http', '$timeout', '$filter',
  'SharedDataService', 'hlConfig', function ($scope, $location, $http, $timeout, $filter, SharedDataService, hlConfig) {

    if (!$scope.isAuthenticated) {
      // User is not authenticated
      $location.path('login');
      return;
    }

    if (!SharedDataService.job.hasOwnProperty('HiveTasks') && job['HiveTasks'].length < 1) {
      $location.path('upload');
      return;
    }

    SharedDataService.updateCurrentView('run');

    $scope.tasks = $filter('orderBy')(SharedDataService.job['HiveTasks'][0]['ChildHiveTasks'], 'Name');
    $scope.currentTaskIndex = -1;

    SharedDataService.stopLoading();

    $timeout(refreshJobStatus, hlConfig.refreshRate);

    $scope.$on('jobUpdated', function () {
      if (!SharedDataService.job.hasOwnProperty('HiveTasks') && SharedDataService.job['HiveTasks'].length < 1) {
        $location.path('upload');
        return;
      }
      $scope.tasks = $filter('orderBy')(SharedDataService.job['HiveTasks'][0]['ChildHiveTasks'], 'Name');
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

    function refreshJobStatus() {
      if (SharedDataService.job['JobId']) {
        $http.get(hlConfig.url + 'job/Load?jobId=' +
          encodeURIComponent(SharedDataService.job['JobId']) + '&token=' +
          encodeURIComponent(SharedDataService.authenticationToken)).
          success(function (data, status, headers, config) {
            SharedDataService.updateJob(data);
            var experimentState = data['HiveTasks'][0]['State'];
            if (experimentState != 'Finished') {
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
