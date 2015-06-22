var moment = require('moment');

Array.prototype.SelectDistinct = function(selector){
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

Array.prototype.Breakdown = function(){
    var args = Array.prototype.slice.call(arguments);
    if(args.length == 0){ return null }
    
    var func = args.shift();
    
    if(args.length > 0){        
        var bins = []
        var distinct = this.SelectDistinct(func);
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

Array.max = function(array, selector){
    selector = selector || function(a){ return a; };
    var mappedArray = array.map(selector);
    return Math.max.apply(Math, mappedArray);
}

module.exports = (function(){
    
    this.constants = {
        ENTITY_TYPE_PLAYER: 'player',
        ENTITY_TYPE_NPC: 'npc',
        ENTITY_TYPE_OTHER: 'other',
    };
    
    this.Guid = function() {
        function s4() {
            return Math.floor((1 + Math.random()) * 0x10000)
                .toString(16)
                .substring(1);
        }
        return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
            s4() + '-' + s4() + s4() + s4();
    }
    
    function GetInternalType(internalName){
        switch(internalName.substr(0,2)){
            case 'P[': return 'player';
            case 'C[': return 'npc';
            case 'Pn': return 'power';
        }
        return null;
    }
    
    this.DamageTypeClass = function(type){
        var damageTypes = {
            energy: ['phaser', 'disruptor', 'plasma', 'tetryon', 'polaron', 'antiproton'],
            kinetic: ['kinetic'],
            physical: ['physical'],
            exotic: ['acid', 'cold', 'electrical', 'fire', 'proton', 'psionic', 'radiation', 'toxic']
        };
        var ltype = type.toLowerCase();
        for(var i in damageTypes){
            if(damageTypes[i].indexOf(ltype) > -1){
                return i;
            }
        }
        return 'unknown';
    }
    
    this.IsDamageType = function(type){
        var damageClass = this.DamageTypeClass(type);
        return damageClass != 'unknown';
    }
    
    return this;
    
}());