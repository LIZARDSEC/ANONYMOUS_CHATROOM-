import { useState, useEffect, useRef, useCallback } from "react";
import { io } from "socket.io-client";
import "../styles/chat.css";
import CryptoJS from "crypto-js";

const socket = io("http://localhost:5000", {
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 2000,
});

const Chat = () => {
  const [username, setUsername] = useState("");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [userTyping, setUserTyping] = useState(null);
  const chatEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Get Username from SessionStorage
  useEffect(() => {
    const storedUsername = sessionStorage.getItem("username") || `Anon_${Math.random().toString(36).substring(2, 7)}`;
    setUsername(storedUsername);
    socket.emit("setUsername", storedUsername);
  }, []);

  // Handle Message Events
  useEffect(() => {
    socket.on("chatHistory", (history) => {
      setMessages(
        history.map((msg) => ({
          ...msg,
          text: decryptMessage(msg.text),
        }))
      );
    });

    socket.on("message", (data) => {
      setMessages((prev) => {
        // Avoid duplicate messages
        if (!prev.some((msg) => msg.id === data.id)) {
          return [...prev, { ...data, text: decryptMessage(data.text) }];
        }
        return prev;
      });
    });

    socket.on("userTyping", (user) => {
      setUserTyping(user);
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => setUserTyping(null), 2000);
    });

    return () => {
      socket.off("message");
      socket.off("chatHistory");
      socket.off("userTyping");
    };
  }, []);

  // Encryption Function
  const encryptMessage = (text) => {
    const iv = CryptoJS.lib.WordArray.random(16);
    const key = CryptoJS.enc.Utf8.parse("super-secret-key");
    const encrypted = CryptoJS.AES.encrypt(text, key, {
      iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    }).toString();
    return `${iv.toString(CryptoJS.enc.Hex)}:${encrypted}`;
  };

  // Decryption Function
  const decryptMessage = (encryptedText) => {
    try {
      const [ivHex, encrypted] = encryptedText.split(":");
      const iv = CryptoJS.enc.Hex.parse(ivHex);
      const key = CryptoJS.enc.Utf8.parse("super-secret-key");
      const decrypted = CryptoJS.AES.decrypt(encrypted, key, {
        iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
      });
      return decrypted.toString(CryptoJS.enc.Utf8);
    } catch (error) {
      return "⚠️ Error decrypting message!";
    }
  };

  // Send Message
  const sendMessage = useCallback(() => {
    if (input.trim() !== "") {
      const encryptedMessage = encryptMessage(input);
      const messageData = {
        id: Date.now(), // Unique ID to prevent duplication
        username,
        text: encryptedMessage,
        time: new Date().toLocaleTimeString(),
      };
      socket.emit("message", messageData);
      setMessages((prev) => [...prev, { ...messageData, text: input }]);
      setInput(""); // Clear input field
    }
  }, [input, username]);

  // Handle Typing Indicator
  const handleTyping = () => {
    if (!typing) {
      setTyping(true);
      socket.emit("userTyping", username);
      setTimeout(() => setTyping(false), 1500);
    }
  };

  // Auto Scroll to Bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="chat-container">
      <h2>Welcome, {username} 🕶️</h2>
      <div className="chat-box">
        {messages.map((msg) => (
          <div key={msg.id} className="chat-message">
            <span className="username">{msg.username}:</span>
            <span className="message-text">{msg.text}</span>
            <span className="message-time">{msg.time}</span>
          </div>
        ))}
        {userTyping && <div className="typing-indicator">{userTyping} is typing...</div>}
        <div ref={chatEndRef} />
      </div>
      <div className="input-box">
        <input
          type="text"
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            handleTyping();
          }}
          placeholder="Type a message..."
        />
        <button onClick={sendMessage}>Send</button>
      </div>
    </div>
  );
};

export default Chat;
