function finishedLoading() {
  assembly = JSIL.GetAssembly("HeuristicLab.Optimization-3.3", true);
  assemblies = GetAssemblies();

  programAssembly = JSIL.GetAssembly("Test", true);
  program = (new JSIL.ConstructorSignature(programAssembly.Test.Program, [])).Construct();
  self.postMessage({ operation: 'initialize' });
}

function onError(e) {
  self.postMessage({ operation: 'error', message: e.toString() });
}

function saveDataState(data) {
  /*
   * Data has the following format
   * 'parameter' : { type, value(s), *invalidCount* }
   * for boolean: value
   * for intarray and doublearray: values is an array with { value, isValid }
   * for choices : values is an associative array values[choice] -> checked
   * Note: data[parameter] can be null
   */
  for (var key in data) {
    if (data.hasOwnProperty(key)) {
      var details = data[key];
      // IValueParameter to which the string key references
      var parameter = parameters[key];
      if (details != null) {
        switch (details.type) {
          case 'choice':
            if (program.multipleChoiceParameters.ContainsKey(parameter)) {
              var list = program.multipleChoiceParameters.get_Item(parameter);
              list.Clear();
              var enumerator = paramValues[parameter.Name].Data.GetEnumerator();
              try {
                while (enumerator.MoveNext()) {
                  var current = enumerator.Current;
                  var item = current.Key;
                  if (item.Object_Equals(program.optionalNullChoice)) {
                    if (details.values['-']) {
                      list.Add(item);
                    }
                  } else {
                    if (details.values[item.Name]) {
                      list.Add(item);
                    }
                  }
                }
              } finally {
                if (enumerator != null)
                  enumerator.Dispose();
              }
              program.multipleChoiceParameters.set_Item(parameter, list);
            }
            break;
          case 'intarray':
            if (program.intParameters.ContainsKey(parameter)) {
              var intArray = program.intParameters.get_Item(parameter);
              for (var i = 0; i < details.values.length; i++) {
                intArray.array[i] = details.values[i].value;
              }
              program.intParameters.set_Item(parameter, intArray);
            }
            break;
          case 'doublearray':
            if (program.doubleParameters.ContainsKey(parameter)) {
              var doubleArray = program.doubleParameters.get_Item(parameter);
              for (var d = 0; d < details.values.length; d++) {
                doubleArray.array[d] = details.values[d].value;
              }
              program.doubleParameters.set_Item(parameter, doubleArray);
              paramValues[parameter.Name].Data = doubleArray;
            }
            break;
          default:
        }
      }
    }
  }
}

function getAlgorithms() {
  algorithms = [];
  var names = [];
  var algorithmType = assembly.HeuristicLab.Optimization.IAlgorithm;
  algorithmType = algorithmType.__Type__;

  for (var i = 0; i < assemblies.length; i++) {
    var types = HLGetTypes(algorithmType, assemblies[i], true, false);
    for (var t = 0; t < types.length; t++) {
      if (types[t].Name.indexOf('UserDefined') == -1) {
        algorithms[types[t].Name] = types[t];
        names.push(types[t].Name);

        var algorithmSignature = new JSIL.ConstructorSignature(types[t], []);
        algorithmInstances[types[t].FullName] = algorithmSignature.Construct();
      }
    }
  }
  self.postMessage({ operation: 'getAlgorithms', names: names });
}

function getProblems(data) {
  problems = [];
  var names = [];

  var algorithmType = algorithms[data.algorithm];

  if (!(algorithmType.FullName in algorithmInstances)) {
    JSIL.Host.logWriteLine("Invalid Algorithm");
    return;
  }

  currentAlgorithm = algorithmInstances[algorithmType.FullName];

  var problemType = currentAlgorithm.ProblemType;

  for (var i = 0; i < assemblies.length; i++) {
    var types = HLGetTypes(problemType, assemblies[i], true, false);
    for (var t = 0; t < types.length; t++) {
      if (types[t].Name.indexOf('UserDefined') == -1) {
        problems[types[t].Name] = types[t];
        names.push(types[t].Name);
      }
    }
  }
  self.postMessage({ operation: 'getProblems', names: names });
}

