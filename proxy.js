const fs = require('fs');
const uuid = require('uuid');
const WebSocket = require('ws');
const ReconnectingWebSocket = require('reconnecting-websocket');

const _CONFIG = require('./config');    //default config.js
// config.json to overwrite default
const config = readConfig('config.json'); //extenal config config.js

const listenWS_Port = config.listenWS_Port || _CONFIG.listenWS_Port;
const targetWS_URL = config.targetWS_URL || _CONFIG.targetWS_URL ;
const reconnectInterval = config.reconnectInterval || _CONFIG.reconnectInterval ;
const maxReconnectInterval = config.maxReconnectInterval || _CONFIG.maxReconnectInterval ;
const reconnectDecay = config.reconnectDecay || _CONFIG.reconnectDecay ;
const maxRetries = config.maxRetries || _CONFIG.maxRetries ;
const connectionTimeout = config.connectionTimeout || _CONFIG.connectionTimeout ;

// 存储所有客户端连接
const sessionIds = new Map();

const targetConnection = new ReconnectingWebSocket(targetWS_URL, [], {
  WebSocket: WebSocket,  // add due to build package problem, pkg not support node22
  // 重连配置
  reconnectInterval:    reconnectInterval,       // 初始重连间隔(ms)
  maxReconnectInterval: maxReconnectInterval,    // 最大重连间隔
  reconnectDecay:       reconnectDecay,          // 重连间隔增长因子
  maxRetries:           maxRetries,              // 最大重试次数
  connectionTimeout:    connectionTimeout        // 连接超时时间
});

console.log('==============================================');
console.log('listenWS_Port:',listenWS_Port);
console.log('targetWS_URL:',targetWS_URL);
console.log('reconnectInterval:',reconnectInterval);
console.log('maxReconnectInterval:',maxReconnectInterval);
console.log('reconnectDecay:',reconnectDecay);
console.log('maxRetries:',maxRetries);
console.log('connectionTimeout:',connectionTimeout);
console.log('==============================================');

// read config.json
function readConfig(filePath) {
  try {  
    const data = fs.readFileSync(filePath, 'utf8');
    const config = JSON.parse(data);
    console.log("readConfig config.json");
    return config;
  } catch (err) {
    console.log("Missing config.json(using default setting)");
    return JSON.parse('{}');
  }
}

/// log time
function getDateTime() {
  const now = new Date();
  const postfix = '-';
  const dateStr = `${now.getFullYear()}-${(now.getMonth()+1).toString().padStart(2,'0')}-${now.getDate().toString().padStart(2,'0')}`;
  const timeStr = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}:${now.getSeconds().toString().padStart(2,'0')}`;
  return `${dateStr} ${timeStr} ${postfix}`; 
}

// Param for log (debug only)
const args = {};
process.argv.slice(2).forEach(arg => {
  const [key, value] = arg.replace(/^--/, '').split('=');
  args[key] = value || true; 
});

if (args.debug == true){
  console.log(args);
};

// 创建代理服务器监听客户端连接
const proxyServer = new WebSocket.Server({ port: listenWS_Port });
console.log(getDateTime(),'ProxyServer running at ws://localhost:',listenWS_Port);

// proxy connection
proxyServer.on('connection', (client) => {
  const sessionId = uuid.v4();
  sessionIds.set(sessionId, client);
  console.log(getDateTime(),`New clinet connected : ${sessionId}`);

  // 客户端消息转发到目标服务器
  client.on('message', (data) => {
    if (args.debug == true){
      console.log(getDateTime(),`received msg from client: ${data}`);
    }
    // update requestID to trace sourceConnection
    try {
      const wsmsg = JSON.parse(data);
      wsmsg.requestID = sessionId;    
      //console.log(getDateTime(),`Processed requestID: ${wsmsg.requestID}`);

      // Send to target websocket
      targetConnection.send(JSON.stringify(wsmsg));
    } catch (err) {
      console.error(getDateTime(),'Message update processing failed:', err);
    }   
  });

  // proxy clinet close
  client.on('close',() => {
    console.log(getDateTime(),`Clinet disconnected : ${sessionId}`);
    sessionIds.delete(sessionId);
  });
});

targetConnection.addEventListener('open', () => {
  console.log(getDateTime(),'Connected to target local websocket service:',targetWS_URL);
});

targetConnection.addEventListener('message', (event,args) => {
  // enhance later for debug flag
  //console.log(getDateTime(),'Received:', event.data);

  /// check source connection by requestID
  const recwsmsg = JSON.parse(event.data);
  sessionIds.get(recwsmsg.requestID).send(event.data);
});

targetConnection.addEventListener('close', () => {
  console.log(getDateTime(),'Target websocket disconnected, will retry...');
});

targetConnection.addEventListener('error', (error) => {
  console.error(getDateTime(),'Target webSocket error:', error.message);
});