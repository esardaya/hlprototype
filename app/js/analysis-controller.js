'use strict';

angular.module('heuristicLabControllers').
  controller('HeuristicLabAnalysisCtrl', ['$scope', '$location', 'SharedDataService',
    function ($scope, $location, SharedDataService) {

      if (!$scope.isAuthenticated) {
        // User is already authenticated
        $location.path('login');
        return;
      }

      SharedDataService.updateCurrentView('analysis');

      $scope.data = [];
      $scope.options = [];
      $scope.types = ['Table', 'Bubble Chart'];
      $scope.selectedType = null;
      $scope.selectedXAxis = null;
      $scope.selectedYAxis = null;

      initialize();

      SharedDataService.stopLoading();

      $scope.selectType = function(type) {
        if (type != $scope.selectedType)
          $scope.selectedType = type;
      };

      $scope.generateBubbleChart = function() {
        var xCategories = [];
        var yCategories = [];
        var series = [];

        for (var i = 0; i < $scope.data.length; i++) {
          var bubble = [];
          var seriesData = {};
          seriesData.name = $scope.data[i]['name'];
          var category = $scope.data[i]['values'][$scope.selectedXAxis];
          if (xCategories.indexOf(category) < 0) {
            xCategories.push(category);
          }

          bubble.push(xCategories.indexOf(category));
          category = $scope.data[i]['values'][$scope.selectedYAxis];
          if (yCategories.indexOf(category) < 0) {
            yCategories.push(category);
          }

          bubble.push(yCategories.indexOf(category));
          bubble.push(1);
          seriesData.data = [];
          seriesData.data.push(bubble);

          series.push(seriesData);
        }

        jQuery('#analysisBubbleChart').highcharts({
          chart: {
            type: 'bubble',
            zoomType: 'xy'
          },
          title: {
            text: 'Bubble Chart'
          },
          xAxis: {
            categories: xCategories
          },
          yAxis: {
            categories: yCategories,
            startOnTick: false,
            endOnTick: false
          },
          series: series
        });
      };

      function merge(results, parameters) {
        var merged = {};
        for (var result in results) {
          if (results.hasOwnProperty(result)) {
              merged[result] = result != 'Qualities' ? results[result] : result;
          }
        }
        for (var parameter in parameters) {
          if (parameters.hasOwnProperty(parameter)) {
            merged[parameter] = parameters[parameter];
          }
        }

        return merged;
      }

      function initialize() {
        $scope.data = [];

        for (var i = 0; i < SharedDataService.tasks.length; i++) {
          var task = SharedDataService.tasks[i];

          var data = {};
          data['values'] = merge(task['Results'], task['Parameters']);
          data['name'] = task['Name'];

          if (i == 0) {
            for (var key in data['values']) {
              if (data['values'].hasOwnProperty(key)) {
                $scope.options.push(key);
              }
            }

            $scope.options.sort();
          }

          $scope.data.push(data);
        }
      }
    }
  ]);
