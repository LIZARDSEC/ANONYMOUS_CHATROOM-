import { useEffect } from "react";
import "../styles/welcome.css"; // Ensure this is correctly linked

const Welcome = () => {
  useEffect(() => {
    const nameInput = document.getElementById("name-input");
    const enterChatButton = document.getElementById("enter-chat");

    enterChatButton.addEventListener("click", () => {
      const name = nameInput.value.trim() || "Anon";
      sessionStorage.setItem("username", name);
      window.location.href = "/chat";
    });

    nameInput.addEventListener("keypress", (event) => {
      if (event.key === "Enter") enterChatButton.click();
    });
  }, []);

  return (
    <div className="welcome-container">
      <h1 className="welcome-title">👨‍💻 Welcome to Anon Chatroom</h1>
      <p className="welcome-subtitle">Enter your name to join the chat anonymously</p>
      <input id="name-input" type="text" placeholder="Enter your name" className="input-field"/>
      <button id="enter-chat" className="enter-button">Enter Chat</button>
    </div>
  );
};

export default Welcome;
