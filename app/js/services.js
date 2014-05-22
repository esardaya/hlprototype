'use strict';

/* Services */
var heuristicLabServices = angular.module('heuristicLabServices', []);

heuristicLabServices.factory('CreationService', ['$rootScope', function ($rootScope) {
  var service = {};

  service.initialized = false;

  service.algorithms = [];
  service.problems = [];
  service.parameters = {};
  service.parameterDetails = {};
  service.currentAlgorithm = null;
  service.currentProblem = null;
  service.currentParameter = null;
  service.currentParameterDetails = null;
  service.variations = 1;

  service.updateAlgorithms = function (algorithms) {
    this.algorithms = algorithms;
    $rootScope.$broadcast("algorithmsUpdated");
  };

  service.updateProblems = function (problems) {
    this.problems = problems;
    $rootScope.$broadcast("problemsUpdated");
  };

  service.updateParameters = function (parameters) {
    this.parameters = parameters;
    $rootScope.$broadcast("parametersUpdated");
  };

  service.updateParameterDetails = function (details) {
    this.parameterDetails = details;
    $rootScope.$broadcast("parameterDetailsUpdated");
  };

  service.updateCurrentAlgorithm = function (algorithm) {
    this.currentAlgorithm = algorithm;
    $rootScope.$broadcast("currentAlgorithmUpdated");
  };

  service.updateCurrentProblem = function (problem) {
    this.currentProblem = problem;
    $rootScope.$broadcast("currentProblemUpdated");
  };

  service.updateCurrentParameter = function (parameter) {
    this.currentParameter = parameter;
    $rootScope.$broadcast("currentParameterUpdated");
  };

  service.updateCurrentParameterDetails = function (details) {
    this.currentParameterDetails = details;
    $rootScope.$broadcast("currentParameterDetailsUpdated");
  };

  service.updateVariations = function (variations) {
    this.variations = variations;
    $rootScope.$broadcast("variationsUpdated");
  };

  return service;
}]);

heuristicLabServices.factory('SharedDataService', ['$rootScope', function ($rootScope) {

  var service = {};

  service.currentView = 'creation';
  service.experiment = { 'Variations': [] };
  service.logMessages = [];
  service.progressData = null;
  service.loadingMessage = null;
  service.currentOptimizer = null;

  service.isAuthenticated = false;
  service.authenticationToken = null;

  service.job = {};

  function addLogEntry(type, message) {
    var lines = message.split("\n");
    for (var i = 0, l = lines.length; i < l; i++) {
      var line = lines[i];
      service.logMessages.push({type: type, message: line});
    }
    $rootScope.$broadcast("logUpdated");
  }

  service.updateCurrentView = function(view) {
    this.currentView = view;
    $rootScope.$broadcast("currentViewUpdated");
  };

  service.updateExperiment = function (experiment) {
    this.experiment = experiment;
    $rootScope.$broadcast("experimentUpdated");
  };

  service.updateProgress = function (progressData) {
    this.progressData = progressData;
    $rootScope.$broadcast("progressUpdated");
  };

  service.startLoading = function (message) {
    this.loadingMessage = message;
    $rootScope.$broadcast("loadingStarted");
  };

  service.stopLoading = function () {
    $rootScope.$broadcast("loadingStopped");
  };

  service.updateAuthenticated = function (isAuthenticated) {
    this.isAuthenticated = isAuthenticated;
    $rootScope.$broadcast("authenticationUpdated");
  };

  service.updateAuthenticationToken = function (authenticationToken) {
    this.authenticationToken = authenticationToken;
    $rootScope.$broadcast("authenticationToken");
  };

  service.addLogMessage = function(message) {
    addLogEntry('log', message);
    $rootScope.$broadcast("logUpdated");
  };

  service.addErrorMessage = function(message) {
    addLogEntry('error', message);
    $rootScope.$broadcast("logUpdated");
  };

  service.updateCurrentOptimizer = function (optimizer) {
    this.currentOptimizer = optimizer;
    $rootScope.$broadcast("currentOptimizerUpdated");
  };

  service.updateCurrentJob = function (job) {
    this.job = job;
    $rootScope.$broadcast("currentJobUpdated");
  };

  return service;

}]);

heuristicLabServices.factory('WorkerService', ['$q', function ($q) {

  var service = {};

  service.worker = new Worker('js/worker.js');
  service.messageQueue = [];

  service.worker.onmessage = function (e) {
    if (e.data.operation) {
      var pendingOperation = service.messageQueue[0].data.operation;
      var defer = service.messageQueue[0].defer;

      switch (e.data.operation) {
        case 'error':
        case pendingOperation:
          if (e.data.operation == 'error') {
            defer.reject(e.data);
          } else {
            defer.resolve(e.data);
          }
          // Since it has been resolved we remove this message from the queue
          service.messageQueue.shift();
          // Post the next message in queue, if any
          if (service.messageQueue.length > 0) {
            service.worker.postMessage(service.messageQueue[0].data);
          }
          break;
        case 'log':
        case 'progress':
          defer.notify(e.data);
          break;
        default:
          console.error('Operation "' + e.data.operation + '" not supported');
          service.messageQueue.shift();
          break;
      }
    } else {
      console.log('Unknown message received from worker: ' + e.data);
    }
  };

  service.doWork = function (data) {
    if (!data.operation || typeof(data.operation) !== "string") {
      console.error('Missing "operation" for doWork');
      return;
    }

    var defer = $q.defer();
    // Enqueue the request
    service.messageQueue.push({defer: defer, data: data});

    // If there aren't other requests in queue, post the message to the worker
    if (service.messageQueue.length < 2) {
      service.worker.postMessage(data);
    }

    return defer.promise;
  };

  return service;
}]);
