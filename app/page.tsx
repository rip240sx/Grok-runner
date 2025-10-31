// app/page.tsx
"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import MobileLandscapeGuard from "@/components/MobileLandscapeGuard";
import Joystick, { JumpButton } from "@/components/Joystick";
import grokImage from "/grok-cute.png";

export default function Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const joyRef = useRef({ x: 0, y: 0 });
  const jumpRef = useRef(false);
  const [gameScreen, setGameScreen] = useState<"menu" | "playing">("menu");

  const camera = useRef({ x: 0, y: 0 });
  const player = useRef({ x: 100, y: 200, vx: 0, vy: 0, w: 40, h: 60, grounded: false, facingRight: true, walkFrame: 0, walkTimer: 0 });
  const platforms = useRef<{ x: number; y: number; w: number; h: number }[]>([]);
  const enemies = useRef<{ x: number; y: number; w: number; h: number; vx: number; alive: boolean }[]>([]);
  const coins = useRef<{ x: number; y: number; w: number; h: number; collected: boolean }[]>([]);
  const wormhole = useRef<{ x: number; y: number; w: number; h: number } | null>(null);
  const score = useRef(0);
  const level = useRef(1);
  const levelWidth = useRef(3000);
  const audioContext = useRef<AudioContext | null>(null);
  const grokImg = useRef<HTMLImageElement | null>(null);

  // === LOAD GROK IMAGE ===
  useEffect(() => {
    const img = new Image();
    img.src = grokImage;
    img.onload = () => { grokImg.current = img; };
  }, []);

  // === AUDIO ===
  const initAudio = useCallback(() => {
    if (!audioContext.current) {
      audioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }, []);

  const playSound = useCallback((type: "jump" | "coin" | "hit") => {
    if (!audioContext.current) return;
    const osc = audioContext.current.createOscillator();
    const gain = audioContext.current.createGain();
    osc.connect(gain);
    gain.connect(audioContext.current!.destination);

    if (type === "jump") { osc.frequency.value = 300; osc.frequency.exponentialRampToValueAtTime(600, audioContext.current.currentTime + 0.1); }
    if (type === "coin") { osc.frequency.value = 800; osc.frequency.exponentialRampToValueAtTime(1200, audioContext.current.currentTime + 0.1); }
    if (type === "hit") { osc.frequency.value = 200; osc.frequency.exponentialRampToValueAtTime(100, audioContext.current.currentTime + 0.2); }

    gain.gain.setValueAtTime(0.3, audioContext.current.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioContext.current.currentTime + 0.3);
    osc.start();
    osc.stop(audioContext.current.currentTime + 0.3);
  }, []);

  // === LEVEL GENERATION ===
  const generateLevel = useCallback(() => {
    platforms.current = [];
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
      const y = baseY - 50 + Math.random() * 100;
      platforms.current.push({ x, y, w, h: 20 });
      if (Math.random() < 0.4) enemies.current.push({ x: x + 50, y: y - 50, w: 40, h: 40, vx: 2, alive: true });
      for (let i = 0; i < 3; i++) if (Math.random() < 0.6) coins.current.push({ x: x + 50 + i * 60, y: y - 80, w: 30, h: 30, collected: false });
      x += w;
    }
    wormhole.current = { x: levelWidth.current - 200, y: baseY - 100, w: 80, h: 80 };
  }, []);

  const startGame = useCallback(() => {
    score.current = 0;
    level.current = 1;
    player.current = { x: 100, y: 200, vx: 0, vy: 0, w: 40, h: 60, grounded: false, facingRight: true, walkFrame: 0, walkTimer: 0 };
    camera.current = { x: 0, y: 0 };
    generateLevel();
    setGameScreen("playing");
    initAudio();
  }, [generateLevel, initAudio]);

  // === GAME LOOP ===
  useEffect(() => {
    if (typeof window === "undefined" || gameScreen !== "playing" || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d")!;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener("resize", resize);

    let lastTime = 0;
    const loop = (time: number) => {
      const delta = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;

      // Input
      player.current.vx = joyRef.current.x * 300;
      if (jumpRef.current && player.current.grounded) {
        player.current.vy = -600;
        player.current.grounded = false;
        playSound("jump");
      }
      jumpRef.current = false;

      // Physics
      player.current.vy += 1800 * delta;
      player.current.x += player.current.vx * delta;
      player.current.y += player.current.vy * delta;

      // Platform collision
      for (const p of platforms.current) {
        if (player.current.y + player.current.h > p.y && player.current.y + player.current.h < p.y + p.h + 20 &&
            player.current.x + player.current.w > p.x && player.current.x < p.x + p.w) {
          player.current.y = p.y - player.current.h;
          player.current.vy = 0;
          player.current.grounded = true;
        }
      }

      // Camera
      camera.current.x = player.current.x - canvas.width / 2;

      // === DRAW ===
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      ctx.translate(-camera.current.x + canvas.width / 2, 0);

      // Background
      ctx.fillStyle = "#111";
      ctx.fillRect(0, 0, levelWidth.current, canvas.height);

      // Platforms
      ctx.fillStyle = "#333";
      platforms.current.forEach(p => ctx.fillRect(p.x, p.y, p.w, p.h));

      // Coins
      ctx.fillStyle = "#FFD700";
      coins.current.forEach(c => {
        if (!c.collected && Math.abs(c.x - player.current.x) < 50 && Math.abs(c.y - player.current.y) < 50) {
          c.collected = true;
          score.current += 10;
          playSound("coin");
        }
        if (!c.collected) ctx.fillRect(c.x, c.y, c.w, c.h);
      });

      // Enemies
      ctx.fillStyle = "#FF3366";
      enemies.current.forEach(e => {
        if (e.alive) {
          e.x += e.vx * delta * 60;
          if (e.x < 0 || e.x > levelWidth.current) e.vx *= -1;
          ctx.fillRect(e.x, e.y, e.w, e.h);
          if (Math.abs(e.x - player.current.x) < 40 && Math.abs(e.y - player.current.y) < 60) {
            playSound("hit");
            startGame(); // Reset
          }
        }
      });

      // Wormhole
      if (wormhole.current) {
        ctx.fillStyle = "#00FF00";
        ctx.beginPath();
        ctx.arc(wormhole.current.x + 40, wormhole.current.y + 40, 35, 0, Math.PI * 2);
        ctx.fill();
        if (Math.abs(wormhole.current.x - player.current.x) < 60) {
          level.current++;
          generateLevel();
        }
      }

      // GROK
      if (grokImg.current) {
        ctx.save();
        if (!player.current.facingRight) {
          ctx.translate(player.current.x + player.current.w, player.current.y);
          ctx.scale(-1, 1);
          ctx.drawImage(grokImg.current, 0, 0, player.current.w, player.current.h);
        } else {
          ctx.drawImage(grokImg.current, player.current.x, player.current.y, player.current.w, player.current.h);
        }
        ctx.restore();
      } else {
        ctx.fillStyle = "#4ECDC4";
        ctx.fillRect(player.current.x, player.current.y, player.current.w, player.current.h);
      }

      ctx.restore();

      // HUD
      ctx.fillStyle = "#fff";
      ctx.font = "24px monospace";
      ctx.fillText(`Score: ${score.current}  Level: ${level.current}`, 20, 40);
      ctx.fillText("Created by David Gutierrez", 20, canvas.height - 20);

      requestAnimationFrame(loop);
    };

    requestAnimationFrame(loop);
    return () => window.removeEventListener("resize", resize);
  }, [gameScreen, generateLevel, playSound, initAudio]);

  if (gameScreen === "menu") {
    return (
      <div style={{ width: "100vw", height: "100vh", background: "linear-gradient(135deg, #0a1a1a 0%, #1a3a2a 100%)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 40 }}>
        <h1 style={{ fontSize: 64, color: "#4ECDC4", textShadow: "0 0 10px #4ECDC4" }}>CYBER GROK</h1>
        <button onClick={startGame} style={{ padding: "20px 60px", fontSize: 28, background: "#4ECDC4", color: "#000", border: "none", borderRadius: 15 }}>START GAME</button>
      </div>
    );
  }

  return (
    <MobileLandscapeGuard startButtonLabel="Play">
      <div style={{ position: "relative", width: "100vw", height: "100vh", overflow: "hidden" }}>
        <canvas ref={canvasRef} style={{ display: "block", width: "100%", height: "100%", background: "#000" }} />
        <Joystick onMove={(v) => { joyRef.current = v; }} />
        <JumpButton onJump={() => { jumpRef.current = true; }} />
      </div>
    </MobileLandscapeGuard>
  );
}
