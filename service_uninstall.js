
const { Service } = require('node-windows');

const svc = new Service({
  name: 'KSProxyService',
  description : 'Kuaishou proxy Service',
  script : "C:\\Users\\stvL\\Documents\\websocket_proxy\\proxy.js"
});

svc.on('uninstall', () => {
  console.log ('KSProxyService uninstalled');
});

svc.uninstall();