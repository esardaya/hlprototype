chrome.app.runtime.onLaunched.addListener(function() {
  chrome.app.window.create('app/index.html', {
    'bounds': {
      'width': 1200,
      'height': 870
    }
  });
});