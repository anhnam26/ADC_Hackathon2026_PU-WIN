import React from "react";
import ReactDOM from "react-dom/client";
import AuthGate from './features/auth/AuthGate';
import {purgeNpcCollisionQueue} from './lib/collisionQueue';
import './styles/notes.css';
import './styles/collisions.css';
import "./styles/main.css";
import "./styles/readability.css";
import './styles/simulator.css';
import './styles/simulator-accessibility.css';
import './styles/game.css';

try{purgeNpcCollisionQueue(localStorage);}catch{/* Storage may be unavailable. */}
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthGate />
  </React.StrictMode>,
);
