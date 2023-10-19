const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const port = 3000;
const users = {};

app.use(cors());

app.get('/', (_, res) => {
  res.sendFile(__dirname + '/index.html');
});

io.on('connection', (socket) => {
  socket.on('register', (username, color) => {
    if (Object.keys(users).length === 0) {
      socket.emit('welcome', `Welcome, ${username}! You first`);
    } else {
      socket.emit('welcome', `Welcome, ${username}! Here already: ${Object.values(users).map(user => user.username)}`);
    }

    users[socket.id] = { username, color };
    io.emit('userList', Object.values(users).map(user => user.username));

    socket.broadcast.emit('userJoin', `${username} entered channel`);
  });

  socket.on('message', (message) => {
    const user = users[socket.id];
    if (user) {
      if (message.startsWith('@')) {
        const mentionedUser = message.split(' ')[0].substring(1);

        const mentionedSocket = Object.entries(users).find(([, user]) => user.username === mentionedUser);

        if (mentionedSocket) {
          io.to(mentionedSocket[0]).emit('message', {
            username: user.username,
            message: message.substring(mentionedUser.length + 1),
            color: user.color,
          });
          socket.emit('message', {
            username: user.username,
            message: message.substring(mentionedUser.length + 1),
            color: user.color,
          });
        }
      } else {
        io.emit('message', { username: user.username, message, color: user.color });
      }
    }
  });

  socket.on('disconnect', () => {
    const user = users[socket.id];
    if (user) {
      delete users[socket.id];
      io.emit('userList', Object.values(users).map(user => user.username));
      socket.broadcast.emit('userLeave', `${user.username} disconnect from channel`);
    }
  });
});

server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
