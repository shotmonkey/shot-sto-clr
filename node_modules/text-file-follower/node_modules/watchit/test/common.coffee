fs   = require 'fs'
path = require 'path'

try
  fs.mkdirSync path.join __dirname, 'fixtures'

global.expect  = require 'expect.js'
global.delay   = (time, func) ->
  unless func?
    func = time
    time = 50
  setTimeout func, time
global.fixture = (paths...) -> path.join __dirname, 'fixtures', paths...
global.watchit = watchit = require '../lib/watchit'
global.conditionalTimeout = watchit.conditionalTimeout
global.notifyWhenExists = watchit.notifyWhenExists
