
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

// 创建代理服务器监听客户端连接
const proxyServer = new WebSocket.Server({ port: 6888 });
console.log('proxyServer running at ws://localhost:6888');

// proxy connection
proxyServer.on('connection', (client) => {
  const sessionId = uuid.v4();
  sessionIds.set(sessionId, client);
  console.log(`New clinet connected : ${sessionId}`);

  // 客户端消息转发到目标服务器
  client.on('message', (data) => {
    console.log(`received msg from client: ${data}`);
    // update requestID to trace sourceConnection
    try {
      const wsmsg = JSON.parse(data);
      wsmsg.requestID = sessionId;    
      //console.log(`Processed requestID: ${wsmsg.requestID}`);

      // Send to target websocket
      targetConnection.send(JSON.stringify(wsmsg));
    } catch (err) {
      console.error('Message update processing failed:', err);
    }   
  });

  // proxy clinet close
  client.on('close',() => {
    console.log(`clinet disconnected : ${sessionId}`);   
    sessionIds.delete(sessionId);
  });
});


targetConnection.addEventListener('open', () => {
  console.log('Connected to local kuaishou print tool');
});

targetConnection.addEventListener('message', (event) => {
  console.log('Received:', event.data);
  /// check by sessionID 
  /// sessionIds.get(org_sessionId).send(event.data);
  const recwsmsg = JSON.parse(event.data);
  sessionIds.get(recwsmsg.requestID).send(event.data);
 
  //sourceConnection.send(event.data);  original 
});

targetConnection.addEventListener('close', () => {
  console.log('Disconnected, will retry...');
});

targetConnection.addEventListener('error', (error) => {
  console.error('WebSocket error:', error.message);
});