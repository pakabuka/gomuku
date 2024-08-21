const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8080 });

let rooms = {};

wss.on('connection', (ws) => {
    ws.on('message', (message) => {
        const data = JSON.parse(message);

        switch (data.type) {
            case 'join':
                if (!rooms[data.room]) {
                    rooms[data.room] = {
                        players: [],
                        roles: ['black', 'white'], // Available roles
                    };
                }

                // Assign a role to the player
                const playerRole = rooms[data.room].roles.shift(); // 'black' or 'white'
                rooms[data.room].players.push({ ws, role: playerRole });

                const playersInRoom = rooms[data.room].players.length;
                rooms[data.room].players.forEach(client => {
                    client.ws.send(JSON.stringify({
                        type: 'join',
                        room: data.room,
                        players: playersInRoom,
                    }));
                });

                if (playersInRoom === 2) {
                    rooms[data.room].players.forEach(client => {
                        client.ws.send(JSON.stringify({
                            type: 'start',
                            role: client.role,
                        }));
                    });
                }
                break;

            case 'move':
                if (rooms[data.room]) {
                    rooms[data.room].players.forEach(client => {
                        if (client.ws !== ws) {
                            client.ws.send(JSON.stringify({
                                type: 'move',
                                row: data.row,
                                col: data.col,
                                player: data.player,
                            }));
                        }
                    });
                }
                break;

            case 'chat':
                if (rooms[data.room]) {
                    rooms[data.room].players.forEach(client => {
                        client.ws.send(JSON.stringify({
                            type: 'chat',
                            text: data.text,
                            sender: data.sender,
                        }));
                    });
                }
                break;

            case 'leave':
                if (rooms[data.room]) {
                    rooms[data.room].players = rooms[data.room].players.filter(client => client.ws !== ws);
                    rooms[data.room].players.forEach(client => {
                        client.ws.send(JSON.stringify({
                            type: 'player_left',
                            message: 'The other player has left the room.',
                        }));
                    });

                    if (rooms[data.room].players.length === 0) {
                        delete rooms[data.room];
                    } else {
                        // Return the role back to available roles
                        rooms[data.room].roles.push(playerRole);
                    }
                }
                break;
        }
    });

    ws.on('close', () => {
        for (let room in rooms) {
            if (rooms[room].players.find(client => client.ws === ws)) {
                rooms[room].players = rooms[room].players.filter(client => client.ws !== ws);
                rooms[room].players.forEach(client => {
                    client.ws.send(JSON.stringify({
                        type: 'player_left',
                        message: 'The other player has left the room.',
                    }));
                });

                if (rooms[room].players.length === 0) {
                    delete rooms[room];
                }
            }
        }
    });
});

console.log('WebSocket server is running on ws://localhost:8080');