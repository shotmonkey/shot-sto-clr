var fs, path, watchit,
  __slice = [].slice;

fs = require('fs');

path = require('path');

try {
  fs.mkdirSync(path.join(__dirname, 'fixtures'));
} catch (_error) {}

global.expect = require('expect.js');

global.delay = function(time, func) {
  if (func == null) {
    func = time;
    time = 50;
  }
  return setTimeout(func, time);
};

global.fixture = function() {
  var paths;
  paths = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
  return path.join.apply(path, [__dirname, 'fixtures'].concat(__slice.call(paths)));
};

global.watchit = watchit = require('../lib/watchit');

global.conditionalTimeout = watchit.conditionalTimeout;

global.notifyWhenExists = watchit.notifyWhenExists;