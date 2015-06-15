var InternallyNamedEntity = function(displayName, internalName){
    this.display = displayName;
    this.internal = internalName;
    //this.type = GetInternalType(internalName);
}
InternallyNamedEntity.prototype.is = function(other){
    var isSame = other.internal == this.internal;
    return isSame;
}

module.exports = InternallyNamedEntity;