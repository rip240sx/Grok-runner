// app/page.tsx
"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import MobileLandscapeGuard from "@/components/MobileLandscapeGuard";
import Joystick, { JumpButton } from "@/components/Joystick";

// === INTERFACES ===
interface Platform { x: number; y: number; w: number; h: number; }
interface FloorSegment { x: number; w: number; }
interface Enemy { x: number; y: number; w: number; h: number; vx: number; alive: boolean; animFrame: number; }
interface Coin { x: number; y: number; w: number; h: number; collected: boolean; animFrame: number; }
interface Wormhole { x: number; y: number; w: number; h: number; animFrame: number; }
interface GameState { level: number; score: number; lives: number; gameOver: boolean; levelComplete: boolean; transitioning: boolean; }
type GameScreen = "menu" | "howToPlay" | "playing" | "gameOver";

// === MAIN GAME COMPONENT ===
export default function Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const joyRef = useRef({ x: 0, y: 0 });
  const jumpRef = useRef(false);
  const [gameScreen, setGameScreen] = useState<GameScreen>("menu");

  // Game refs
  const camera = useRef({ x: 0, y: 0 });
  const player = useRef({ x: 100, y: 200, vx: 0, vy: 0, w: 40, h: 60, grounded: false, facingRight: true, walkFrame: 0, walkTimer: 0, invincible: false, invincibleTimer: 0 });
  const gameState = useRef<GameState>({ level: 1, score: 0, lives: 3, gameOver: false, levelComplete: false, transitioning: false });
  const platforms = useRef<Platform[]>([]);
  const floorSegments = useRef<FloorSegment[]>([]);
  const enemies = useRef<Enemy[]>([]);
  const coins = useRef<Coin[]>([]);
  const wormhole = useRef<Wormhole | null>(null);
  const levelWidth = useRef(3000);
  const audioContext = useRef<AudioContext | null>(null);
  const musicGain = useRef<GainNode | null>(null);
  const sfxGain = useRef<GainNode | null>(null);

  // === AUDIO INIT ===
  const initAudio = useCallback(() => {
    if (!audioContext.current) {
      audioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      musicGain.current = audioContext.current.createGain();
      musicGain.current.gain.value = 0.3;
      musicGain.current.connect(audioContext.current.destination);
      sfxGain.current = audioContext.current.createGain();
      sfxGain.current.gain.value = 0.5;
      sfxGain.current.connect(audioContext.current.destination);
    }
  }, []);

  const playSoundEffect = useCallback((type: "jump" | "coin" | "hit" | "wormhole") => {
    if (!audioContext.current) return;
    const oscillator = audioContext.current.createOscillator();
    const gain = audioContext.current.createGain();
    oscillator.connect(gain);
    gain.connect(sfxGain.current!);

    if (type === "jump") { oscillator.frequency.setValueAtTime(300, audioContext.current.currentTime); oscillator.frequency.exponentialRampToValueAtTime(600, audioContext.current.currentTime + 0.1); }
    else if (type === "coin") { oscillator.frequency.setValueAtTime(800, audioContext.current.currentTime); oscillator.frequency.exponentialRampToValueAtTime(1200, audioContext.current.currentTime + 0.1); }
    else if (type === "hit") { oscillator.frequency.setValueAtTime(200, audioContext.current.currentTime); oscillator.frequency.exponentialRampToValueAtTime(100, audioContext.current.currentTime + 0.2); }
    else if (type === "wormhole") { oscillator.frequency.setValueAtTime(400, audioContext.current.currentTime); oscillator.frequency.exponentialRampToValueAtTime(100, audioContext.current.currentTime + 0.5); }

    gain.gain.setValueAtTime(0.3, audioContext.current.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioContext.current.currentTime + 0.3);
    oscillator.start();
    oscillator.stop(audioContext.current.currentTime + 0.3);
  }, []);

  // === LEVEL GENERATION ===
  const generateLevel = useCallback((level: number) => {
    platforms.current = [];
    floorSegments.current = [];
    enemies.current = [];
    coins.current = [];
    wormhole.current = null;

    const baseY = 400;
    let x = 0;

    // Starting platform
    platforms.current.push({ x: 0, y: baseY, w: 300, h: 100 });

    while (x < levelWidth.current) {
      const gap = 80 + Math.random() * 100;
      x += 200 + gap;

      const w = 150 + Math.random() * 200;
      const h = 20;
      const y = baseY - 50 + Math.random() * 100;
      platforms.current.push({ x, y, w, h });

      // Floor segment
      if (Math.random() < 0.7) {
        floorSegments.current.push({ x, w });
      }

      // Enemy
      if (Math.random() < 0.4) {
        enemies.current.push({ x: x + 50, y: y - 50, w: 40, h: 40, vx: (Math.random() > 0.5 ? 1 : -1) * 2, alive: true, animFrame: 0 });
      }

      // Coins
      for (let i = 0; i < 3; i++) {
        if (Math.random() < 0.6) {
          coins.current.push({ x: x + 50 + i * 60, y: y - 80, w: 30, h: 30, collected: false, animFrame: 0 });
        }
      }

      x += w;
    }

    // Wormhole at end
    wormhole.current = { x: levelWidth.current - 200, y: baseY - 100, w: 80, h: 80, animFrame: 0 };
  }, []);

  const requestJump = useCallback(() => {
    jumpRef.current = true;
    initAudio();
    playSoundEffect("jump");
  }, [initAudio, playSoundEffect]);

  const startGame = useCallback(() => {
    gameState.current = { level: 1, score: 0, lives: 3, gameOver: false, levelComplete: false, transitioning: false };
    player.current = { x: 100, y: 200, vx: 0, vy: 0, w: 40, h: 60, grounded: false, facingRight: true, walkFrame: 0, walkTimer: 0, invincible: false, invincibleTimer: 0 };
    camera.current = { x: 0, y: 0 };
    generateLevel(1);
    setGameScreen("playing");
  }, [generateLevel]);

  const retryGame = useCallback(() => { startGame(); }, [startGame]);
  const quitToMenu = useCallback(() => { setGameScreen("menu"); }, []);

  // === GAME LOOP ===
  useEffect(() => {
    if (gameScreen !== "playing") return;

    let lastTime = 0;
    const gameLoop = (time: number) => {
      if (!canvasRef.current) return;
      const delta = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;

      const ctx = canvasRef.current.getContext("2d")!;
      const { width, height } = canvasRef.current;

      // Update player
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

      // Collision, camera, etc. (keep your full logic here)
      // ... [your existing game logic]

      requestAnimationFrame(gameLoop);
    };

    requestAnimationFrame(gameLoop);
  }, [gameScreen, generateLevel, playSoundEffect, initAudio]);

  // === RENDER SCREENS ===
  if (gameScreen === "menu") {
    return <MenuScreen onStart={startGame} onHowToPlay={() => setGameScreen("howToPlay")} />;
  }
  if (gameScreen === "howToPlay") {
    return <HowToPlayScreen onBack={() => setGameScreen("menu")} />;
  }
  if (gameScreen === "gameOver") {
    return <GameOverScreen score={gameState.current.score} level={gameState.current.level} onRetry={retryGame} onQuit={quitToMenu} />;
  }

  return (
    <MobileLandscapeGuard startButtonLabel="Play">
      <div className="full-viewport">
        <canvas ref={canvasRef} className="game-canvas" width={800} height={600} />
        <Joystick onMove={(v) => { joyRef.current = v; initAudio(); }} />
        <JumpButton onJump={requestJump} />
      </div>
    </MobileLandscapeGuard>
  );
}

