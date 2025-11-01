// app/page.tsx
"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import Joystick, { JumpButton } from "@/components/Joystick";

// === ALL INTERFACES ===
interface Platform { x: number; y: number; w: number; h: number; }
interface FloorSegment { x: number; w: number; }
interface Enemy { x: number; y: number; w: number; h: number; vx: number; alive: boolean; animFrame: number; }
interface Coin { x: number; y: number; w: number; h: number; collected: boolean; animFrame: number; }
interface Wormhole { x: number; y: number; w: number; h: number; animFrame: number; }
interface GameState { level: number; score: number; lives: number; gameOver: boolean; levelComplete: boolean; transitioning: boolean; }
type GameScreen = "menu" | "howToPlay" | "playing" | "gameOver";

// === MENU SCREEN (MOVED OUTSIDE) ===
function MenuScreen({ onStart }: { onStart: () => void }) {
  return (
    <div style={{ width: "100vw", height: "100vh", background: "#0b1114", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20 }}>
      <h1 style={{ fontSize: 48, color: "#4ECDC4" }}>GROK RUN</h1>
      <button onClick={onStart} style={{ padding: "15px 40px", fontSize: 24, background: "#4CAF50", color: "white", border: "none", borderRadius: 10 }}>PLAY</button>
    </div>
  );
}

