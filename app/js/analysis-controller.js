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
      $scope.types = ['Table', 'Bubble Chart', 'Box Plot'];
      $scope.selectedType = null;
      $scope.selectedXAxis = null;
      $scope.selectedYAxis = null;

      initialize();

      SharedDataService.stopLoading();

      $scope.selectType = function(type) {
        if (type != $scope.selectedType) {
          $scope.selectedType = type;
          jQuery('#analysisChart').empty();
        }
      };

      $scope.generateChart = function() {
        if ($scope.selectedType == 'Bubble Chart')
          generateBubbleChart();
        else if ($scope.selectedType == 'Box Plot')
          generateBoxPlot();
      };

      function generateBubbleChart() {
        var xCategories = [];
        var yCategories = [];
        var series = [];
        var category;

        // We need two passes
        for (var c = 0; c < $scope.data.length; c++) {
          category = $scope.data[c]['values'][$scope.selectedXAxis];
          if (xCategories.indexOf(category) < 0) {
            xCategories.push(category);
          }

          category = $scope.data[c]['values'][$scope.selectedYAxis];
          if (yCategories.indexOf(category) < 0) {
            yCategories.push(category);
          }
        }

        if (isNaN(xCategories[0]))
          xCategories.sort();
        else
          xCategories.sort(function(a, b){return a-b});

        if (isNaN(yCategories[0]))
          yCategories.sort();
        else
          yCategories.sort(function(a, b){return a-b});

        for (var i = 0; i < $scope.data.length; i++) {
          var bubble = [];
          var seriesData = {};
          seriesData.name = $scope.data[i]['name'];
          category = $scope.data[i]['values'][$scope.selectedXAxis];
          bubble.push(xCategories.indexOf(category));

          category = $scope.data[i]['values'][$scope.selectedYAxis];
          bubble.push(yCategories.indexOf(category));
          bubble.push(1);
          seriesData.data = [];
          seriesData.data.push(bubble);

          series.push(seriesData);
        }

        jQuery('#analysisChart').highcharts({
          chart: {
            type: 'bubble'
          },
          title: {
            text: 'Bubble Chart'
          },
          xAxis: {
            categories: xCategories,
            title: {
              text: $scope.selectedXAxis
            }
          },
          yAxis: {
            categories: yCategories,
            startOnTick: false,
            endOnTick: false,
            max: yCategories.length - 1,
            min: 0,
            title: {
              text: $scope.selectedYAxis
            }
          },
          series: series
        });
      }

      function generateBoxPlot() {
        var xCategories = [];
        var values = {};
        var value;
        var yCategories = [];
        var series = [];

        // Initial empty data
        series.push({
          name: $scope.selectedYAxis,
          data: []
        });

        series.push({
          name: 'Outlier',
          color: Highcharts.getOptions().colors[0],
          type: 'scatter',
          data: [],
          marker: {
            fillColor: 'white',
            lineWidth: 1,
            lineColor: Highcharts.getOptions().colors[0]
          },
          tooltip: {
            pointFormat: $scope.selectedYAxis + ': {point.y}'
          }
        });
        var category;

        // We need two passes
        for (var c = 0; c < $scope.data.length; c++) {
          category = $scope.data[c]['values'][$scope.selectedXAxis];
          if (xCategories.indexOf(category) < 0) {
            xCategories.push(category);
          }

          category = $scope.data[c]['values'][$scope.selectedYAxis];
          if (yCategories.indexOf(category) < 0) {
            yCategories.push(category);
          }
        }

        if (isNaN(xCategories[0]))
          xCategories.sort();
        else
          xCategories.sort(function(a, b){return a-b});

        if (isNaN(yCategories[0]))
          yCategories.sort();

        for (var v = 0; v < $scope.data.length; v++) {
          // For each X
          category = $scope.data[v]['values'][$scope.selectedXAxis];

          // Get its value in Y
          value = $scope.data[v]['values'][$scope.selectedYAxis];

          if (!values.hasOwnProperty(category)) {
            values[category] = [];
          }

          if (!isNaN(value)) {
            // Number
            values[category].push(value - 0);
          } else {
            values[category].push(yCategories.indexOf(value));
          }
        }
        // Now we have all Y values for each X category, time to perform some calculations
        for (var x = 0; x < xCategories.length; x++) {
          var yValues = values[xCategories[x]]; // Array of Y values
          // sort the array
          yValues.sort(function(a, b){return a-b});
          // Perform calculations
          var max = Math.max.apply(Math, yValues);
          var min = Math.min.apply(Math, yValues);
          var median = calculateMedian(yValues);
          var upperQuartile = calculatePercentile(yValues, 0.75);
          var lowerQuartile = calculatePercentile(yValues, 0.25);

          var seriesData = [min, lowerQuartile, median, upperQuartile, max];
          series[0].data.push(seriesData);

          // Get outliers
          // Left out for the time being
          /*for (var o = 0; o < yValues.length; o++) {
            if (yValues[o] < lowerQuartile || yValues[o] > upperQuartile) {
              series[1].data.push([x, yValues[o]]);
            }
          }*/
        }

        jQuery('#analysisChart').highcharts({
          chart: {
            type: 'boxplot',
            zoomType: 'xy'
          },
          title: {
            text: 'Box Plot'
          },
          legend: {
            enabled: false
          },
          xAxis: {
            categories: xCategories,
            title: {
              text: $scope.selectedXAxis
            }
          },
          yAxis: {
            categories: isNaN(yCategories[0]) ? yCategories : null,
            title: {
              text: $scope.selectedYAxis
            }
          },
          series: series
        });
      }

      function calculatePercentile(numbers, p) {
        var n = numbers.length;
        var t = p * (n - 1);
        var index = Math.floor(t);
        var percentage = t - index;
        return numbers[index] * (1 - percentage) + numbers[index + 1] * percentage;
      }

      function calculateMedian(numbers) {
        var n = numbers.length;
        var index = Math.floor(n / 2);
        if (n % 2 == 1) {
          return numbers[index];
        } else {
          return (numbers[index - 1] + numbers[index]) / 2.0;
        }
      }

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
