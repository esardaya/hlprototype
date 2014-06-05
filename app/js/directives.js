'use strict';

/* Directives */
var heuristicLabDirectives = angular.module('heuristicLabDirectives', ['heuristicLabServices']);

heuristicLabDirectives.directive('slimScroll', function() {
  return {
    // Restrict it to be an attribute in this case
    restrict: 'A',
    // responsible for registering DOM listeners as well as updating the DOM
    link: function(scope, element, attrs) {
      $(element).slimScroll({
        height: attrs.slimScroll + 'px'
      });
    }
  };
});

heuristicLabDirectives.directive('qualitiesChart', ['SharedDataService', function(SharedDataService) {
  return {
    // Restrict it to be an attribute in this case
    restrict: 'A',
    // responsible for registering DOM listeners as well as updating the DOM
    link: function(scope, element, attrs) {
      var index = attrs.qualitiesChart;
      var data = SharedDataService.tasks[index]['Results']['Qualities'];
      if (data != null) {
        var seriesData = [];
        for (var key in data) {
          if (data.hasOwnProperty(key)) {
            var series = {};
            series.data = data[key];
            series.name = key;
            seriesData.push(series);
          }
        }
        $(element).highcharts({
          chart: {
            type: 'spline',
            zoomType: "x",
            width: 590
          },
          title: {
            text: 'Qualities'
          },
          plotOptions: {
            spline: {
              marker: {
                enabled: false
              }
            }
          },
          series: seriesData
        });
      }
    }
  };
}]);

heuristicLabDirectives.directive('resizableCols', function($timeout) {
  return {
    restrict: 'A',
    link: function(scope, element, attrs) {
      if (scope.$last === true) {
        element.ready(function () {
          $timeout(function () {
            $("#" + attrs.resizableCols).flexigrid();
          });
        });
      }
    }
  };
});