// === MAIN GAME COMPONENT ===
export default function Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const joyRef = useRef({ x: 0, y: 0 });
  const jumpRef = useRef(false);
  const [gameScreen, setGameScreen] = useState<GameScreen>("menu");
  const [isLandscape, setIsLandscape] = useState(true);

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

  const initAudio = useCallback(() => {
    if (audioContext.current) return;
    audioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    musicGain.current = audioContext.current.createGain();
    sfxGain.current = audioContext.current.createGain();
    musicGain.current.connect(audioContext.current.destination);
    sfxGain.current.connect(audioContext.current.destination);
    musicGain.current.gain.value = 0.3;
    sfxGain.current.gain.value = 0.5;
    playBackgroundMusic();
  }, []);

  const playBackgroundMusic = useCallback(() => {
    if (!audioContext.current || !musicGain.current) return;
    const ctx = audioContext.current;
    const osc = ctx.createOscillator(); osc.type = "sine"; osc.frequency.value = 55;
    const gain = ctx.createGain(); gain.gain.value = 0.1;
    osc.connect(gain); gain.connect(musicGain.current!); osc.start();
  }, []);

  const playSoundEffect = useCallback((type: "jump" | "coin") => {
    if (!audioContext.current || !sfxGain.current) return;
    const ctx = audioContext.current; const osc = ctx.createOscillator(); const gain = ctx.createGain();
    osc.connect(gain); gain.connect(sfxGain.current);
    if (type === "jump") { osc.frequency.value = 400; gain.gain.setValueAtTime(0.3, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1); }
    if (type === "coin") { osc.frequency.value = 800; gain.gain.setValueAtTime(0.4, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1); }
    osc.start(); osc.stop(ctx.currentTime + 0.1);
  }, []);

  const generateLevel = useCallback((level: number) => {
    const canvasHeight = containerRef.current?.clientHeight || 600;
    const groundY = canvasHeight - 100;
    levelWidth.current = 3000 + level * 1000;
    platforms.current = []; floorSegments.current = []; enemies.current = []; coins.current = [];

    let currentX = 0;
    while (currentX < levelWidth.current) {
      const segmentWidth = 200 + Math.random() * 300;
      const hasGap = Math.random() > 0.3 && currentX > 100;
      if (!hasGap || currentX < 100) floorSegments.current.push({ x: currentX, w: segmentWidth });
      else {
        const gapWidth = 80 + Math.random() * 120;
        currentX += gapWidth;
        if (Math.random() > 0.5) platforms.current.push({ x: currentX - gapWidth / 2 - 50, y: groundY - 80 - Math.random() * 60, w: 100, h: 20 });
      }
      currentX += segmentWidth;
    }

    for (let i = 0; i < 10; i++) {
      platforms.current.push({ x: 400 + i * 300, y: groundY - 100 - Math.random() * 100, w: 100, h: 20 });
    }

    for (let i = 0; i < 20; i++) {
      coins.current.push({ x: 200 + i * 150, y: groundY - 100 - Math.random() * 200, w: 25, h: 25, collected: false, animFrame: 0 });
    }

    for (let i = 0; i < 5; i++) {
      enemies.current.push({ x: 500 + i * 400, y: groundY - 40, w: 35, h: 35, vx: 80, alive: true, animFrame: 0 });
    }

    wormhole.current = { x: levelWidth.current - 200, y: groundY - 100, w: 60, h: 80, animFrame: 0 };
    player.current.x = 100; player.current.y = groundY - 100; player.current.vx = 0; player.current.vy = 0; player.current.grounded = false; camera.current.x = 0;
  }, []);

  const startGame = useCallback(() => {
    initAudio();
    gameState.current = { level: 1, score: 0, lives: 3, gameOver: false, levelComplete: false, transitioning: false };
    generateLevel(1);
    setGameScreen("playing");
  }, [initAudio, generateLevel]);

  useEffect(() => {
    const checkOrientation = () => setIsLandscape(window.innerWidth > window.innerHeight);
    checkOrientation();
    window.addEventListener("resize", checkOrientation);
    window.addEventListener("orientationchange", checkOrientation);
    return () => { window.removeEventListener("resize", checkOrientation); window.removeEventListener("orientationchange", checkOrientation); };
  }, []);

  useEffect(() => {
    const setVh = () => document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
    setVh();
    window.addEventListener('resize', setVh);
    return () => window.removeEventListener('resize', setVh);
  }, []);

  const requestJump = useCallback(() => {
    initAudio();
    if (player.current.grounded) {
      jumpRef.current = true;
      playSoundEffect("jump");
      setTimeout(() => jumpRef.current = false, 100);
    }
  }, [initAudio, playSoundEffect]);

  useEffect(() => {
    if (gameScreen !== "playing" || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d")!;
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = '100vw';
      canvas.style.height = '100vh';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    let last = performance.now();
    let raf: number;

    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 1 / 30); last = now;
      const p = player.current; const gs = gameState.current;
      const canvasW = canvas.width / (window.devicePixelRatio || 1);
      const canvasH = canvas.height / (window.devicePixelRatio || 1);
      const groundY = canvasH - 100;

      if (!gs.gameOver) {
        const inputX = joyRef.current.x;
        if (Math.abs(inputX) > 0.1) p.vx = inputX * 300;
        else p.vx *= 0.8;
        if (jumpRef.current && p.grounded) p.vy = -600;
        p.vy += 1200 * dt; p.x += p.vx * dt; p.y += p.vy * dt;

        p.grounded = false;
        for (const seg of floorSegments.current) {
          if (p.x > seg.x && p.x < seg.x + seg.w && p.y + p.h / 2 > groundY && p.y + p.h / 2 < groundY + 30 && p.vy > 0) {
            p.y = groundY - p.h / 2; p.vy = 0; p.grounded = true;
          }
        }
        for (const plat of platforms.current) {
          if (p.x + p.w / 2 > plat.x && p.x - p.w / 2 < plat.x + plat.w && p.y + p.h / 2 > plat.y && p.y + p.h / 2 < plat.y + plat.h + 10 && p.vy > 0) {
            p.y = plat.y - p.h / 2; p.vy = 0; p.grounded = true;
          }
        }

        const cameraX = Math.max(0, Math.min(p.x - canvasW / 3, levelWidth.current - canvasW));
        camera.current.x += (cameraX - camera.current.x) * 5 * dt;
      }

      ctx.save(); ctx.translate(-camera.current.x, 0);
      ctx.fillStyle = "#0a1a1a"; ctx.fillRect(camera.current.x, 0, canvasW, canvasH);

      ctx.fillStyle = "#1a4a3a";
      for (const seg of floorSegments.current) ctx.fillRect(seg.x, groundY, seg.w, 30);
      for (const plat of platforms.current) ctx.fillRect(plat.x, plat.y, plat.w, plat.h);

      ctx.fillStyle = "#FFD700";
      for (const coin of coins.current) if (!coin.collected) ctx.fillRect(coin.x - 12, coin.y - 12, 25, 25);

      ctx.fillStyle = "#FF3366";
      for (const enemy of enemies.current) if (enemy.alive) ctx.fillRect(enemy.x - 17, enemy.y - 17, 35, 35);

      if (wormhole.current) {
        ctx.fillStyle = "#8A2BE2";
        ctx.fillRect(wormhole.current.x - 30, wormhole.current.y - 40, 60, 80);
      }

      ctx.fillStyle = "#4ECDC4";
      ctx.fillRect(p.x - 20, p.y - 30, 40, 60);

      ctx.restore();

      ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(10, 10, 200, 80);
      ctx.fillStyle = "#FFF"; ctx.font = "20px Arial";
      ctx.fillText(`Score: ${gs.score}`, 20, 35);
      ctx.fillText(`Lives: Heart x${gs.lives}`, 20, 65);

      ctx.fillStyle = "#666"; ctx.font = "12px Arial";
      ctx.fillText("Created by David Gutierrez", canvasW - 180, canvasH - 20);

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [gameScreen, generateLevel, playSoundEffect]);

  const Joystick = ({ onMove }: { onMove: (v: { x: number; y: number }) => void }) => {
    const touch = useRef({ x: 0, y: 0, active: false });
    return (
      <div style={{ position: "fixed", bottom: 80, left: 20, width: 100, height: 100, background: "rgba(0,0,0,0.3)", borderRadius: "50%", touchAction: "none" }}
        onTouchStart={(e) => { const t = e.touches[0]; touch.current = { x: t.clientX, y: t.clientY, active: true }; }}
        onTouchMove={(e) => { if (!touch.current.active) return; const t = e.touches[0]; const dx = (t.clientX - touch.current.x) / 50; onMove({ x: Math.max(-1, Math.min(1, dx)), y: 0 }); }}
        onTouchEnd={() => { touch.current.active = false; onMove({ x: 0, y: 0 }); }}
      >
        <div style={{ position: "absolute", top: "50%", left: "50%", width: 40, height: 40, background: "#666", borderRadius: "50%", transform: "translate(-50%, -50%)" }} />
      </div>
    );
  };

  const JumpButton = ({ onJump }: { onJump: () => void }) => (
    <button style={{ position: "fixed", bottom: 80, right: 20, width: 80, height: 80, background: "#4CAF50", color: "white", borderRadius: "50%", fontSize: 16, fontWeight: "bold", border: "none" }}
      onTouchStart={onJump}>JUMP</button>
  );

  if (gameScreen === "menu") {
    return <MenuScreen onStart={startGame} />;
  }

  return (
    <div ref={containerRef} style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "calc(var(--vh) * 100)", overflow: "hidden", background: "#0b1114", touchAction: "none" }}>
      {!isLandscape && <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.95)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: "bold", zIndex: 30 }}>Rotate Device</div>}
      <canvas ref={canvasRef} style={{ display: "block", width: "100vw", height: "100vh", position: "fixed", top: 0, left: 0 }} />
      <Joystick onMove={(v) => joyRef.current = v} />
      <JumpButton onJump={requestJump} />
      <div style={{ position: "absolute", bottom: 10, left: "50%", transform: "translateX(-50%)", color: "#666", fontSize: 12 }}>Created by David Gutierrez</div>
    </div>
  );
                                                         }
