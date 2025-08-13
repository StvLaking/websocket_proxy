// config file
var config = {};

// URL:port
config.listenWS_Port = 6888;      //port used for local proxy
config.targetWS_URL = 'ws://127.0.0.1:16888/ks/printer'; 

// reconnecting setting 
config.reconnectInterval = 1000;       // 初始重连间隔(1s)
config.maxReconnectInterval = 3600000; // 最大重连间隔(1hour)
config.reconnectDecay = 1000;          // 重连间隔增长因子(1s)
config.maxRetries = Infinity;          // 最大重试次数
config.connectionTimeout = 3000;       // 连接超时时间(3s)

// default message 
config.timeout_MSG = '{"err":"local websocket connection not open[proxy]"}';

module.exports = config;