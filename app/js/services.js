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

heuristicLabServices.factory('SharedDataService', ['$rootScope', '$filter', function ($rootScope, $filter) {

  var service = {};

  service.currentView = 'creation';
  service.experiment = { 'Variations': [] };
  service.logMessages = [];
  service.progressData = null;
  service.loadingMessage = null;
  service.currentOptimizer = null;

  service.isAuthenticated = false;
  service.authenticationToken = null;

  service.jobId = null;
  service.tasks = [];
  service.isJobFinished = false;

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

  service.updateJobId = function (jobId) {
    this.jobId = jobId;
  };

  service.updateIsJobFinished = function (isJobFinished) {
    service.isJobFinished = isJobFinished;
    $rootScope.$broadcast("isJobFinishedUpdated");
  };

  service.updateTasks = function (job) {
    if (job['ExecutionState']) {
      if (job['ExecutionState'] == 'Stopped' && !service.isJobFinished) {
        this.updateIsJobFinished(true);
      } else if (job['ExecutionState'] != 'Stopped' && service.isJobFinished) {
        this.updateIsJobFinished(false);
      }
    }
    if (!job.hasOwnProperty('HiveTasks') && job['HiveTasks'].length < 1) {
      return;
    }

    this.tasks = $filter('orderBy')(job['HiveTasks'][0]['ChildHiveTasks'], 'Name');

    var finished = 0;

    for (var i = 0; i < this.tasks.length; i++) {
      if (this.tasks[i]['State'] == 'Finished') {
        finished++;
      }
    }

    this.updateIsJobFinished(finished == this.tasks.length);

    $rootScope.$broadcast("tasksUpdated");
  };

  return service;

}]);

heuristicLabServices.factory('WorkerService', ['$q', '$window', function ($q, $window) {

  $window.addEventListener('message', function(e) {
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
            service.sandbox.contentWindow.postMessage(service.messageQueue[0].data, '*');
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
  });

  var service = {};

  service.sandbox = $window.document.getElementById('sandbox');
  service.messageQueue = [];

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
      service.sandbox.contentWindow.postMessage(data, '*');
    }

    return defer.promise;
  };

  return service;
}]);

heuristicLabServices.factory('StorageService', ['$q', '$timeout', function($q, $timeout) {
  var service = {};

  service.saveUser = function (username, password) {
    var encrypted = CryptoJS.AES.encrypt(password, "HeuristicLab").toString();

    var defer = $q.defer();

    if (typeof chrome === "undefined") {
      localStorage['user'] = JSON.stringify({ username: username, password: encrypted});
      // "Simulate" an async operation
      $timeout(defer.resolve, 300);
    } else {
      chrome.storage.local.set({'user': { username: username, password: encrypted}}, function() {
        defer.resolve();
      });
    }

    return defer.promise;
  };

  service.loadUser = function() {
    var defer = $q.defer();
    var userData = null;

    if (typeof chrome === "undefined") {
      if (localStorage.hasOwnProperty('user')) {
        var jsonData = JSON.parse(localStorage['user']);

        if (jsonData != null) {
          var decrypted = CryptoJS.AES.decrypt(jsonData.password, "HeuristicLab").toString(CryptoJS.enc.Utf8);
          userData = {username: jsonData.username, password: decrypted};
        }
      }

      $timeout(function() {
        defer.resolve(userData);
      }, 300);
    } else {
      chrome.storage.local.get('user', function(data) {
        if (data.user) {
          if (data.user.username && data.user.password) {
            var decrypted = CryptoJS.AES.decrypt(data.user.password, "HeuristicLab").toString(CryptoJS.enc.Utf8);
            userData = {username: data.user.username, password: decrypted};
          }
        }

        defer.resolve(userData);
      });
    }

    return defer.promise;
  };

  service.removeUser = function() {
    var defer = $q.defer();
    if (typeof chrome == "undefined") {
      localStorage['user'] = null;
      // "Simulate" an async operation
      $timeout(defer.resolve, 300);
    } else {
      chrome.storage.local.remove('user', function() {
        defer.resolve();
      });
    }

    return defer.promise;
  };

  return service;

}]);