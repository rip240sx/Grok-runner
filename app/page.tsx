// app/page.tsx
"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import Joystick, { JumpButton } from "@/components/Joystick";

interface Platform { x: number; y: number; w: number; h: number; }
interface FloorSegment { x: number; w: number; }
interface Enemy { x: number; y: number; w: number; h: number; vx: number; alive: boolean; animFrame: number; }
interface Coin { x: number; y: number; w: number; h: number; collected: boolean; animFrame: number; }
interface Wormhole { x: number; y: number; w: number; h: number; animFrame: number; }
interface GameState { level: number; score: number; lives: number; gameOver: boolean; levelComplete: boolean; transitioning: boolean; }
type GameScreen = "menu" | "playing" | "gameOver";

export default function Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const joyRef = useRef({ x: 0, y: 0 });
  const jumpRef = useRef(false);
  const [gameScreen, setGameScreen] = useState<GameScreen>("menu");
  const [isLandscape, setIsLandscape] = useState(true);

  const camera = useRef({ x: 0, y: 0 });
  const player = useRef({ x: 100, y: 200, vx: 0, vy: 0, w: 50, h: 70, grounded: false, facingRight: true, walkFrame: 0, walkTimer: 0, invincible: false, invincibleTimer: 0 });
  const gameState = useRef<GameState>({ level: 1, score: 0, lives: 3, gameOver: false, levelComplete: false, transitioning: false });
  const platforms = useRef<Platform[]>([]);
  const floorSegments = useRef<FloorSegment[]>([]);
  const enemies = useRef<Enemy[]>([]);
  const coins = useRef<Coin[]>([]);
  const wormhole = useRef<Wormhole | null>(null);
  const levelWidth = useRef(3000);
  const audioContext = useRef<AudioContext | null>(null);
  const musicSource = useRef<OscillatorNode | null>(null);
  const sfxGain = useRef<GainNode | null>(null);

  const initAudio = useCallback(() => {
    if (audioContext.current) return;
    audioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    sfxGain.current = audioContext.current.createGain();
    sfxGain.current.connect(audioContext.current.destination);
    sfxGain.current.gain.value = 0.5;
    startBackgroundMusic();
  }, []);

  const startBackgroundMusic = useCallback(() => {
    if (!audioContext.current || musicSource.current) return;
    const ctx = audioContext.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 110;
    gain.gain.value = 0.08;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    musicSource.current = osc;
  }, []);

  const stopBackgroundMusic = useCallback(() => {
    if (musicSource.current) {
      musicSource.current.stop();
      musicSource.current = null;
    }
  }, []);

  const playSoundEffect = useCallback((type: "jump" | "coin" | "hit" | "wormhole") => {
    if (!audioContext.current || !sfxGain.current) return;
    const ctx = audioContext.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(sfxGain.current);

    switch (type) {
      case "jump":
        osc.frequency.value = 400;
        osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
        break;
      case "coin":
        osc.frequency.value = 1000;
        gain.gain.setValueAtTime(0.4, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
        break;
      case "hit":
        osc.type = "square";
        osc.frequency.value = 150;
        gain.gain.setValueAtTime(0.4, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
        break;
      case "wormhole":
        osc.type = "sine";
        osc.frequency.value = 300;
        osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.4);
        gain.gain.setValueAtTime(0.5, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        break;
    }
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  }, []);

  const generateLevel = useCallback((level: number) => {
    const canvasHeight = containerRef.current?.clientHeight || 600;
    const groundY = canvasHeight - 100;
    levelWidth.current = 3000 + level * 1000;
    platforms.current = []; floorSegments.current = []; enemies.current = []; coins.current = [];

    let x = 0;
    while (x < levelWidth.current) {
      const w = 200 + Math.random() * 300;
      if (Math.random() > 0.3 && x > 200) {
        x += 100 + Math.random() * 150;
      } else {
        floorSegments.current.push({ x, w });
        x += w;
      }
    }

    for (let i = 0; i < 8 + level * 2; i++) {
      platforms.current.push({
        x: 400 + i * 350,
        y: groundY - 100 - Math.random() * 150,
        w: 120,
        h: 20
      });
    }

    for (let i = 0; i < 20 + level * 5; i++) {
      coins.current.push({
        x: 200 + i * 140,
        y: groundY - 100 - Math.random() * 200,
        w: 30,
        h: 30,
        collected: false,
        animFrame: 0
      });
    }

    for (let i = 0; i < 4 + level; i++) {
      enemies.current.push({
        x: 600 + i * 500,
        y: groundY - 50,
        w: 40,
        h: 40,
        vx: 80 + level * 20,
        alive: true,
        animFrame: 0
      });
    }

    wormhole.current = { x: levelWidth.current - 200, y: groundY - 120, w: 80, h: 100, animFrame: 0 };
    player.current.x = 100; player.current.y = groundY - 100; player.current.vx = 0; player.current.vy = 0;
    camera.current.x = 0;
  }, []);

  const startGame = useCallback(() => {
    initAudio();
    gameState.current = { level: 1, score: 0, lives: 3, gameOver: false, levelComplete: false, transitioning: false };
    generateLevel(1);
    setGameScreen("playing");
  }, [initAudio, generateLevel]);

  // === FULLSCREEN + ORIENTATION FIX ===
  useEffect(() => {
    const updateSize = () => {
      const isLand = window.innerWidth > window.innerHeight;
      setIsLandscape(isLand);
      document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
      if (canvasRef.current) {
        const dpr = window.devicePixelRatio || 1;
        canvasRef.current.width = window.innerWidth * dpr;
        canvasRef.current.height = window.innerHeight * dpr;
        canvasRef.current.style.width = '100vw';
        canvasRef.current.style.height = '100vh';
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    window.addEventListener('orientationchange', updateSize);
    return () => {
      window.removeEventListener('resize', updateSize);
      window.removeEventListener('orientationchange', updateSize);
    };
  }, []);

  const requestJump = useCallback(() => {
    initAudio();
    if (player.current.grounded) {
      jumpRef.current = true;
      playSoundEffect("jump");
      setTimeout(() => jumpRef.current = false, 100);
    }
  }, [initAudio, playSoundEffect]);

  // === GAME LOOP ===
  useEffect(() => {
    if (gameScreen !== "playing" || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d")!;
    const grokImg = new Image(); grokImg.src = "/grok-cute.png";

    let last = performance.now();
    let raf: number;

    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.1); last = now;
      const p = player.current; const gs = gameState.current;
      const canvasW = canvas.width / (window.devicePixelRatio || 1);
      const canvasH = canvas.height / (window.devicePixelRatio || 1);
      const groundY = canvasH - 100;

      // Input
      const inputX = joyRef.current.x;
      if (Math.abs(inputX) > 0.1) p.vx = inputX * 350;
      else p.vx *= 0.85;
      if (jumpRef.current && p.grounded) { p.vy = -650; p.grounded = false; }

      // Physics
      p.vy += 1500 * dt; p.x += p.vx * dt; p.y += p.vy * dt;

      // Collision
      p.grounded = false;
      for (const seg of floorSegments.current) {
        if (p.x > seg.x && p.x < seg.x + seg.w && p.y + 35 > groundY && p.y + 35 < groundY + 30 && p.vy > 0) {
          p.y = groundY - 35; p.vy = 0; p.grounded = true;
        }
      }
      for (const plat of platforms.current) {
        if (p.x + 25 > plat.x && p.x - 25 < plat.x + plat.w && p.y + 35 > plat.y && p.y + 35 < plat.y + plat.h + 10 && p.vy > 0) {
          p.y = plat.y - 35; p.vy = 0; p.grounded = true;
        }
      }

      // Enemies
      for (const e of enemies.current) {
        if (!e.alive) continue;
        e.x += e.vx * dt;
        if (e.x < 0 || e.x > levelWidth.current) e.vx *= -1;
        if (Math.abs(p.x - e.x) < 50 && Math.abs(p.y - e.y) < 50) {
          if (p.vy > 0 && p.y < e.y) { e.alive = false; p.vy = -400; gs.score += 50; playSoundEffect("hit"); }
          else if (!p.invincible) { gs.lives--; p.invincible = true; p.invincibleTimer = 2; playSoundEffect("hit"); if (gs.lives <= 0) gs.gameOver = true; }
        }
      }

      // Coins
      for (const c of coins.current) {
        if (!c.collected && Math.abs(p.x - c.x) < 50 && Math.abs(p.y - c.y) < 50) {
          c.collected = true; gs.score += 10; playSoundEffect("coin");
        }
      }

      // Wormhole
      if (wormhole.current && Math.abs(p.x - wormhole.current.x) < 70 && Math.abs(p.y - wormhole.current.y) < 90) {
        gs.levelComplete = true; playSoundEffect("wormhole");
        setTimeout(() => {
          gs.level++; gs.levelComplete = false; generateLevel(gs.level);
        }, 800);
      }

      // Camera
      camera.current.x += (p.x - canvasW / 3 - camera.current.x) * 8 * dt;
      camera.current.x = Math.max(0, Math.min(camera.current.x, levelWidth.current - canvasW));

      // Draw
      ctx.save(); ctx.translate(-camera.current.x, 0);
      ctx.fillStyle = "#0a1a1a"; ctx.fillRect(0, 0, levelWidth.current, canvasH);

      ctx.fillStyle = "#1a4a3a";
      for (const seg of floorSegments.current) ctx.fillRect(seg.x, groundY, seg.w, 100);
      for (const plat of platforms.current) ctx.fillRect(plat.x, plat.y, plat.w, plat.h);

      ctx.fillStyle = "#FFD700";
      for (const c of coins.current) if (!c.collected) ctx.fillRect(c.x - 15, c.y - 15, 30, 30);

      ctx.fillStyle = "#FF3366";
      for (const e of enemies.current) if (e.alive) ctx.fillRect(e.x - 20, e.y - 20, 40, 40);

      if (wormhole.current) {
        ctx.fillStyle = "#8A2BE2";
        ctx.fillRect(wormhole.current.x - 40, wormhole.current.y - 50, 80, 100);
      }

      // Draw Grok
      ctx.save();
      ctx.translate(p.x, p.y);
      if (!p.facingRight) ctx.scale(-1, 1);
      if (grokImg.complete) {
        ctx.drawImage(grokImg, -35, -50, 70, 100);
      } else {
        ctx.fillStyle = "#4ECDC4";
        ctx.fillRect(-35, -50, 70, 100);
      }
      ctx.restore();

      ctx.restore();

      // HUD
      ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.fillRect(10, 10, 280, 90);
      ctx.fillStyle = "#FFF"; ctx.font = "bold 22px Arial";
      ctx.fillText(`Level: ${gs.level}`, 20, 35);
      ctx.fillText(`Score: ${gs.score}`, 20, 65);
      ctx.fillText(`Lives: Heart x${gs.lives}`, 20, 95);

      ctx.fillStyle = "#666"; ctx.font = "12px Arial";
      ctx.fillText("Created by David Gutierrez", canvasW - 180, canvasH - 20);

      if (gs.gameOver) setTimeout(() => setGameScreen("gameOver"), 1000);

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [gameScreen, generateLevel, playSoundEffect]);

  // === MENU ===
  if (gameScreen === "menu") {
    return (
      <div style={{ width: "100vw", height: "100vh", background: "#0a1a1a", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 30 }}>
        <h1 style={{ fontSize: 60, color: "#4ECDC4", fontWeight: "bold" }}>GROK RUN</h1>
        <button onClick={startGame} style={{ padding: "20px 50px", fontSize: 28, background: "#4CAF50", color: "white", border: "none", borderRadius: 15 }}>PLAY</button>
      </div>
    );
  }

  if (gameScreen === "gameOver") {
    return (
      <div style={{ width: "100vw", height: "100vh", background: "#0a1a1a", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 30 }}>
        <h1 style={{ fontSize: 60, color: "#FF3366" }}>GAME OVER</h1>
        <button onClick={startGame} style={{ padding: "20px 50px", fontSize: 28, background: "#4CAF50", color: "white", border: "none", borderRadius: 15 }}>RETRY</button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="full-viewport">
      {!isLandscape && <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.95)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: "bold", zIndex: 100 }}>Rotate Device</div>}
      <canvas ref={canvasRef} style={{ display: "block", width: "100%", height: "100%" }} />
      <Joystick onMove={(v) => { joyRef.current = v; initAudio(); }} />
      <JumpButton onJump={requestJump} />
      <div style={{ position: "absolute", bottom: 10, left: "50%", transform: "translateX(-50%)", color: "#666", fontSize: 12 }}>Created by David Gutierrez</div>
    </div>
  );
}
