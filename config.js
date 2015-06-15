var config = {
    
    port: 3333,
    
    combatLogFile: 'D:/Games/Steam/steamapps/common/Star Trek Online/Star Trek Online/Live/logs/GameClient/Combatlog.Log',
    combatLogArchiveDirectory: 'D:/Games/Steam/steamapps/common/Star Trek Online/Star Trek Online/Live/logs/GameClient/Combatlog_archive',

    segmentSplitTime: 2.5 * 60 * 1000,
    timeDisplayFormat: 'YYYYMMDD HH.mm.ss.S',
    
    autoArchiveEnabled: true,
    autoArchiveKeepSegments: 5,
}

module.exports = config;