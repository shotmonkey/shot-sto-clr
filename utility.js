var moment = require('moment');

module.exports = (function(){
    Array.prototype.selectDistinct = function(selector){
        var vals = [];
        for(var i = 0; i < this.length; i++){
            var val = selector(this[i]);
            if(val){
                var found = false;
                for(var j = 0; j < vals.length; j++){
                    found = val == vals[j] || (val.is && val.is(vals[j]));
                    if(found){ break; }
                }
                if(!found){ vals.push(val); }
            }
        }
        return vals;
    }

    function Bin(key){
        this.key = key;
        this.value = [];
    }

    Array.prototype.breakdown = function(){
        var args = Array.prototype.slice.call(arguments);
        if(args.length == 0){ return null }
        
        var func = args.shift();
        
        if(args.length > 0){        
            var bins = []
            var distinct = this.selectDistinct(func);
            for(var d  = 0; d < distinct.length; d++){
                var dval = distinct[d];
                var bin = new Bin(dval);
                var items = this.filter(function(i){ var idval = func(i); if(idval == dval || (idval.is && idval.is(dval))){ return true; } });
                if(args.length > 0){
                    items = Array.prototype.breakdown.apply(items, args);
                }            
                bin.value = items;
                bins.push(bin);
            }
            return bins;
        }else{
            return func(this);
        }
    }

    // STO CLR specific

    function GetInternalType(internalName){
        switch(internalName.substr(0,2)){
            case 'P[': return 'player';
            case 'C[': return 'npc';
            case 'Pn': return 'power';
        }
        return null;
    }

    this.InternallyNamedEntity = function(displayName, internalName){
        this.display = displayName;
        this.internal = internalName;
        this.type = GetInternalType(internalName);
    }
    this.InternallyNamedEntity.prototype.is = function(other){
        var isSame = other.internal == this.internal;
        return isSame;
    }

    this.CombatLogLine = function(line){
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
    
    this.Guid = function() {
        function s4() {
            return Math.floor((1 + Math.random()) * 0x10000)
                .toString(16)
                .substring(1);
        }
        return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
            s4() + '-' + s4() + s4() + s4();
    }
    
    return this;
    
}());