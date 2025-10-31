// app/page.tsx
"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import MobileLandscapeGuard from "@/components/MobileLandscapeGuard";
import Joystick, { JumpButton } from "@/components/Joystick";

interface Platform { x: number; y: number; w: number; h: number; }
interface Coin { x: number; y: number; w: number; h: number; collected: boolean; }
interface Enemy { x: number; y: number; w: number; h: number; vx: number; alive: boolean; }
interface Wormhole { x: number; y: number; w: number; h: number; animFrame: number; }

export default function Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const joyRef = useRef({ x: 0, y: 0 });
  const jumpRef = useRef(false);
  const [gameScreen, setGameScreen] = useState<"menu" | "playing" | "gameOver">("menu");

  const camera = useRef({ x: 0, y: 0 });
  const player = useRef({ x: 100, y: 200, vx: 0, vy: 0, w: 40, h: 60, grounded: false, facingRight: true });
  const gameState = useRef({ level: 1, score: 0, lives: 3, gameOver: false });
  const platforms = useRef<Platform[]>([]);
  const coins = useRef<Coin[]>([]);
  const enemies = useRef<Enemy[]>([]);
  const wormhole = useRef<Wormhole | null>(null);
  const levelWidth = useRef(3000);

  // === GENERATE LEVEL ===
  const generateLevel = useCallback(() => {
    platforms.current = [];
    coins.current = [];
    enemies.current = [];
    wormhole.current = null;

    const baseY = 400;
    let x = 0;
    platforms.current.push({ x: 0, y: baseY, w: 300, h: 100 });

    while (x < levelWidth.current) {
      const gap = 80 + Math.random() * 100;
      x += 200 + gap;
      const w = 150 + Math.random() * 200;
      const y = baseY - 50 + Math.random() * 100;
      platforms.current.push({ x, y, w, h: 20 });
      if (Math.random() < 0.6) coins.current.push({ x: x + 50, y: y - 80, w: 30, h: 30, collected: false });
      if (Math.random() < 0.4) enemies.current.push({ x: x + 50, y: y - 50, w: 40, h: 40, vx: (Math.random() > 0.5 ? 1 : -1) * 2, alive: true });
      x += w;
    }
    wormhole.current = { x: levelWidth.current - 200, y: baseY - 100, w: 80, h: 80, animFrame: 0 };
  }, []);

  const startGame = useCallback(() => {
    gameState.current = { level: 1, score: 0, lives: 3, gameOver: false };
    player.current = { x: 100, y: 200, vx: 0, vy: 0, w: 40, h: 60, grounded: false, facingRight: true };
    camera.current = { x: 0, y: 0 };
    generateLevel();
    setGameScreen("playing");
  }, [generateLevel]);

  const gameOver = () => {
    gameState.current.gameOver = true;
    setGameScreen("gameOver");
  };

  // === GAME LOOP ===
  useEffect(() => {
    if (typeof window === "undefined" || gameScreen !== "playing" || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d")!;

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

      // COLLISION WITH PLATFORMS
      player.current.grounded = false;
      platforms.current.forEach(p => {
        if (player.current.y + player.current.h > p.y && player.current.y + player.current.h < p.y + p.h + 10 &&
            player.current.x + player.current.w > p.x && player.current.x < p.x + p.w) {
          player.current.y = p.y - player.current.h;
          player.current.vy = 0;
          player.current.grounded = true;
        }
      });

      // COINS
      coins.current.forEach(c => {
        if (!c.collected && Math.abs(player.current.x - c.x) < 40 && Math.abs(player.current.y - c.y) < 40) {
          c.collected = true;
          gameState.current.score += 10;
        }
      });

      // ENEMIES
      enemies.current.forEach(e => {
        if (e.alive) {
          e.x += e.vx * delta * 100;
          if (Math.abs(player.current.x - e.x) < 50 && Math.abs(player.current.y - e.y) < 50) {
            gameState.current.lives--;
            if (gameState.current.lives <= 0) gameOver();
            else player.current.x = 100;
          }
        }
      });

      // WORMHOLE
      if (wormhole.current && Math.abs(player.current.x - wormhole.current.x) < 80 && Math.abs(player.current.y - wormhole.current.y) < 80) {
        gameState.current.level++;
        generateLevel();
        player.current.x = 100;
      }

      // CAMERA
      camera.current.x = player.current.x - canvas.width / 2;

      // === DRAW ===
      ctx.fillStyle = "#0a1a2a";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      ctx.translate(-camera.current.x + canvas.width / 2, 0);

      // BACKGROUND
      ctx.fillStyle = "#001122";
      ctx.fillRect(0, 0, levelWidth.current, canvas.height);

      // PLATFORMS
      ctx.fillStyle = "#333";
      platforms.current.forEach(p => ctx.fillRect(p.x, p.y, p.w, p.h));

      // COINS
      ctx.fillStyle = "#FFD700";
      coins.current.forEach(c => {
        if (!c.collected) {
          ctx.beginPath();
          ctx.arc(c.x + 15, c.y + 15, 15, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // ENEMIES
      ctx.fillStyle = "#FF3366";
      enemies.current.forEach(e => {
        if (e.alive) ctx.fillRect(e.x, e.y, e.w, e.h);
      });

      // WORMHOLE
      if (wormhole.current) {
        ctx.fillStyle = "#00FF00";
        ctx.beginPath();
        ctx.arc(wormhole.current.x + 40, wormhole.current.y + 40, 35 + Math.sin(Date.now() * 0.01) * 5, 0, Math.PI * 2);
        ctx.fill();
      }

      // PLAYER (CUTE GROK)
      ctx.fillStyle = "#4ECDC4";
      ctx.fillRect(player.current.x, player.current.y, player.current.w, player.current.h);
      ctx.fillStyle = "#000";
      ctx.fillRect(player.current.x + 10, player.current.y + 15, 8, 8); // eye
      ctx.fillRect(player.current.x + 22, player.current.y + 15, 8, 8); // eye

      ctx.restore();

      // HUD
      ctx.fillStyle = "#fff";
      ctx.font = "20px monospace";
      ctx.fillText(`Score: ${gameState.current.score}`, 20, 40);
      ctx.fillText(`Lives: ${gameState.current.lives}`, 20, 70);
      ctx.fillText(`Level: ${gameState.current.level}`, 20, 100);
      ctx.fillText(`Created by rip240sx`, canvas.width - 200, canvas.height - 20);

      requestAnimationFrame(loop);
    };

    requestAnimationFrame(loop);

    return () => window.removeEventListener("resize", resize);
  }, [gameScreen, generateLevel]);

  // === SCREENS ===
  if (gameScreen === "menu") {
    return (
      <div style={{ width: "100vw", height: "100vh", background: "linear-gradient(135deg, #0a1a1a, #1a3a2a)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 40 }}>
        <h1 style={{ fontSize: 64, color: "#4ECDC4", textShadow: "0 0 10px #4ECDC4" }}>GROK RUNNER</h1>
        <button onClick={startGame} style={{ padding: "20px 60px", fontSize: 28, background: "#4ECDC4", color: "#000", border: "none", borderRadius: 15 }}>PLAY</button>
      </div>
    );
  }

  if (gameScreen === "gameOver") {
    return (
      <div style={{ width: "100vw", height: "100vh", background: "#1a0a0a", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 30 }}>
        <h1 style={{ fontSize: 56, color: "#FF3366" }}>GAME OVER</h1>
        <p style={{ fontSize: 28, color: "#FFD700" }}>Score: {gameState.current.score}</p>
        <button onClick={startGame} style={{ padding: "18px 45px", fontSize: 24, background: "#4ECDC4", border: "none", borderRadius: 15 }}>RETRY</button>
      </div>
    );
  }

  return (
    <MobileLandscapeGuard startButtonLabel="Play">
      <div style={{ position: "relative", width: "100vw", height: "100vh", overflow: "hidden" }}>
        <canvas ref={canvasRef} style={{ display: "block", width: "100%", height: "100%", position: "absolute", top: 0, left: 0 }} />
        <Joystick onMove={(v) => (joyRef.current = v)} />
        <JumpButton onJump={() => (jumpRef.current = true)} />
      </div>
    </MobileLandscapeGuard>
  );
}