function getParameters(data) {
  if (currentAlgorithm === null) {
    JSIL.Host.logWriteLine("Invalid Algorithm");
    return;
  }

  // Reset all parameter data by constructing a new instance o program
  program = (new JSIL.ConstructorSignature(programAssembly.Test.Program, [])).Construct();
  parameters = [];
  paramValues = [];

  // Set the problem so that all parameters are loaded
  var problem = problems[data.problem];
  var problemSignature = new JSIL.ConstructorSignature(problem, []);
  currentProblem = problemSignature.Construct();

  var signature = new JSIL.MethodSignature.Action(assembly.HeuristicLab.Optimization.IProblem);
  signature.CallVirtual("set_Problem", null, currentAlgorithm, currentProblem);


  // Get parameter list
  var names = [];

  var params = programAssembly.Test.Program.GetParameterList(currentAlgorithm)._items;

  for (var i = 0; i < params.length; i++) {
    var param = params[i];
    parameters[param.Name] = param;
    names.push(param.Name);
  }

  self.postMessage({ operation: 'getParameters', names: names });
}

function getParameterDetails(data) {
  var parameter = parameters[data.parameter];
  if (!(parameter.Name in paramValues) || paramValues[parameter.Name] == null) {
    paramValues[parameter.Name] = program.GetDetailsData(parameter);
  }
  var paramData = paramValues[parameter.Name];
  var values = null;

  if (paramData != null) {
    switch (paramData.Type) {
      case 'choice':
        var enumerator = paramData.Data.GetEnumerator();
        values = [];
        try {
          while (enumerator.MoveNext()) {
            var current = enumerator.Current;
            if (current.Key.Object_Equals(program.optionalNullChoice)) {
              // This has to be the first option
              values.unshift({ key: "-", checked: Boolean(current.Value) });
            } else {
              values.push({ key: current.Key.Name, checked: Boolean(current.Value) });
            }
          }
        } finally {
          if (enumerator != null)
            enumerator.Dispose();
        }
        break;
      case 'intarray':
      case 'doublearray':
        values = paramData.Data.array;
        break;
      default:

    }
    self.postMessage({
      operation: 'getParameterDetails',
      type: paramData.Type,
      values: values,
      readOnly: paramData.readOnly
    });
  }
}

function parameterToggled(data) {
  var parameter = parameters[data.parameter];
  data.checked = program.ParameterChecked(parameter, data.checked);
  if (data.checked !== true) {
    paramValues[parameter.Name] = null;
  }

  self.postMessage({
    operation: 'parameterToggled',
    checked: data.checked,
    name: parameter.Name
  });
}

function generateExperiment(data) {
  if (currentAlgorithm == null) {
    throw new Error('Algorithm not properly configured');
  }

  JSIL.Host.logWriteLine("Generating Experiment");

  saveDataState(data.data);

  program.CreateExperiment(currentAlgorithm);

  var experiment = program.Experiment;

  var optimizers = experiment.Optimizers.list;

  var result = {};
  result['Algorithm'] = currentAlgorithm.GetType().FullName;
  result['Problem'] = currentProblem.GetType().FullName;
  var variations = [];

  for (var i = 0; i < optimizers._items.length; i++) {
    var optimizer = optimizers._items[i];

    var optimizerData = {};
    optimizerData['Name'] = optimizer.Name;

    var paramList = programAssembly.Test.Program.GetParameterList(optimizer)._items;
    var params = {};

    for (var p = 0; p < paramList.length; p++) {
      var parameter = paramList[p];
      var parameterData = {};
      parameterData['Value'] = parameter.Value !== null ? parameter.Value.toString() : null;
      parameterData['Type'] = parameter.GetType().FullName;
      params[parameter.Name] = parameterData;
    }
    optimizerData['Parameters'] = params;
    variations.push(optimizerData);
  }

  result['Variations'] = variations;

  JSIL.Host.logWriteLine("Experiment Generated");

  self.postMessage({ operation: 'generateExperiment', experiment: result });
}

