fs            = require 'fs'
{print}       = require 'util'
{spawn, exec} = require 'child_process'
watchit       = require 'watchit'

echo = (child) ->
  child.stdout.on 'data', (data) -> print data.toString()
  child.stderr.on 'data', (data) -> print data.toString()
  child

build = (callback) ->
  console.log 'Building...'
  echo coffee = spawn 'coffee', ['-c', '-o', 'lib', 'src']
  coffee.on 'exit', (status) -> callback?() if status is 0

watchTargets = (targets..., callback) ->
  for target in targets
    watchit target, include: true, (event) ->
      callback() unless event is 'success'

task 'docs', 'Generate annotated source code with Docco', ->
  fs.readdir 'src', (err, contents) ->
    files = ("src/#{file}" for file in contents when /\.coffee$/.test file)
    echo docco = spawn 'docco', files
    docco.on 'exit', (status) -> callback?() if status is 0

task 'build', 'Compile CoffeeScript source files', ->
  build()

task 'watch', 'Recompile CoffeeScript source files when modified', ->
  watchTargets 'src', build