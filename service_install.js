
const { Service } = require('node-windows');

const svc = new Service({
  name: 'KSProxyService',
  description : 'Kuaishou proxy Service',
  // script : "C:\\Users\\stvL\\Documents\\websocket_proxy\\proxy.js"
  script : require('path').join(__dirname, 'proxy.js'),
  logrotate: {
    maxSize: '1m',    // 单个日志文件最大1MB
    keep: 3,          // 保留3个备份
    compress: true    // 压缩旧日志
  }
});

svc.on('install', () => {
  console.log ('KSProxyService installed');
  svc.start();
});

svc.install();
