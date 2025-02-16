const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const crypto = require("crypto");
const cors = require("cors");

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Generate fixed keys for encryption
const algorithm = "aes-256-cbc";
const secretKey = crypto.randomBytes(32).toString("hex"); // Fixed key
const iv = crypto.randomBytes(16).toString("hex"); // Fixed IV

const encryptMessage = (text) => {
  try {
    if (!text) return null;
    const cipher = crypto.createCipheriv(algorithm, Buffer.from(secretKey, "hex"), Buffer.from(iv, "hex"));
    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");
    return encrypted;
  } catch (error) {
    console.error("Encryption Error:", error);
    return null;
  }
};

const decryptMessage = (encryptedText) => {
  try {
    if (!encryptedText) return null;
    const decipher = crypto.createDecipheriv(algorithm, Buffer.from(secretKey, "hex"), Buffer.from(iv, "hex"));
    let decrypted = decipher.update(encryptedText, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (error) {
    console.error("Decryption Error:", error);
    return null;
  }
};

let users = {};
let messageHistory = [];

io.on("connection", (socket) => {
  const sessionId = crypto.randomBytes(16).toString("hex"); // Anonymous session
  users[socket.id] = sessionId;

  socket.on("setUsername", (username) => {
    users[socket.id] = username || `Anon-${sessionId}`;
  });

  socket.on("message", (data) => {
    if (!data || !data.message) {
      console.warn("Received empty message, ignoring...");
      return;
    }

    const encryptedMessage = encryptMessage(data.message);
    if (!encryptedMessage) return;

    const msgData = {
      user: users[socket.id] || "Anonymous",
      message: encryptedMessage,
      timestamp: Date.now(),
    };

    messageHistory.push(msgData);
    io.emit("message", msgData);
  });

  socket.on("userTyping", () => {
    socket.broadcast.emit("userTyping", users[socket.id]);
  });

  socket.on("disconnect", () => {
    delete users[socket.id];
  });
});

server.listen(5000, "127.0.0.1", () => {
  console.log("Server running securely on port 5000...");
});
