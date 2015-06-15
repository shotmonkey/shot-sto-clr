var moment = require('moment');
var InternallyNamedEntity = require('./InternallyNamedEntity.js');

var CombatLogLine = function(line){
    this.raw = line;
    var splitline = line.split('::');
    this.timestamp = moment(splitline[0], "YY:MM:DD:HH:mm:ss.S");
    if(!this.timestamp){
        console.log('Error parsing timestamp', splitline[0], line);
    }
    var linedata = splitline[1].split(',');
    this.owner = new InternallyNamedEntity(linedata[0], linedata[1]);
    this.source = new InternallyNamedEntity(linedata[2], linedata[3]);
    this.target = new InternallyNamedEntity(linedata[4], linedata[5]);
    this.event = new InternallyNamedEntity(linedata[6], linedata[7]);
    this.type = linedata[8];
    this.flags = linedata[9];
    this.magnitude = parseFloat(linedata[10]);
    this.baseMagnitude = parseFloat(linedata[11]);
}

module.exports = CombatLogLine;