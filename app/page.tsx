// app/page.tsx
"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import MobileLandscapeGuard from "@/components/MobileLandscapeGuard";
import Joystick, { JumpButton } from "@/components/Joystick";

export default function Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const joyRef = useRef({ x: 0, y: 0 });
  const jumpRef = useRef(false);
  const [gameScreen, setGameScreen] = useState<"menu" | "playing">("menu");

  const player = useRef({ x: 100, y: 300, vx: 0, vy: 0, w: 40, h: 60, grounded: true });

  const startGame = () => setGameScreen("playing");

  // === ONLY RUN IN BROWSER ===
  useEffect(() => {
    if (typeof window === "undefined" || gameScreen !== "playing" || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d")!;
    
    // RESIZE CANVAS
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    let lastTime = 0;
    const loop = (time: number) => {
      const delta = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;

      // INPUT
      player.current.vx = joyRef.current.x * 300;
      if (jumpRef.current && player.current.grounded) {
        player.current.vy = -600;
        player.current.grounded = false;
      }
      jumpRef.current = false;

      // PHYSICS
      player.current.vy += 1800 * delta;
      player.current.x += player.current.vx * delta;
      player.current.y += player.current.vy * delta;

      // GROUND COLLISION
      if (player.current.y > canvas.height - 100) {
        player.current.y = canvas.height - 100;
        player.current.vy = 0;
        player.current.grounded = true;
      }

      // === DRAW ===
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // GROUND
      ctx.fillStyle = "#333";
      ctx.fillRect(0, canvas.height - 50, canvas.width, 50);

      // PLAYER
      ctx.fillStyle = "#4ECDC4";
      ctx.fillRect(player.current.x, player.current.y, player.current.w, player.current.h);

      // DEBUG TEXT
      ctx.fillStyle = "#fff";
      ctx.font = "20px monospace";
      ctx.fillText(`X: ${Math.round(player.current.x)} Y: ${Math.round(player.current.y)}`, 20, 40);

      requestAnimationFrame(loop);
    };

    requestAnimationFrame(loop);

    return () => window.removeEventListener("resize", resize);
  }, [gameScreen]);

  // === MENU SCREEN ===
  if (gameScreen === "menu") {
    return (
      <div style={{ width: "100vw", height: "100vh", background: "#111", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 40 }}>
        <h1 style={{ fontSize: 64, color: "#4ECDC4", textShadow: "0 0 10px #4ECDC4" }}>GROK RUNNER</h1>
        <button onClick={startGame} style={{ padding: "20px 60px", fontSize: 28, background: "#4ECDC4", color: "#000", border: "none", borderRadius: 15, boxShadow: "0 0 15px #4ECDC4" }}>
          PLAY
        </button>
      </div>
    );
  }

  // === GAME SCREEN ===
  return (
    <MobileLandscapeGuard startButtonLabel="Play">
      <div style={{ position: "relative", width: "100vw", height: "100vh", overflow: "hidden" }}>
        <canvas
          ref={canvasRef}
          style={{
            display: "block",
            width: "100%",
            height: "100%",
            background: "#000",
            position: "absolute",
            top: 0,
            left: 0,
          }}
        />
        <Joystick onMove={(v) => { joyRef.current = v; }} />
        <JumpButton onJump={() => { jumpRef.current = true; }} />
      </div>
    </MobileLandscapeGuard>
  );
}
