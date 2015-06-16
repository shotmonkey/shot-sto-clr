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
currentCombatLog.on('newsegment', BroadcastSegmentList);

app.get('/', function(request, response){
    response.sendFile(__dirname + '/index.html');
});

io.on('connection', function(socket){
    
    console.log('Connected', socket.id);
    
    SendSegmentList(socket);
    
    socket.on('subscribe', function(segmentId){
        Subscribe(socket, segmentId);
    });
    socket.on('unsubscribe', function(segmentId){
        Unsubscribe(socket, segmentId);
    });
    
    socket.on('test', function(){
    });
});

function GetSegmentList(){
    var segments = logs.reduce(function(segments, log){
        return segments.concat(log.segments.map(function(segment){
            return segment.summary;
        }));
    }, []).filter(function(segment){
        return (segment.duration && segment.duration.seconds() >= 60) ||
            segment.lines > 10;
    });
    return segments;
}

function BroadcastSegmentList(){
    io.emit('segments', GetSegmentList());
}

function SendSegmentList(socket){
    socket.emit('segments', GetSegmentList());
}

function Subscribe(socket, segmentId){
    console.log(socket.id + ' subscribed to ' + segmentId);
    // Reset all subscriptions
    socket.subscriptions = {};
    socket.subscriptions[segmentId] = {};
    TryUpdateClientSegment(socket, segmentId, true);
}
function Unsubscribe(socket, segmentId){
    console.log(socket.id + ' unsubscribed from ' + segmentId);
    socket.subscriptions = socket.subscriptions || {};
    socket.subscriptions[segmentId] = null;
    socket.leave(segmentId);
}

function CurrentCombatLogUpdated(segmentId, line){
    TryUpdateSubscribed(segmentId);
}

function TryUpdateSubscribed(segmentId){
    for(var i in io.sockets.connected){
        var socket = io.sockets.connected[i];
        TryUpdateClientSegment(socket, segmentId);
    }
}

function TryUpdateClientSegment(socket, segmentId, forceUpdate){
    if(socket.subscriptions &&
        socket.subscriptions[segmentId]){
            
        var subscription = socket.subscriptions[segmentId];
        
        if(Date.now() - (subscription.lastUpdateTime || 0) >= config.clientMinUpdateTime ||
            forceUpdate){
            UpdateClientSegment(socket, segmentId);
        }
    }
}

function UpdateClientSegment(socket, segmentId){
    console.log('UpdateClientSegment', socket.id, segmentId);
    socket.subscriptions[segmentId].lastUpdateTime = Date.now();
    var segment = FindSegment(segmentId);
    if(segment){
        socket.emit('segment-data', segment.GetPlayerSummary());
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