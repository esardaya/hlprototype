'use strict';

angular.module('heuristicLabControllers').
  controller('HeuristicLabCreationCtrl', ['$scope', '$location', 'WorkerService', 'SharedDataService',
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
    $scope.generationValues = [];
    $scope.newValue = { value: null, isValid: true};

    // Initialize
    if (!$scope.initialized) {
      initialize();
    } else {
      SharedDataService.stopLoading();
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
      if ($scope.currentParameterDetails != null) {
        $scope.calculateVariations();
      }
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
      }
    };

    $scope.toggleParameter = function(parameter) {
      $scope.parameters[parameter] = !$scope.parameters[parameter];
      parameterToggled(parameter, $scope.parameters[parameter]);
    };

    $scope.toggleChoice = function(value) {
      $scope.currentParameterDetails.values[value] = !$scope.currentParameterDetails.values[value];
    };

    $scope.addNewValue = function() {
      $scope.currentParameterDetails.values.push($scope.newValue);
      $scope.newValue = { value: null, isValid: true};
    };

    $scope.validateInput = function(input, isNewValue) {
      if ($scope.currentParameterDetails != null) {
        if ($scope.currentParameterDetails.type == 'intarray') {
          // Validate integer
          var intValue = parseInt(input.value);
          if (intValue != input.value || intValue < 0) {
            if (input.isValid) {
              input.isValid = false;
              if (!isNewValue)
                $scope.currentParameterDetails.invalidCount++;
            }
          } else {
            if (!input.isValid) {
              input.isValid = true;
              if (!isNewValue)
                $scope.currentParameterDetails.invalidCount--;
            }
          }
        } else if ($scope.currentParameterDetails.type == 'doublearray') {
          // Validate float
          var floatValue = parseFloat(input.value);
          if (floatValue != input.value || floatValue < 0) {
            if (input.isValid) {
              input.isValid = false;
              if (!isNewValue)
                $scope.currentParameterDetails.invalidCount++;
            }
          } else {
            if (!input.isValid) {
              input.isValid = true;
              if (!isNewValue)
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
      SharedDataService.updateIsJobFinished(false);
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

    $scope.areGenerationValuesValid = function() {
      $scope.validationError = null;
      var intOnly = $scope.currentParameterDetails.type === 'intarray';

      for(var key in $scope.generationValues) {
        if ($scope.generationValues.hasOwnProperty(key)) {
          var value = $scope.generationValues[key];
          var parsed = intOnly ?  parseInt(value) : parseFloat(value);
          if (parsed != value) {
            $scope.validationError = 'Only valid ' + (intOnly ? 'integer' : 'floating point') + ' values are allowed';
            return false;
          }

          if (parsed < 0) {
            $scope.validationError = 'Only non-negative values are allowed';
            return false;
          }
        }
      }

      if ($scope.generationValues['Minimum'] > $scope.generationValues['Maximum']) {
        $scope.validationError = 'Minimum cannot be higher than maximum';
        return false;
      }

      return true;
    };

    $scope.generateValues = function() {
      var values = [];
      var min = $scope.generationValues['Minimum'];
      var max = $scope.generationValues['Maximum'];
      var step = $scope.generationValues['Step'];

      var intOnly = $scope.currentParameterDetails.type === 'intarray';

      var minimumIncluded = false;
      var value = max;
      var i = 1;
      while (value >= min) {
        if (isAlmost(value, min)) {
          values.push({ value: min, isValid: true});
          minimumIncluded = true;
        } else {
          values.push({ value: value, isValid: true});
        }

        if (step == 0) break;

        if (intOnly) {
          value = parseInt(max - i * step);
        } else {
          value = max - i * step;
        }
        i++;
      }
      if (!minimumIncluded) {
        values.push({ value: min, isValid: true});
      }

      $scope.currentParameterDetails.values = values;
    };

    $scope.removeValue = function(value) {
      var index = $scope.currentParameterDetails.values.indexOf(value);
      if (index > -1) {
        $scope.currentParameterDetails.values.splice(index, 1);
      }
    };

    $scope.isArrayValue = function() {
      return $scope.currentParameterDetails != null && ($scope.currentParameterDetails.type === 'intarray' ||
        $scope.currentParameterDetails.type === 'doublearray');
    };

    function isAlmost(value, target) {
      if (!isFinite(value)) {
        if (value > 0)
          return target == Number.POSITIVE_INFINITY;
        else
          return target == Number.NEGATIVE_INFINITY;

      } else {
        return Math.abs(value - target) < 1.0E-12;
      }
    }

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
          if ($scope.currentParameterDetails.type === 'intarray' ||
            $scope.currentParameterDetails.type === 'doublearray') {
            getDefaultGenerationValues();
            $scope.newValue = { value: null, isValid: true};
          }
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
              $scope.newValue = { value: null, isValid: true};
              for (var a = 0; a < data.values.length; a++) {
                $scope.currentParameterDetails.values.push({ value: data.values[a], isValid: true });
                $scope.currentParameterDetails.invalidCount = 0;
              }
              getDefaultGenerationValues();
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

    function getDefaultGenerationValues() {
      //var intOnly = $scope.currentParameterDetails.type === 'intarray';
      var values = getParameterValues($scope.currentParameterDetails.values);
      var min, max, step;
      var len = values.length;
      min = Math.min.apply(Math, values);
      max = Math.max.apply(Math, values);
      step = len >= 2 ? Math.abs(values[len - 1] - values[len - 2]) : 1;

      $scope.generationValues = [];
      $scope.generationValues['Minimum'] = min;
      $scope.generationValues['Maximum'] = max;
      $scope.generationValues['Step'] = step;
    }

    function getParameterValues(array) {
      var values = [];
      for (var i = 0; i < array.length; i++) {
        values.push(array[i].value);
      }
      return values;
    }
  }
]);
