var moment = require('moment');

var CombatLogLine = require('./CombatLogLine.js');

var util = require('../utility.js');

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
Object.defineProperty(CombatLogSegment.prototype, 'duration', {
    get: function(){
        if(this.startTime && this.endTime){
            return moment.duration(this.endTime.diff(this.startTime));
        }
        return null;
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
Object.defineProperty(CombatLogSegment.prototype, 'entities', {
    get: function(){
        return this.owners.concat(this.targets).SelectDistinct(function(i){ return i; });
    }
});
Object.defineProperty(CombatLogSegment.prototype, 'players', {
    get: function(){
        return this.entities.filter(function(e){ return e.type == util.constants.ENTITY_TYPE_PLAYER; });
    }
});
Object.defineProperty(CombatLogSegment.prototype, 'npcs', {
    get: function(){
        return this.entities.filter(function(e){ return e.type == util.constants.ENTITY_TYPE_NPC; });
    }
});

CombatLogSegment.prototype.GetPlayerSummary = function(){
    var _this = this;
    var playerData = _this.players.map(function(player){
        var lines = _this.lines.filter(function(line){
            return line.owner.is(player);
        });
        if(lines && lines.length > 0){
            
            var startTime = lines[0].timestamp;
            var endTime = lines[lines.length - 1].timestamp;
            
            var totalDamage = lines
                .filter(function(line){ return line.isDamage; })
                .reduce(function(sum,line){ return sum + line.magnitude; }, 0);
                
            var dps = totalDamage / (endTime.diff(startTime) / 1000);
            
            var totalHealing = lines
                .filter(function(line){ return line.isHeal; })
                .reduce(function(sum,line){ return sum + line.magnitude; }, 0);
            
            return {
                player: player,
                totalDamage: Math.round(totalDamage * 10) / 10,
                dps: Math.round(dps * 10) / 10,
                totalHealing: Math.round(totalHealing * 10) / 10,
                time: endTime.diff(startTime),
            };
        }
    });
    
    var data = {
        id: this.id,
        startTime: this.startTime,
        endTime: this.endTime,
        durationDescription: (this.duration && this.duration.humanize()) || null,
        playerData: playerData,
    };
    
    return data;
};

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

Object.defineProperty(CombatLogSegment.prototype, 'summary', {
    get: function(){
        return {
            id: this.id,
            startTime: this.startTime,
            endTime: this.endTime,
            duration: this.duration,
            durationDescription: (this.duration && this.duration.humanize()) || null,
            players: this.players,
            npcs: this.npcs,
            lines: this.lines.length,
        };
    }
});

module.exports = CombatLogSegment;