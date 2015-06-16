var util = require('../utility.js');

function GetEntityType(internalName){
    var ss = internalName.substr(0,2);
    switch(ss){
        case 'P[': return util.constants.ENTITY_TYPE_PLAYER;
        case 'C[': return util.constants.ENTITY_TYPE_NPC;
        case 'Pn': return util.constants.ENTITY_TYPE_OTHER;
    }
    return null;
}

var Entity = function(displayName, internalName){    
    this.display = displayName;
    this.internal = internalName;
    this.type = GetEntityType(internalName);
}
Entity.prototype.is = function(other){
    var isSame = other.internal == this.internal;
    return isSame;
}

module.exports = Entity;