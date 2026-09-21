import React from "react";
import ReactDOM from "react-dom/client";
import App from "./app/App";
import "./styles/main.css";
import "./styles/readability.css";
import './styles/simulator.css';
import './styles/simulator-accessibility.css';
import './styles/game.css';

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
