// JavaScript source code
"use strict";

var jsilConfig = {};

var window = {
  $scriptLoadFailed: null
};

var baseUrl = "";
var problems = null;
var algorithms = null;
var parameters = [];
var paramValues = [];
var algorithmInstances = [];

var currentAlgorithm = null;
var currentProblem = null;

var assembly = null;
var assemblies = null;

var programAssembly = null;
var program = null;


self.onmessage = function (event) {
  var data = event.data;

  if (data.operation) {
    try {
      switch (data.operation) {
        case 'initialize':

          baseUrl = data.url;
          var index = baseUrl.indexOf('index.html');
          if (index != -1) {
            baseUrl = baseUrl.substring(0, index);
          }

          jsilConfig = {
            printStackTrace: true,
            environment: "webworker",
            scriptRoot: baseUrl + "js/JSIL/HeuristicLab/",
            libraryRoot: baseUrl + "js/JSIL/Libraries/",
            manifests: [
              baseUrl + "js/JSIL/HeuristicLab/Test.exe"
            ]
          };

          importScripts(baseUrl + 'js/worker-functions.js');

          importScripts(baseUrl + 'js/JSIL/Libraries/JSIL.js');

          beginLoading();
          break;
        case 'getAlgorithms':
          getAlgorithms();
          break;
        case 'getProblems':
          getProblems(data);
          break;
        case 'getParameters':
          getParameters(data);
          break;
        case 'getParameterDetails':
          getParameterDetails(data);
          break;
        case 'parameterToggled':
          parameterToggled(data);
          break;
        case 'generateExperiment':
          generateExperiment(data);
          break;
      }
    } catch (error) {
      onError(error);
    }
  }
};
