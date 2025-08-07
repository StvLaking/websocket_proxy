
const uuid = require('uuid');
const WebSocket = require('ws');
const ReconnectingWebSocket = require('reconnecting-websocket');

// 存储所有客户端连接
const sessionIds = new Map();

const targetConnection = new ReconnectingWebSocket('ws://127.0.0.1:16888/ks/printer', [], {
  WebSocket: WebSocket,          // add due to build package problem, pkg not support node22
  // 重连配置
  reconnectInterval: 1000,       // 初始重连间隔(ms)
  maxReconnectInterval: 60000,   // 最大重连间隔
  reconnectDecay: 10,            // 重连间隔增长因子
  maxRetries: Infinity,          // 最大重试次数
  connectionTimeout: 3000        // 连接超时时间
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
const proxyServer = new WebSocket.Server({ port: 6888 });
console.log(getDateTime(),'ProxyServer running at ws://localhost:6888');

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
      //console.log(`Processed requestID: ${wsmsg.requestID}`);

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
  console.log(getDateTime(),'Connected to local kuaishou print tool');
});

targetConnection.addEventListener('message', (event,args) => {
  // enhance later for debug
  //console.log(getDateTime(),'Received:', event.data);

  /// check source connection by requestID
  const recwsmsg = JSON.parse(event.data);
  sessionIds.get(recwsmsg.requestID).send(event.data);
});

targetConnection.addEventListener('close', () => {
  console.log(getDateTime(),'Disconnected, will retry...');
});

targetConnection.addEventListener('error', (error) => {
  console.error(getDateTime(),'WebSocket error:', error.message);
});