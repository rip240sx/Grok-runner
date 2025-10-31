// app/page.tsx
"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import MobileLandscapeGuard from "@/components/MobileLandscapeGuard";
import Joystick, { JumpButton } from "@/components/Joystick";

interface Platform { x: number; y: number; w: number; h: number; }
interface FloorSegment { x: number; w: number; }
interface Enemy { x: number; y: number; w: number; h: number; vx: number; alive: boolean; animFrame: number; }
interface Coin { x: number; y: number; w: number; h: number; collected: boolean; animFrame: number; }
interface Wormhole { x: number; y: number; w: number; h: number; animFrame: number; }
interface GameState { level: number; score: number; lives: number; gameOver: boolean; levelComplete: boolean; transitioning: boolean; }
type GameScreen = "menu" | "howToPlay" | "playing" | "gameOver";

export default function Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const joyRef = useRef({ x: 0, y: 0 });
  const jumpRef = useRef(false);
  const [gameScreen, setGameScreen] = useState<GameScreen>("menu");

  const camera = useRef({ x: 0, y: 0 });
  const player = useRef({ x: 100, y: 200, vx: 0, vy: 0, w: 40, h: 60, grounded: false, facingRight: true, walkFrame: 0, walkTimer: 0, invincible: false, invincibleTimer: 0 });
  const gameState = useRef<GameState>({ level: 1, score: 0, lives: 3, gameOver: false, levelComplete: false, transitioning: false });
  const platforms = useRef<Platform[]>([]);
  const floorSegments = useRef<FloorSegment[]>([]);
  const enemies = useRef<Enemy[]>([]);
  const coins = useRef<Coin[]>([]);
  const wormhole = useRef<Wormhole | null>(null);
  const levelWidth = useRef(3000);

  const initAudio = useCallback(() => {}, []);
  const playSoundEffect = useCallback((type: "jump" | "coin" | "hit" | "wormhole") => {}, []);

  const generateLevel = useCallback((level: number) => {
    platforms.current = [];
    floorSegments.current = [];
    enemies.current = [];
    coins.current = [];
    wormhole.current = null;

    const baseY = 400;
    let x = 0;
    platforms.current.push({ x: 0, y: baseY, w: 300, h: 100 });

    while (x < levelWidth.current) {
      const gap = 80 + Math.random() * 100;
      x += 200 + gap;
      const w = 150 + Math.random() * 200;
      const h = 20;
      const y = baseY - 50 + Math.random() * 100;
      platforms.current.push({ x, y, w, h });
      if (Math.random() < 0.7) floorSegments.current.push({ x, w });
      if (Math.random() < 0.4) enemies.current.push({ x: x + 50, y: y - 50, w: 40, h: 40, vx: (Math.random() > 0.5 ? 1 : -1) * 2, alive: true, animFrame: 0 });
      for (let i = 0; i < 3; i++) if (Math.random() < 0.6) coins.current.push({ x: x + 50 + i * 60, y: y - 80, w: 30, h: 30, collected: false, animFrame: 0 });
      x += w;
    }
    wormhole.current = { x: levelWidth.current - 200, y: baseY - 100, w: 80, h: 80, animFrame: 0 };
  }, []);

  const requestJump = useCallback(() => { jumpRef.current = true; }, []);
  const startGame = useCallback(() => {
    gameState.current = { level: 1, score: 0, lives: 3, gameOver: false, levelComplete: false, transitioning: false };
    player.current = { x: 100, y: 200, vx: 0, vy: 0, w: 40, h: 60, grounded: false, facingRight: true, walkFrame: 0, walkTimer: 0, invincible: false, invincibleTimer: 0 };
    camera.current = { x: 0, y: 0 };
    generateLevel(1);
    setGameScreen("playing");
  }, [generateLevel]);

  const retryGame = useCallback(() => { startGame(); }, [startGame]);
  const quitToMenu = useCallback(() => { setGameScreen("menu"); }, []);

  // === GAME LOOP + DRAWING ===
  useEffect(() => {
    if (gameScreen !== "playing" || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d")!;
    canvas.width = 800;
    canvas.height = 600;

    let lastTime = 0;
    const gameLoop = (time: number) => {
      const delta = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;

      const joy = joyRef.current;
      player.current.vx = joy.x * 300;
      if (jumpRef.current && player.current.grounded) {
        player.current.vy = -600;
        player.current.grounded = false;
      }
      jumpRef.current = false;

      player.current.vy += 1800 * delta;
      player.current.x += player.current.vx * delta;
      player.current.y += player.current.vy * delta;

      // Simple collision with first platform
      const ground = platforms.current[0];
      if (player.current.y + player.current.h > ground.y && player.current.x + player.current.w > ground.x && player.current.x < ground.x + ground.w) {
        player.current.y = ground.y - player.current.h;
        player.current.vy = 0;
        player.current.grounded = true;
      }

      // Camera follow
      camera.current.x = player.current.x - 400;

      // === DRAW ===
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      ctx.translate(-camera.current.x, 0);

      // Draw platforms
      ctx.fillStyle = "#333";
      platforms.current.forEach(p => ctx.fillRect(p.x, p.y, p.w, p.h));

      // Draw player
      ctx.fillStyle = player.current.invincible && Math.floor(Date.now() / 100) % 2 ? "#aaa" : "#4ECDC4";
      ctx.fillRect(player.current.x, player.current.y, player.current.w, player.current.h);

      // Draw wormhole
      if (wormhole.current) {
        ctx.fillStyle = "#00ff00";
        ctx.beginPath();
        ctx.arc(wormhole.current.x + 40, wormhole.current.y + 40, 30 + Math.sin(Date.now() * 0.01) * 5, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();

      requestAnimationFrame(gameLoop);
    };

    requestAnimationFrame(gameLoop);
  }, [gameScreen]);

  if (gameScreen === "menu") return <MenuScreen onStart={startGame} onHowToPlay={() => setGameScreen("howToPlay")} />;
  if (gameScreen === "howToPlay") return <HowToPlayScreen onBack={() => setGameScreen("menu")} />;
  if (gameScreen === "gameOver") return <GameOverScreen score={gameState.current.score} level={gameState.current.level} onRetry={retryGame} onQuit={quitToMenu} />;

  return (
    <MobileLandscapeGuard startButtonLabel="Play">
      <div className="full-viewport" style={{ position: "relative" }}>
        <canvas ref={canvasRef} className="game-canvas" style={{ display: "block", background: "#000" }} />
        <Joystick onMove={(v) => { joyRef.current = v; }} />
        <JumpButton onJump={requestJump} />
      </div>
    </MobileLandscapeGuard>
  );
}

// === SCREENS (unchanged) ===
function MenuScreen({ onStart, onHowToPlay }: { onStart: () => void; onHowToPlay: () => void }) {
  return (
    <div style={{ width: "100vw", height: "100vh", background: "linear-gradient(135deg, #0a1a1a 0%, #1a3a2a 100%)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 40 }}>
      <h1 style={{ fontSize: 64, color: "#4ECDC4", textShadow: "0 0 10px #4ECDC4" }}>CYBER GROK</h1>
      <button onClick={onStart} style={{ padding: "20px 60px", fontSize: 28, background: "#4ECDC4", color: "#000", border: "none", borderRadius: 15 }}>START GAME</button>
      <button onClick={onHowToPlay} style={{ padding: "15px 50px", fontSize: 22, background: "transparent", color: "#4ECDC4", border: "3px solid #4ECDC4", borderRadius: 15 }}>HOW TO PLAY</button>
    </div>
  );
}

function HowToPlayScreen({ onBack }: { onBack: () => void }) {
  return (
    <div style={{ width: "100vw", height: "100vh", background: "linear-gradient(135deg, #0a1a1a 0%, #1a3a2a 100%)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 30 }}>
      <h1 style={{ fontSize: 48, color: "#4ECDC4" }}>HOW TO PLAY</h1>
      <p style={{ color: "#aaa", textAlign: "center", maxWidth: 600 }}>Use joystick to run. Tap jump. Collect chips. Avoid viruses. Reach portal!</p>
      <button onClick={onBack} style={{ padding: "15px 50px", fontSize: 22, background: "transparent", color: "#4ECDC4", border: "3px solid #4ECDC4", borderRadius: 15 }}>BACK</button>
    </div>
  );
}

function GameOverScreen({ score, level, onRetry, onQuit }: { score: number; level: number; onRetry: () => void; onQuit: () => void }) {
  return (
    <div style={{ width: "100vw", height: "100vh", background: "linear-gradient(135deg, #1a0a0a 0%, #3a1a1a 100%)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 30 }}>
      <h1 style={{ fontSize: 56, color: "#FF3366" }}>GAME OVER</h1>
      <p style={{ fontSize: 28, color: "#FFD700" }}>Score: {score}</p>
      <p style={{ fontSize: 24, color: "#4ECDC4" }}>Level: {level}</p>
      <button onClick={onRetry} style={{ padding: "18px 45px", fontSize: 24, background: "#4ECDC4", color: "#000", border: "none", borderRadius: 15 }}>RETRY</button>
      <button onClick={onQuit} style={{ padding: "18px 45px", fontSize: 24, background: "transparent", color: "#FF3366", border: "3px solid #FF3366", borderRadius: 15 }}>QUIT</button>
    </div>
  );
}
