import { io } from "socket.io-client";

const socket = io("http://localhost:4000", { auth: { token: process.argv[2] } });

socket.on("connect", () => console.log("ligado:", socket.id));
socket.on("connect_error", (err) => console.log("erro de ligação:", err.message));
socket.on("message:new", (msg) => console.log("nova mensagem:", msg));