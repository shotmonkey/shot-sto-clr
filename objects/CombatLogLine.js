var moment = require('moment');
var Entity = require('./Entity.js');

var TYPE_HITPOINTS = 'HitPoints';
var TYPE_SHIELD = 'Shield';

function IsDamage(line){
    return !IsHeal(line);
}
function IsHeal(line){
    return line.type == TYPE_HITPOINTS ||
        (line.type == TYPE_SHIELD && line.baseMagnitude == 0);
}

var CombatLogLine = function(line){
    this.raw = line;
    var splitline = line.split('::');
    this.timestamp = moment(splitline[0], "YY:MM:DD:HH:mm:ss.S");
    if(!this.timestamp){
        console.log('Error parsing timestamp', splitline[0], line);
    }
    var linedata = splitline[1].split(',');
    this.owner = new Entity(linedata[0], linedata[1]);
    this.source = new Entity(linedata[2], linedata[3]);
    this.target = new Entity(linedata[4], linedata[5]);
    this.event = new Entity(linedata[6], linedata[7]);
    this.type = linedata[8];
    this.flags = linedata[9];
    this.magnitude = Math.abs(parseFloat(linedata[10]));
    this.baseMagnitude = Math.abs(parseFloat(linedata[11]));
    
    this.isHeal = IsHeal(this);
    this.isDamage = IsDamage(this);
}

module.exports = CombatLogLine;