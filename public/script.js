const socket = io();
let peerConnection;
const localVideo = document.querySelector(".localVideo");
const remoteVideo = document.querySelector(".remoteVideo");
const makeRoomButton = document.querySelector(".make_room_button");
const roomIdInput = document.querySelector(".room_id_input");
const joinRoomButton = document.querySelector(".join_room_button");
const constraints = { audio: true, video: true };
let roomId;

const makeRoom = async () => {
  peerConnection = new RTCPeerConnection();
  peerConnection.addEventListener("icecandidate", (e) => {
    console.log(e);
    const candidate = e.candidate;
    if (candidate) {
      setTimeout(() => {
        console.log("sent");
        socket.emit("icecandidate", { candidate, roomId });
      }, 20000);
    }
  });
  peerConnection.addEventListener("track", (e) => {
    const [stream] = e.streams;
    remoteVideo.srcObject = stream;
  });
  socket.on("icecandidate", (data) => {
    const candidatePlainObject = data.candidate;
    const candidate = new RTCIceCandidate(candidatePlainObject);
    peerConnection.addIceCandidate(candidate);
    console.log("socket", candidate);
  });
  const stream = await navigator.mediaDevices.getUserMedia(constraints);
  localVideo.srcObject = stream;
  stream.getTracks().forEach((track) => peerConnection.addTrack(track, stream));
  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);
  socket.emit("offer", { offer: { type: offer.type, sdp: offer.sdp } });
  socket.on("room_id", (data) => {
    roomId = data.roomId;
  });
  socket.on("answer", async (data) => {
    const answerPlainObject = data.answer;
    const answer = new RTCSessionDescription(answerPlainObject);
    await peerConnection.setRemoteDescription(answer);
    console.log(
      peerConnection.currentLocalDescription,
      peerConnection.currentRemoteDescription
    );
  });
};

const joinRoom = async () => {
  const roomId = roomIdInput.value;
  peerConnection = new RTCPeerConnection();
  peerConnection.addEventListener("icecandidate", (e) => {
    console.log(e);
    const candidate = e.candidate;
    if (candidate) {
      socket.emit("icecandidate", { candidate, roomId });
    }
  });
  socket.on("icecandidate", (data) => {
    console.log("socket", data);
    const candidatePlainObject = data.candidate;
    const candidate = new RTCIceCandidate(candidatePlainObject);
    peerConnection.addIceCandidate(candidate);
  });
  peerConnection.addEventListener("track", (e) => {
    const [stream] = e.streams;
    remoteVideo.srcObject = stream;
  });
  const stream = await navigator.mediaDevices.getUserMedia(constraints);
  localVideo.srcObject = stream;
  stream.getTracks().forEach((track) => peerConnection.addTrack(track, stream));
  socket.emit("getOffer", { roomId });
  socket.once("offer", async (data) => {
    const offerPlainObject = data.offer;
    const offer = new RTCSessionDescription(offerPlainObject);
    await peerConnection.setRemoteDescription(offer);
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    const answerPlainObject = { type: answer.type, sdp: answer.sdp };
    socket.emit("answer", { answer: answerPlainObject, roomId });
  });
};

makeRoomButton.addEventListener("click", makeRoom);
joinRoomButton.addEventListener("click", joinRoom);
