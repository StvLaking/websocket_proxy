// config file
var config = {};

// URL:port
config.listenPort = 6889;
config.targetWsUrl = 'ws://127.0.0.1:16888/ks/printer';  //port used for the https_mitm

// reconnecting setting 
config.reconnectInterval = 1000;       // 初始重连间隔(1s)
config.maxReconnectInterval = 3600000; // 最大重连间隔(1hour)
config.reconnectDecay = 1000;          // 重连间隔增长因子(1s)
config.maxRetries = Infinity;          // 最大重试次数
config.connectionTimeout = 3000;       // 连接超时时间(3s)

module.exports = config;