const COMMANDS = {
    SET_SERVER_INFO: 'setserverinfo',
    ADD_EMBED: 'addembed',
    REMOVE_EMBED: 'removeembed',
    SET_RUST_MONITOR: 'setrustmonitor',
    STOP_RUST_MONITOR: 'stoprustmonitor',
};

const OPTIONS = {
    SERVER_NAME: 'servername',
    COLOR: 'color',
    IP_ADDRESS: 'ipaddress',
    WIPE_DAY: 'wipe_day',
    WIPE_TIME: 'wipe_time',
    RESTART_TIME: 'restart_time',
    MODE: 'mode',
    TEAM_LIMIT: 'teamlimit',
    MAP: 'map',
    ICON_URL: 'iconurl',
    EMBED_INDEX: 'index',
    BMID: 'bmid',
};

const DAYS_OF_WEEK = [
    { name: 'Monday', value: 'Monday' }, { name: 'Tuesday', value: 'Tuesday' }, { name: 'Wednesday', value: 'Wednesday' },
    { name: 'Thursday', value: 'Thursday' }, { name: 'Friday', value: 'Friday' }, { name: 'Saturday', value: 'Saturday' },
    { name: 'Sunday', value: 'Sunday' }
];

const RUST_MODES = [
    { name: 'Vanilla', value: 'Vanilla' }, { name: 'Modded', value: 'Modded' }, { name: 'Survival', value: 'Survival' },
    { name: 'Softcore', value: 'Softcore' }, { name: 'Hardcore', value: 'HardCore' },
    { name: 'Primitive', value: 'Primitive' }
];

const RUST_TEAM_LIMITS = [
    { name: 'Solo', value: 'Solo' }, { name: 'Duo', value: 'Duo' }, { name: 'Trio', value: 'Trio' },
    { name: 'Squad', value: 'Squad' }, { name: 'NoLimit', value: 'NoLimit' }
];

const RUST_MAPS = [
    { name: 'Procedural', value: 'Procedural' }, { name: 'Barren', value: 'Barren' }, { name: 'Custom', value: 'Custom' },
    { name: 'Hapis', value: 'Hapis Island' }, { name: 'Savas', value: 'Savas Island' }
];

const DATA_FILES = {
    EMBEDS: 'embedsData.json',
    MONITORS: 'monitors_combined_v3.json',
};

const EMBED_DEFAULTS = {
    COLOR: '#FAA61A',
};

const MONITORING_DEFAULTS = {};

module.exports = {
    COMMANDS,
    OPTIONS,
    DAYS_OF_WEEK,
    RUST_MODES,
    RUST_TEAM_LIMITS,
    RUST_MAPS,
    DATA_FILES,
    EMBED_DEFAULTS,
    MONITORING_DEFAULTS,
};