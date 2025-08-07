
# websocket_proxy

this proxy build for forward msg to kuaishou platform websocket service.

```bash
|ClientA <----------------->|       |
|                           | Proxy |<-----------------> Websocket Service
|ClientB <----------------->|       |
```

## nodejs environment
nodejs v18.20.8

### required package list
* ws
* uuid
* Reconnecting-websocket
* pkg


## Planned Features
- convert console app to win service
- add log file
- add configure file to support non kuaishou service