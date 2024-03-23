const { Server } = require("socket.io");
const express = require("express");
const { createServer } = require("http");

const rooms = {};

const app = express();
const server = createServer(app);
const io = new Server(server);

app.use(express.static("public"));

io.on("connection", (socket) => {
  console.log(`new socket connected ${socket.id}`);
  socket.on("offer", (data) => {
    const roomId = Math.random().toString();
    console.log(roomId);
    rooms[roomId] = { offer: data.offer, caller: socket };
    socket.emit("room_id", { roomId });
  });
  socket.on("getOffer", (data) => {
    const offer = rooms[data.roomId].offer;
    socket.emit("offer", { offer });
  });
  socket.on("answer", (data) => {
    const answer = data.answer;
    const roomId = data.roomId;
    rooms[roomId].reciever = socket;
    const callerSocket = rooms[roomId].caller;
    callerSocket.emit("answer", { answer });
  });
  socket.on("icecandidate", (data) => {
    const roomId = data.roomId;
    const candidate = data.candidate;
    const callerSocket = rooms[roomId]?.caller;
    const recieverSocket = rooms[roomId]?.reciever;
    if (callerSocket && callerSocket !== socket) {
      callerSocket.emit("icecandidate", { candidate });
      return;
    }
    if (recieverSocket) recieverSocket.emit("icecandidate", { candidate });
  });
});

server.listen(3000, () => {
  console.log("Server Listening On Port 3000");
});
