var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var fs = require('fs');
var tff = require('text-file-follower');
var moment = require('moment');
var util = require('./utility.js');

var combatLogFile = 'D:/node/CombatLog.log';
var lines = [];

var minUpdateInterval = 500;
var maxUpdateLines = 10000;

app.get('/', function(request, response){
    response.sendFile(__dirname + '/index.html');
});

var follower;
function InitTextFileFollower(){
    if(follower){ follower.close(); }
    follower = new tff(combatLogFile, {catchup: true});
    follower.on('success', function(filename){
        console.log('Tracking file: ', filename);
    });
    follower.on('line', ParseCombatLogLine);
};
InitTextFileFollower();

io.on('connection', function(socket){
    console.log('Connected', socket.id);
    Unsubscribe(socket);
    
    socket.on('subscribe', function(){ Subscribe(socket); });
    socket.on('unsubscribe', function(){ Unsubscribe(socket); });
    
    socket.on('clear', ClearCombatLogLines);
    socket.on('reload', function(){
        ClearCombatLogLines();
        InitTextFileFollower();
    });
    socket.on('count', function(){
        socket.emit('count', lines.length);
    });
    
    socket.on('getsegments', function(){ GetSegments(socket); });
});

http.listen(3000, function(){
    console.log('listening on *.3000');
});

function Subscribe(socket){
    console.log('Socket subscribed', socket.id);
    socket.join('updates');
    socket.subscribed = true;
    socket.linesSinceUpdate = 0;
    socket.lastUpdateTime = 0;
    socket.emit('subscribed');
}
function Unsubscribe(socket){
    console.log('Socket unsubscribed', socket.id);
    socket.leave('updates');
    socket.subscribed = false;
    socket.emit('unsubscribed');
}

function ClearCombatLogLines(){
    lines = [];
    io.emit('cleared');
}

function ParseCombatLogLine(filename, line){
    var cll = new util.CombatLogLine(line);
    if(cll){
        lines.push(cll);
        ClearParsedVars();
        SendSocketUpdatesIfNeeded();
    }
}

function SendSocketUpdatesIfNeeded(){
    for(var i in io.sockets.connected){
        
        var socket = io.sockets.connected[i];
        
        socket.linesSinceUpdate = (socket.linesSinceUpdate || 0) + 1;
        
        if(socket.updateTimeout){ clearTimeout(socket.updateTimeout); }
        if(socket.subscribed){
            socket.updateTimeout = setTimeout(function(){ SendUpdate(socket); }, minUpdateInterval);            
            if(socket.linesSinceUpdate >= maxUpdateLines){
                SendUpdate(socket);
            }
        }
    }
}

function SendUpdate(socket){
    socket.linesSinceUpdate = 0;
    clearTimeout(socket.updateTimeout);
    socket.emit('line-added', lines.length);
}

var timeSegmentSplitByTime = 60 * 1000;
var timeSegments = null;

function ClearParsedVars(){
    timeSegments = null;
}

function CalculateSegments(){
    timeSegments = [];
    var lastTime;
    var lineBin = [];
    for(var i = 0; i < lines.length; i++){
        var line = lines[i];
        if(!lastTime){ lastTime = line.timestamp; continue; }
        if(line.timestamp.diff(lastTime) > timeSegmentSplitByTime){
            timeSegments.push(lineBin);
            lineBin = [];
        }
        lineBin.push(line);
        lastTime = line.timestamp;
    }
}

function GetSegments(socket){
    if(!timeSegments){
        CalculateSegments();
    }else{
        var format = "dddd, MMMM Do YYYY, h:mm:ss a";
        var timeSegmentStrings = timeSegments.map(function(ts){
            var firstTime = ts[0].timestamp;
            var lastTime = ts[ts.length - 1].timestamp;
            return firstTime.format(format) + ' to ' + lastTime.format(format);
        });
        socket.emit('segments', timeSegmentStrings);
    }
}

function EndParseCombatLog(socket){
    parseEndTime = moment();
    var timeDiff = parseEndTime.diff(parseStartTime)
    console.log(parseStartTime.format(), parseEndTime.format(), timeDiff);
    console.log(firstTimeParsed.format(), lastTimeParsed.format(), lastTimeParsed.diff(firstTimeParsed))
    
    console.log("Splitting into time groups");
    
    var splitLines = [];
    var lineBin = [];
    var lastTime;
    for(var i = 0; i < lines.length; i++){
        var line = lines[i];
        if(!lastTime){
            lastTime = line.timestamp;
            continue;
        }
        if(line.timestamp && line.timestamp.diff(lastTime) > splitByTime){
            splitLines.push(lineBin);
            lineBin = [];
        }
        lineBin.push(line);
        lastTime = line.timestamp;
    }
    
    console.log(splitLines.length + ' time splits');
    
    for(var i = 0; i < splitLines.length; i++){
        var split = splitLines[i];
        var firstLine = split[0];
        var lastLine = split[split.length - 1];
        if(!lastLine){
            console.log('No lastline', split.length);
        }else{
            var splitTime = moment.duration(lastLine.timestamp.diff(firstLine.timestamp));
            console.log(firstLine.timestamp.format(), lastLine.timestamp.format(), splitTime.humanize());
            
            var breakdown = split.breakdown(
                function(line){ return line.owner; },
                function(line){ return line.target; },
                function(line){ return line.type; },
                function(line){ return line.event; },
                function(items){ return items.reduce(function(sum,i){ return sum + i.magnitude; },0); }
            );
            socket.emit('data', breakdown);
        }
        break;
    }
    
}