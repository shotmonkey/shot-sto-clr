var events = require('events');

var CombatLogSegment = require('./CombatLogSegment.js');
var CombatLogLine = require('./CombatLogLine.js');

var TextFileFollower = require('text-file-follower');
var LineByLineReader = require('line-by-line');

var config = require('../config.js');

var CombatLog = function(file, options){
    
    var _this = this;
    events.EventEmitter.call(this);
    
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

CombatLog.prototype = Object.create(events.EventEmitter.prototype, {
    constructor: {
        value: CombatLog,
        enumerable: false
    }
});

Object.defineProperty(CombatLog.prototype, 'lastSegment', {
    get: function(){
        var segments = this.segments;
        if (segments && segments.length > 0){
            return segments[segments.length - 1];
        }
        return null;
    }
});
Object.defineProperty(CombatLog.prototype, 'relevantSegments', {
    get: function(){
        return this.segments.filter(function(segment){
            return (segment.duration.seconds() >= 10 ||
                segment.length >= 10) &&
                segment.players.length >= 1 &&
                segment.npcs.length >= 1;
        });
    }
});
Object.defineProperty(CombatLog.prototype, 'lastRelevantSegment', {
    get: function(){
        var segments = this.relevantSegments;
        if (segments && segments.length > 0){
            return segments[segments.length - 1];
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
            var newSegment = new CombatLogSegment();
            this.segments[this.segments.length] = newSegment;
            this.emit('newsegment', newSegment.id);
        }
        this.lastSegment.AddLine(combatLogLine);
        this.emit('line', this.lastSegment.id, combatLogLine);
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
    this.emit('error', error);
}

module.exports = CombatLog;