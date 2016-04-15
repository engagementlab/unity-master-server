# Unity-friendly node.js server
A server for connecting players and dispatching messages. If being used with Unity3D, I recommend the [unity-socket.io](https://github.com/fpanettieri/unity-socket.io) package which supports socket.io 1.x.

The server supports hosting and joining rooms and broadcasting messages within rooms.

## Setup
Be sure that node.js and MongoDB are installed. Then:

**1.** Clone this repository: `git clone https://engagementgamelab.org/master-server.git`

**2.** Install the node package:
	```
	npm install
	node index.js
	```

**3.** Configure. Create a new file `config.js` and fill in the fields from `config.template.js`

**4.** Start the server: `node index.js`

The server should now be running on your localhost. You can verify this by visiting <http://localhost:3000/printRooms>.
