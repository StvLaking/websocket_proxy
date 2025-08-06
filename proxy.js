
const WebSocket = require('ws');
const ReconnectingWebSocket = require('reconnecting-websocket');

const targetConnection = new ReconnectingWebSocket('ws://localhost:16888/ks/printer', [], {
  // 重连配置
  reconnectInterval: 1000,       // 初始重连间隔(ms)
  maxReconnectInterval: 60000,   // 最大重连间隔
  reconnectDecay: 10,            // 重连间隔增长因子
  maxRetries: Infinity,          // 最大重试次数
  connectionTimeout: 3000        // 连接超时时间
});

let sourceConnection = null;

// 创建代理服务器监听客户端连接
const proxyServer = new WebSocket.Server({ port: 6888 });
console.log('proxyServer running at ws://localhost:6888');

targetConnection.addEventListener('open', () => {
  console.log('Connected to local kuaishou print tool');

  // proxy connection
  proxyServer.on('connection', (client) => {   
    console.log(`New clinet connected`);    
    sourceConnection = client;

    // 客户端消息转发到目标服务器
    client.on('message', (data) => {
      console.log(`Forward msg to kuaishou: ${data}`);
      targetConnection.send(data.toString('utf8'));      
    });
  });

});

targetConnection.addEventListener('message', (event) => {
  console.log('Received:', event.data);
  sourceConnection.send(event.data);
});

targetConnection.addEventListener('close', () => {
  console.log('Disconnected, will retry...');
});

targetConnection.addEventListener('error', (error) => {
  console.error('WebSocket error:', error.type);
});