// === MENU SCREEN ===
function MenuScreen({ onStart, onHowToPlay }: { onStart: () => void; onHowToPlay: () => void }) {
  return (
    <div style={{ width: "100vw", height: "100vh", background: "linear-gradient(135deg, #0a1a1a 0%, #1a3a2a 100%)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 40 }}>
      <h1 style={{ fontSize: 64, color: "#4ECDC4", textShadow: "0 0 10px #4ECDC4" }}>CYBER GROK</h1>
      <button onClick={onStart} style={{ padding: "20px 60px", fontSize: 28, background: "#4ECDC4", color: "#000", border: "none", borderRadius: 15, boxShadow: "0 0 15px #4ECDC4" }}>START GAME</button>
      <button onClick={onHowToPlay} style={{ padding: "15px 50px", fontSize: 22, background: "transparent", color: "#4ECDC4", border: "3px solid #4ECDC4", borderRadius: 15 }}>HOW TO PLAY</button>
    </div>
  );
}

// === HOW TO PLAY ===
function HowToPlayScreen({ onBack }: { onBack: () => void }) {
  return (
    <div style={{ width: "100vw", height: "100vh", background: "linear-gradient(135deg, #0a1a1a 0%, #1a3a2a 100%)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 30 }}>
      <h1 style={{ fontSize: 48, color: "#4ECDC4" }}>HOW TO PLAY</h1>
      <p style={{ color: "#aaa", textAlign: "center", maxWidth: 600 }}>Use the joystick to run. Tap jump to leap. Collect chips. Avoid viruses. Reach the portal!</p>
      <button onClick={onBack} style={{ padding: "15px 50px", fontSize: 22, background: "transparent", color: "#4ECDC4", border: "3px solid #4ECDC4", borderRadius: 15 }}>BACK</button>
    </div>
  );
}

// === GAME OVER ===
function GameOverScreen({ score, level, onRetry, onQuit }: { score: number; level: number; onRetry: () => void; onQuit: () => void }) {
  return (
    <div style={{ width: "100vw", height: "100vh", background: "linear-gradient(135deg, #1a0a0a 0%, #3a1a1a 100%)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 30 }}>
      <h1 style={{ fontSize: 56, color: "#FF3366", textShadow: "0 0 10px #FF3366" }}>GAME OVER</h1>
      <p style={{ fontSize: 28, color: "#FFD700" }}>Score: {score}</p>
      <p style={{ fontSize: 24, color: "#4ECDC4" }}>Level: {level}</p>
      <button onClick={onRetry} style={{ padding: "18px 45px", fontSize: 24, background: "#4ECDC4", color: "#000", border: "none", borderRadius: 15 }}>RETRY</button>
      <button onClick={onQuit} style={{ padding: "18px 45px", fontSize: 24, background: "transparent", color: "#FF3366", border: "3px solid #FF3366", borderRadius: 15 }}>QUIT</button>
    </div>
  );
}
