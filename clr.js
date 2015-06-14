var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var fs = require('fs');
var tff = require('text-file-follower');
var moment = require('moment');
var util = require('./utility.js');

var combatLogFile = 'D:/Games/Steam/steamapps/common/Star Trek Online/Star Trek Online/Live/logs/GameClient/Combatlog.Log';
var combatLogArchiveDirectory = 'D:/Games/Steam/steamapps/common/Star Trek Online/Star Trek Online/Live/logs/GameClient/Combatlog_archive';
var lines = [];

var timeSegmentSplitByTime = 60 * 1000;
var timeSegments = null;
var timeSegmentDisplayFormat = 'YYYYMMDD HH.mm.ss.S';

var minUpdateInterval = 500;
var maxUpdateLines = 10000;

var autoArchiveEnabled = true;
var autoArchiveTimeout;
var autoArchiveKeepSegmentCount = 5;

app.get('/', function(request, response){
    response.sendFile(__dirname + '/index.html');
});

var follower;
function InitTextFileFollower(){
    if(follower){ follower.close(); }
    follower = new tff(combatLogFile, {catchup: true});
    follower.on('success', function(filename){
        console.log('Tracking file:', filename);
    });
    follower.on('error', function(filename, error){
       console.log('Error tracking file:', filename, error); 
    });
    follower.on('close', function(filename){
        console.log('File closed:', filename);
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
    if(socket.subscribed){
        console.log('Socket unsubscribed', socket.id);
        socket.leave('updates');
        socket.subscribed = false;
    }
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
        
        if(autoArchiveTimeout){ clearTimeout(autoArchiveTimeout); }
        autoArchiveTimeout = setTimeout(TryAutoArchiveSegments, 500);
        
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
        
        if(line.timestamp < lastTime){
            console.log("Warning! Timestamp has gone down!");
        }
        
        if(line.timestamp.diff(lastTime) > timeSegmentSplitByTime){
            timeSegments.push(lineBin);
            lineBin = [];
        }
        lineBin.push(line);
        lastTime = line.timestamp;
    }
    if(lineBin.length > 0){
        timeSegments.push(lineBin);
    }
}

function GetSegments(socket){
    if(!timeSegments){
        CalculateSegments();
    }
    var timeSegmentStrings = timeSegments.map(function(ts){
        var firstTime = ts[0].timestamp;
        var lastTime = ts[ts.length - 1].timestamp;
        return firstTime.format(timeSegmentDisplayFormat) + ' to ' + lastTime.format(timeSegmentDisplayFormat);
    });
    socket.emit('segments', timeSegmentStrings);
    
    if(timeSegments.length > 0){
        socket.emit('segment-data', SegmentDamageData(timeSegments[timeSegments.length - 1], 1000));
    }
}


function SegmentToRaw(segment){
    return segment.reduce(function(raw,line){
        if(raw.length>0){
            return raw + '\n' + line.raw;
        }else{
            return line.raw;
        }
    }, '');
}

function TryAutoArchiveSegments(){
    if(!autoArchiveEnabled){ return; }
    CalculateSegments();
    if(timeSegments.length > autoArchiveKeepSegmentCount){
        ArchiveCombatLog();
    }
}

function ArchiveCombatLog(){
    if(!autoArchiveEnabled){ return; }
    
    console.log('Archiving combat log!');
    
    fs.stat(combatLogArchiveDirectory, function(err, dirStat){
        if(err){
            fs.mkdirSync(combatLogArchiveDirectory);
        }
        
        CalculateSegments();
        
        var numToArchive = timeSegments.length - autoArchiveKeepSegmentCount;
        console.log('Archiving ' + numToArchive + ' segments');
        
        if(numToArchive > 0){
            
            for(var i = 0; i < numToArchive; i++){
                var segment = timeSegments.shift();
                var guid = util.Guid();
                var segmentFileName = segment[0].timestamp.format(timeSegmentDisplayFormat) + ' - ' + segment[segment.length-1].timestamp.format(timeSegmentDisplayFormat) + '.log';
                var filePath = combatLogArchiveDirectory + '/' + segmentFileName;
                fs.writeFileSync(filePath, SegmentToRaw(segment));
                console.log('Archived ' + segmentFileName);
            }
            
            var raw = timeSegments.reduce(function(raw, segment){
                if(raw.length > 0){
                    return raw + '\n' + SegmentToRaw(segment);
                }else{
                    return SegmentToRaw(segment);
                }
            }, '');
            fs.unlinkSync(combatLogFile);
            fs.writeFileSync(combatLogFile, raw);
       
        }       
    });
}

function GetSegment(startTime, endTime){
    return lines.filter(function(l){ return l.timestamp >= startTime && l.timestamp <= endTime; });
}

function SegmentDamageData(segment, interval){
    
    console.log('SegmentDamageData');
    console.log(segment.length, interval);
    
    var startTime = segment[0].timestamp;
    var endTime = segment[segment.length - 1].timestamp;
    var time = startTime;
    
    var segmentCopy = segment.slice();
    var data = [];
    
    while(time < endTime){
        
        var nextTime = moment(time).add(interval, 'ms');
        var damageSum = 0;
        
        while(true){
            if(segmentCopy.length == 0){ break; }
            var line = segmentCopy[0];
            if(line.timestamp.valueOf() >= nextTime.valueOf()){ break; }
            segmentCopy.shift();
            if(util.IsDamageType(line.type)){
                damageSum += line.magnitude;
            }
        }
        
        data.push([nextTime.format('HH:mm:ss'), damageSum]);
        
        time = nextTime;
    }
    
    return data;
}