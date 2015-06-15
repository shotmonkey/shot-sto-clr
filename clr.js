var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var fs = require('fs');
var moment = require('moment');
var open = require('open');

var CombatLog = require('./objects/CombatLog.js');
var CombatLogLine = require('./objects/CombatLogLine.js');
var CombatLogSegment = require('./objects/CombatLogSegment.js');

var util = require('./utility.js');
var config = require('./config.js');

var logs = [];
var currentCombatLog = new CombatLog(config.combatLogFile, { tracked: true, catchup: true });
logs.push(currentCombatLog);

app.get('/', function(request, response){
    response.sendFile(__dirname + '/index.html');
});

io.on('connection', function(socket){
    socket.on('test', function(){
        var allSegments = GetCombatLogSegments();
        var segmentDetails = allSegments.map(function(segment){
            return {
                id: segment.id,
                lines: segment.length,
                startTime: segment.startTime,
                endTime: segment.endTime,
                duration: moment.duration(segment.startTime.diff(segment.endTime)).humanize(),
                entities: segment.owners.concat(segment.targets),
                entityNames: segment.owners.concat(segment.targets)
                    .SelectDistinct(function(e){ return e.display; }),
            };
        });
        socket.emit('test', segmentDetails);
    });
});
http.listen(config.port, function(){
    console.log('listening on *.' + config.port);
});

function GetCombatLogSegments(){
    return logs.reduce(function(segments, log){
        return segments.concat(log.segments);
    }, []);
}

open('http://localhost:' + config.port);