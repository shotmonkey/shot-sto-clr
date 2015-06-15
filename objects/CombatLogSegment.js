var util = require('../utility.js');
var CombatLogLine = require('./CombatLogLine.js');

var CombatLogSegment = function(lines, id){
    this.lines = lines || [];
    this.id = id || util.Guid();
}
CombatLogSegment.prototype.AddLine = function(line){
    this.lines.push(line);
}
CombatLogSegment.prototype.AddRawLine = function(rawline){
    var line = new CombatLogLine(rawline);
    this.AddLine(line);
}
Object.defineProperty(CombatLogSegment.prototype, 'length', {
    get: function(){
        return (this.lines && this.lines.length) || 0;
    }
});
Object.defineProperty(CombatLogSegment.prototype, 'startTime', {
    get: function(){
        return (this.lines && this.lines.length > 0 && this.lines[0].timestamp) || null;
    }
});
Object.defineProperty(CombatLogSegment.prototype, 'endTime', {
    get: function(){
        return (this.lines && this.lines.length > 0 && this.lines[this.lines.length - 1].timestamp) || null;
    }
});
Object.defineProperty(CombatLogSegment.prototype, 'owners', {
    get: function(){
        return (this.lines && this.lines.SelectDistinct(function(line){ return line.owner; })) || [];
    }
});
Object.defineProperty(CombatLogSegment.prototype, 'sources', {
    get: function(){
        return (this.lines && this.lines.SelectDistinct(function(line){ return line.source; })) || [];
    }
});
Object.defineProperty(CombatLogSegment.prototype, 'targets', {
    get: function(){
        return (this.lines && this.lines.SelectDistinct(function(line){ return line.target; })) || [];
    }
});
Object.defineProperty(CombatLogSegment.prototype, 'events', {
    get: function(){
        return (this.lines && this.lines.SelectDistinct(function(line){ return line.event; })) || [];
    }
});

Object.defineProperty(CombatLogSegment.prototype, 'raw', {
    get: function(){
        return this.lines.reduce(function(raw,line){
            if(raw.length>0){
                return raw + '\n' + line.raw;
            }else{
                return line.raw;
            }
        }, '');
    }
});

module.exports = CombatLogSegment;