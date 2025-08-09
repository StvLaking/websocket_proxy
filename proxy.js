const uuid = require('uuid');
const WebSocket = require('ws');
const ReconnectingWebSocket = require('reconnecting-websocket');
const config = require('./config');

const targetWS_URL = config.targetWS_URL;
const listenWS_Port = config.listenWS_Port;

// 存储所有客户端连接
const sessionIds = new Map();

const targetConnection = new ReconnectingWebSocket(targetWS_URL, [], {
  WebSocket: WebSocket,          // add due to build package problem, pkg not support node22
  // 重连配置
  reconnectInterval: config.reconnectInterval,       // 初始重连间隔(ms)
  maxReconnectInterval: config.maxReconnectInterval, // 最大重连间隔
  reconnectDecay: config.reconnectDecay,             // 重连间隔增长因子
  maxRetries: config.maxRetries,                     // 最大重试次数
  connectionTimeout: config.connectionTimeout        // 连接超时时间
});

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