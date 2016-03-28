# master-server
a super simple master server for connecting devices for local multiplayer games

```
npm install
node index.js
```

hosts should make themselves known by calling `addHost/<hostName>/<ipAddress>` every second

clients request a list of hosts by sending a request to `hosts`
