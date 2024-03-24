const { Server } = require("socket.io");
const express = require("express");
const { createServer } = require("http");

const rooms = { some: { sockets: [] } };

const app = express();
const server = createServer(app);
const io = new Server(server);

app.use(express.static("public"));

io.on("connection", (socket) => {
  socket.on("JOINROOM", (roomId) => {
    console.log(`join ${roomId}`);
    if (!rooms[roomId]) {
      socket.emit("NOROOMWITHID");
      return;
    }
    socket.on("icecandidate", (data) => {
      const candidate = data.candidate;
      const sdpMid = data.sdpMid;
      const sdpMLineIndex = data.sdpMLineIndex;
      const socketId = data.socketId;
      io.to(socketId).emit("icecandidate", {
        candidate,
        sdpMid,
        sdpMLineIndex,
        socketId: socketId,
      });
    });
    rooms[roomId].sockets.forEach((s) => {
      console.log("1");
      s.emit("SENDOFFER", { socketId: socket.id });
      console.log("2");
      s.on("icecandidate", (data) => {
        const candidate = data.candidate;
        const sdpMid = data.sdpMid;
        const sdpMLineIndex = data.sdpMLineIndex;
        socket.emit("icecandidate", {
          candidate,
          sdpMid,
          sdpMLineIndex,
          socketId: s.id,
        });
      });
      s.on("SENDOFFER", (data) => {
        console.log("3");
        const offer = data.offer;
        console.log(
          "REC",
          rooms[roomId].sockets.map((_, i) => `S${i}`)
        );
        socket.emit("RECIEVEOFFER", { offer, socketId: s.id });
        socket.on("SENDANSWER", ({ answer }) => {
          console.log("4");
          s.emit("RECIEVEANSWER", { answer, socketId: socket.id });
        });
      });
    });
    rooms[roomId].sockets.push(socket);
    socket.emit("JOINEDROOM");
  });
  socket.on("CREATEROOM", () => {
    rooms[roomId] = { sockets: [] };
    socket.emit("CREATEDROOMID", "ROOMID");
  });
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
