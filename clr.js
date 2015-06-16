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

currentCombatLog.on('line', CurrentCombatLogUpdated);

app.get('/', function(request, response){
    response.sendFile(__dirname + '/index.html');
});
app.get('/js/*', function(request, response){
    response.sendFile(__dirname + '/pagescripts/' + request.params[0]);
});

io.on('connection', function(socket){    
    console.log('Connected', socket.id);    
    SendSegmentList(socket);    
    TryBroadcastCurrentSegmentData();
});

function GetSegmentList(){
    var segments = logs.reduce(function(segments, log){
        return segments.concat(log.relevantSegments.map(function(segment){
            return segment.summary;
        }));
    }, []);
    return segments;
}

var broadcastSegmentListTimeout;
function TryBroadcastSegmentList(){
    if(!broadcastSegmentListTimeout){
        broadcastSegmentListTimeout = setTimeout(BroadcastSegmentList, config.clientMinUpdateTime);
    }
}
function BroadcastSegmentList(){
    if(broadcastSegmentListTimeout){
        clearTimeout(broadcastSegmentListTimeout);
        broadcastSegmentListTimeout = null;
    }
    var segmentList = GetSegmentList();
    console.log('Broadcasting segment list', segmentList.length);
    io.emit('segments', segmentList);
}
function SendSegmentList(socket){
    socket.emit('segments', GetSegmentList());
}

var broadcastCurrentSegmentDataTimeout;
function TryBroadcastCurrentSegmentData(){    
    if(!broadcastCurrentSegmentDataTimeout){
        broadcastCurrentSegmentDataTimeout = setTimeout(BroadcastCurrentSegmentData, config.clientMinUpdateTime);
    }
}
function BroadcastCurrentSegmentData(){
    if(broadcastCurrentSegmentDataTimeout){
        clearTimeout(broadcastCurrentSegmentDataTimeout);
        broadcastCurrentSegmentDataTimeout = null;
    }
    var segment = currentCombatLog.lastRelevantSegment;
    console.log('Broadcasting current segment data', segment.id);    
    if(segment){
        io.emit('current-segment-data', segment.GetPlayerSummary());
    }
}

function CurrentCombatLogUpdated(segmentId, line){
    TryBroadcastSegmentList();
    TryBroadcastCurrentSegmentData();
}

function SendSegmentData(event, socket, segmentId){
    console.log('SendSegmentData', event, socket.id, segmentId);
    var segment = FindSegment(segmentId);
    if(segment){
        socket.emit(event, segment.GetPlayerSummary());
    }
}

function FindSegment(segmentId){
    for(var i = 0; i < logs.length; i++){
        var log = logs[i];
        for(var j = 0; j < log.segments.length; j++){
            var segment = log.segments[j];
            if(segment.id == segmentId){
                return segment;
            }
        }
    }
    console.log('Could not find segment:', segmentId);
    return null;
}

http.listen(config.port, function(){
    console.log('listening on *.' + config.port);
});

//open('http://localhost:' + config.port);