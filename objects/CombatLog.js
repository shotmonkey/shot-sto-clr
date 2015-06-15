var CombatLogSegment = require('./CombatLogSegment.js');
var CombatLogLine = require('./CombatLogLine.js');

var TextFileFollower = require('text-file-follower');
var LineByLineReader = require('line-by-line');

var config = require('../config.js');

var CombatLog = function(file, options){
    
    var _this = this;
    
    this.file = file;
    
    options.tracked = (options.tracked && true) || false;
    options.catchup = (options.catchup && true) || false;
    
    this.tracked = options.tracked;
    this.catchup = options.catchup;
        
    var fileLoader;
    
    this.segments = [];
    var currentSegment = null;        
        
    if(this.tracked){
        fileLoader = new TextFileFollower(file,
            { catchup: this.catchup });
        fileLoader.on('success', function(filename){
            console.log(filename + ' tracking.');
        });
        fileLoader.on('line', function(filename, line){
            _this.LoadLineTFF(line);
        });
        fileLoader.on('close', function(filename){
            console.log(filename + ' closed.');
        });
        fileLoader.on('error', function(filename, error){
            _this.HandleError(error);
        });
    }else{
        fileLoader = new LineByLineReader(file);
        fileLoader.on('line', function(line){
            _this.LoadLineLBL(line);
        });
        fileLoader.on('error', function(error){
            _this.HandleError(error);
        });
        fileLoader.on('end', function(){
        });
    }
}

Object.defineProperty(CombatLog.prototype, 'lastSegment', {
    get: function(){
        if (this.segments && this.segments.length > 0){
            return this.segments[this.segments.length - 1];
        }
        return null;
    }
});

CombatLog.prototype.LoadLine = function(line){
    if(this.lastSegment == null){
        this.segments[0] = new CombatLogSegment();
    }
    var combatLogLine = new CombatLogLine(line);
    if(combatLogLine){
        if(this.lastSegment.length > 0 &&
            combatLogLine.timestamp.diff(this.lastSegment.endTime) > config.segmentSplitTime){
            this.segments[this.segments.length] = new CombatLogSegment();
        }
        this.lastSegment.AddLine(combatLogLine);
    }else{
        console.log('Error parsing line:', line);
    }
}
CombatLog.prototype.LoadLineTFF = function(line){
    this.LoadLine(line);
}
CombatLog.prototype.LoadLineLBL = function(line){
    fileLoader.pause();
    setTimeout(function(){
        this.LoadLine(line);
        console.log(line);
        fileLoader.resume();
    }, 1);
}

CombatLog.prototype.HandleError = function(error){
    console.log('CombatLog file error:', error);
}

module.exports = CombatLog;