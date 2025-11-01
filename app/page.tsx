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
type GameScreen = "menu" | "howToPlay" | "playing" | "gameOver";

export default function Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
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

  // === AUDIO ===
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
    const createChillTranceLoop = () => {
      const bass = ctx.createOscillator(); bass.type = "sine"; bass.frequency.value = 55;
      const bassGain = ctx.createGain(); bassGain.gain.value = 0.15;
      bass.connect(bassGain); bassGain.connect(musicGain.current!); bass.start();

      const pad = ctx.createOscillator(); pad.type = "sawtooth";
      const padFilter = ctx.createBiquadFilter(); padFilter.type = "lowpass"; padFilter.frequency.value = 800;
      const padGain = ctx.createGain(); padGain.gain.value = 0.08;
      pad.connect(padFilter); padFilter.connect(padGain); padGain.connect(musicGain.current!); pad.start();

      const lead = ctx.createOscillator(); lead.type = "triangle";
      const leadFilter = ctx.createBiquadFilter(); leadFilter.type = "lowpass"; leadFilter.frequency.value = 1200;
      const leadGain = ctx.createGain(); leadGain.gain.value = 0.12;
      lead.connect(leadFilter); leadFilter.connect(leadGain); leadGain.connect(musicGain.current!); lead.start();

      const chordProgression = [[220, 262, 330], [175, 220, 262], [262, 330, 392], [196, 247, 294]];
      const melodyNotes = [440, 495, 523, 587, 659, 523, 495, 440];
      let chordIndex = 0; let melodyIndex = 0;

      const changeChord = () => {
        const chord = chordProgression[chordIndex];
        bass.frequency.setValueAtTime(chord[0] / 2, ctx.currentTime);
        pad.frequency.setValueAtTime(chord[1], ctx.currentTime);
        chordIndex = (chordIndex + 1) % chordProgression.length;
      };
      const changeMelody = () => {
        lead.frequency.setValueAtTime(melodyNotes[melodyIndex], ctx.currentTime);
        leadFilter.frequency.setValueAtTime(1200 + Math.sin(melodyIndex) * 400, ctx.currentTime);
        melodyIndex = (melodyIndex + 1) % melodyNotes.length;
      };

      changeChord(); changeMelody();
      setInterval(changeChord, 2000); setInterval(changeMelody, 500);
    };
    createChillTranceLoop();
  }, []);

  const playSoundEffect = useCallback((type: "jump" | "coin" | "hit" | "wormhole") => {
    if (!audioContext.current || !sfxGain.current) return;
    const ctx = audioContext.current; const osc = ctx.createOscillator(); const gain = ctx.createGain(); osc.connect(gain); gain.connect(sfxGain.current);
    switch (type) {
      case "jump": osc.frequency.value = 400; osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.1); gain.gain.setValueAtTime(0.3, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1); osc.start(); osc.stop(ctx.currentTime + 0.1); break;
      case "coin": osc.frequency.value = 800; osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.05); gain.gain.setValueAtTime(0.4, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1); osc.start(); osc.stop(ctx.currentTime + 0.1); break;
      case "hit": osc.type = "sawtooth"; osc.frequency.value = 200; osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.2); gain.gain.setValueAtTime(0.5, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2); osc.start(); osc.stop(ctx.currentTime + 0.2); break;
      case "wormhole": osc.type = "sine"; osc.frequency.value = 400; osc.frequency.exponentialRampToValueAtTime(1000, ctx.currentTime + 0.3); gain.gain.setValueAtTime(0.4, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3); osc.start(); osc.stop(ctx.currentTime + 0.3); break;
    }
  }, []);

  // === LEVEL GENERATION ===
  const generateLevel = useCallback((level: number) => {
    const canvasHeight = window.innerHeight || 600;
    const groundY = canvasHeight - 100;
    levelWidth.current = 3000 + level * 1000;
    platforms.current = []; floorSegments.current = []; enemies.current = []; coins.current = [];

    let currentX = 0;
    while (currentX < levelWidth.current) {
      const segmentWidth = 200 + Math.random() * 300;
      const hasGap = Math.random() > 0.3 && currentX > 100;
      if (!hasGap || currentX < 100) floorSegments.current.push({ x: currentX, w: segmentWidth });
      else {
        const gapWidth = 80 + Math.random() * 120 + level * 10;
        currentX += gapWidth;
        if (Math.random() > 0.5) platforms.current.push({ x: currentX - gapWidth / 2 - 50, y: groundY - 80 - Math.random() * 60, w: 100, h: 20 });
      }
      currentX += segmentWidth;
    }

    let platformX = 300;
    while (platformX < levelWidth.current - 500) {
      const formationType = Math.random();
      if (formationType < 0.3) { for (let i = 0; i < 4; i++) platforms.current.push({ x: platformX + i * 80, y: groundY - 60 - i * 50, w: 80, h: 20 }); platformX += 400; }
      else if (formationType < 0.6) { const height = groundY - 150 - Math.random() * 100; for (let i = 0; i < 3; i++) platforms.current.push({ x: platformX + i * 120, y: height, w: 80, h: 20 }); platformX += 450; }
      else { platforms.current.push({ x: platformX, y: groundY - 180 - Math.random() * 80, w: 120, h: 20 }); platformX += 250; }
    }

    const coinCount = 15 + level * 5;
    for (let i = 0; i < coinCount / 2; i++) { const plat = platforms.current[Math.floor(Math.random() * platforms.current.length)]; if (plat) coins.current.push({ x: plat.x + plat.w / 2, y: plat.y - 40, w: 25, h: 25, collected: false, animFrame: 0 }); }
    for (let i = 0; i < coinCount / 2; i++) coins.current.push({ x: 200 + Math.random() * (levelWidth.current - 400), y: groundY - 100 - Math.random() * 150, w: 25, h: 25, collected: false, animFrame: 0 });

    const enemyCount = 3 + level * 2;
    for (let i = 0; i < enemyCount; i++) {
      if (Math.random() > 0.5 && platforms.current.length > 0) {
        const plat = platforms.current[Math.floor(Math.random() * platforms.current.length)];
        enemies.current.push({ x: plat.x + plat.w / 2, y: plat.y - 40, w: 35, h: 35, vx: 60 + level * 15, alive: true, animFrame: 0 });
      } else {
        const seg = floorSegments.current[Math.floor(Math.random() * floorSegments.current.length)];
        if (seg) enemies.current.push({ x: seg.x + Math.random() * seg.w, y: groundY - 40, w: 35, h: 35, vx: 60 + level * 15, alive: true, animFrame: 0 });
      }
    }

    wormhole.current = { x: levelWidth.current - 200, y: groundY - 100, w: 60, h: 80, animFrame: 0 };
    player.current.x = 100; player.current.y = groundY - 100; player.current.vx = 0; player.current.vy = 0; player.current.grounded = false; camera.current.x = 0;
  }, []);

  // === ORIENTATION + RESIZE ===
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
    const handleResize = () => {
      setVh();
      const canvas = canvasRef.current;
      if (canvas) {
        const dpr = window.devicePixelRatio || 1;
        canvas.width = window.innerWidth * dpr;
        canvas.height = window.innerHeight * dpr;
        canvas.style.width = '100vw';
        canvas.style.height = '100vh';
      }
    };
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    return () => { window.removeEventListener('resize', handleResize); window.removeEventListener('orientationchange', handleResize); };
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined" && "screen" in window && "orientation" in (window.screen as any)) {
      const screenOrientation = (window.screen as any).orientation;
      if (screenOrientation && "lock" in screenOrientation) screenOrientation.lock("landscape").catch(() => {});
    }
  }, []);

  const requestJump = useCallback(() => {
    initAudio();
    if (player.current.grounded && !gameState.current.gameOver) {
      jumpRef.current = true;
      playSoundEffect("jump");
      setTimeout(() => { jumpRef.current = false; }, 100);
    }
  }, [initAudio, playSoundEffect]);

  const startGame = useCallback(() => {
    initAudio();
    gameState.current = { level: 1, score: 0, lives: 3, gameOver: false, levelComplete: false, transitioning: false };
    generateLevel(1); // ← NOW CALLED HERE
    setGameScreen("playing");
  }, [initAudio, generateLevel]);

  const retryGame = useCallback(() => startGame(), [startGame]);
  const quitToMenu = useCallback(() => setGameScreen("menu"), []);

  // === GAME LOOP ===
  useEffect(() => {
    if (typeof window === "undefined" || gameScreen !== "playing" || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d")!;
    const grokImg = new Image(); grokImg.crossOrigin = "anonymous"; grokImg.src = "/grok-cute.png";

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

    const gravity = 1200; const maxSpeed = 300; const acceleration = 20;
    let last = performance.now(); let raf: number; let animTimer = 0;

    const drawCharacter = (ctx: CanvasRenderingContext2D, p: typeof player.current, animTimer: number, grokImg: HTMLImageElement) => {
      const drawX = p.x; const drawY = p.y;
      ctx.save(); ctx.translate(drawX, drawY);
      if (!p.facingRight) ctx.scale(-1, 1);
      if (p.invincible && Math.floor(animTimer * 10) % 2 === 0) ctx.globalAlpha = 0.5;
      const isMoving = Math.abs(p.vx) > 10;
      const walkCycle = Math.sin(p.walkFrame * Math.PI);
      const bounceOffset = p.grounded && isMoving ? Math.abs(Math.sin(p.walkFrame * Math.PI)) * 3 : 0;

      // [YOUR FULL LIMB DRAWING CODE — UNCHANGED]
      if (grokImg.complete && grokImg.naturalWidth) {
        ctx.drawImage(grokImg, -p.w / 2, -p.h / 2 + bounceOffset, p.w, p.h);
      } else {
        ctx.fillStyle = "#4ECDC4"; ctx.strokeStyle = "#2A9D8F"; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(0, bounceOffset - 12, p.w / 2 - 5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillRect(-p.w / 2 + 8, bounceOffset + 3, p.w - 16, p.h / 2 - 8); ctx.strokeRect(-p.w / 2 + 8, bounceOffset + 3, p.w - 16, p.h / 2 - 8);
      }
      ctx.restore();
    };

    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 1 / 30); last = now; animTimer += dt;
      const p = player.current; const gs = gameState.current;
      const canvasW = canvas.width / (window.devicePixelRatio || 1);
      const canvasH = canvas.height / (window.devicePixelRatio || 1);
      const groundY = canvasH - 100;

      if (!gs.gameOver && !gs.transitioning) {
        const inputX = joyRef.current.x;
        if (Math.abs(inputX) > 0.1) { const targetVx = inputX * maxSpeed; p.vx += (targetVx - p.vx) * acceleration * dt; p.facingRight = inputX > 0; p.walkTimer += dt; if (p.walkTimer > 0.12) { p.walkFrame = (p.walkFrame + 1) % 8; p.walkTimer = 0; } }
        else { p.vx *= Math.pow(0.01, dt); if (Math.abs(p.vx) < 1) p.vx = 0; p.walkFrame = 0; }
        if (jumpRef.current && p.grounded) { p.vy = -550; p.grounded = false; jumpRef.current = false; }
        p.vy += gravity * dt; p.x += p.vx * dt; p.y += p.vy * dt;

        p.grounded = false;
        for (const segment of floorSegments.current) {
          if (p.x > segment.x && p.x < segment.x + segment.w && p.y + p.h / 2 > groundY && p.y + p.h / 2 < groundY + 30 && p.vy > 0) {
            p.y = groundY - p.h / 2; p.vy = 0; p.grounded = true; break;
          }
        }
        for (const plat of platforms.current) {
          if (p.x + p.w / 2 > plat.x && p.x - p.w / 2 < plat.x + plat.w && p.y + p.h / 2 > plat.y && p.y + p.h / 2 < plat.y + plat.h + 10 && p.vy > 0) {
            p.y = plat.y - p.h / 2; p.vy = 0; p.grounded = true;
          }
        }

        for (const enemy of enemies.current) {
          if (!enemy.alive) continue;
          enemy.x += enemy.vx * dt;
          enemy.animFrame = (enemy.animFrame + dt * 10) % 4;
          if (enemy.x < 0 || enemy.x > levelWidth.current) enemy.vx *= -1;
          if (!p.invincible && Math.abs(p.x - enemy.x) < (p.w + enemy.w) / 2 && Math.abs(p.y - enemy.y) < (p.h + enemy.h) / 2) {
            if (p.vy > 0 && p.y < enemy.y) { enemy.alive = false; p.vy = -300; gs.score += 50; playSoundEffect("hit"); }
            else { gs.lives -= 1; p.invincible = true; p.invincibleTimer = 2; playSoundEffect("hit"); if (gs.lives <= 0) gs.gameOver = true; }
          }
        }
        if (p.invincible) { p.invincibleTimer -= dt; if (p.invincibleTimer <= 0) p.invincible = false; }

        for (const coin of coins.current) {
          if (coin.collected) continue;
          coin.animFrame = (coin.animFrame + dt * 8) % 4;
          if (Math.abs(p.x - coin.x) < (p.w + coin.w) / 2 && Math.abs(p.y - coin.y) < (p.h + coin.h) / 2) {
            coin.collected = true; gs.score += 10; playSoundEffect("coin");
          }
        }

        if (wormhole.current) {
          wormhole.current.animFrame = (wormhole.current.animFrame + dt * 5) % 8;
          if (Math.abs(p.x - wormhole.current.x) < (p.w + wormhole.current.w) / 2 && Math.abs(p.y - wormhole.current.y) < (p.h + wormhole.current.h) / 2) {
            gs.levelComplete = true; gs.transitioning = true; playSoundEffect("wormhole");
            setTimeout(() => { gs.level += 1; gs.levelComplete = false; gs.transitioning = false; generateLevel(gs.level); }, 1500);
          }
        }

        if (p.y > canvasH + 100) {
          gs.lives -= 1;
          if (gs.lives <= 0) gs.gameOver = true;
          else { p.x = 100; p.y = groundY - 100; p.vx = 0; p.vy = 0; camera.current.x = 0; }
        }

        const targetCameraX = p.x - canvasW / 3;
        camera.current.x += (targetCameraX - camera.current.x) * 5 * dt;
        camera.current.x = Math.max(0, Math.min(camera.current.x, levelWidth.current - canvasW));
      }

      ctx.save(); ctx.translate(-camera.current.x, 0);
      ctx.fillStyle = "#0a1a1a"; ctx.fillRect(camera.current.x, 0, canvasW, canvasH);

      // Circuit background
      ctx.strokeStyle = "#1a3a2a"; ctx.lineWidth = 2;
      for (let i = 0; i < levelWidth.current / 50; i++) {
        ctx.beginPath(); ctx.moveTo(i * 50, 0); ctx.lineTo(i * 50 + Math.sin(animTimer + i) * 20, canvasH); ctx.stroke();
      }
      for (let i = 0; i < 15; i++) {
        ctx.beginPath(); ctx.moveTo(camera.current.x, i * 50); ctx.lineTo(camera.current.x + canvasW, i * 50 + Math.cos(animTimer + i) * 20); ctx.stroke();
      }

      // Floor
      ctx.fillStyle = "#1a4a3a"; ctx.strokeStyle = "#2a6a4a"; ctx.lineWidth = 3;
      for (const segment of floorSegments.current) {
        ctx.fillRect(segment.x, groundY, segment.w, 30); ctx.strokeRect(segment.x, groundY, segment.w, 30);
        ctx.fillStyle = "#2a5a3a"; for (let i = 0; i < segment.w / 25; i++) ctx.fillRect(segment.x + i * 25 + 8, groundY + 8, 12, 12); ctx.fillStyle = "#1a4a3a";
      }

      // Platforms
      for (const plat of platforms.current) {
        ctx.fillStyle = "#1a4a3a"; ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
        ctx.strokeStyle = "#2a6a4a"; ctx.lineWidth = 2; ctx.strokeRect(plat.x, plat.y, plat.w, plat.h);
        ctx.fillStyle = "#2a5a3a"; for (let i = 0; i < plat.w / 20; i++) ctx.fillRect(plat.x + i * 20 + 5, plat.y + 5, 10, 10);
      }

      // Coins
      for (const coin of coins.current) {
        if (coin.collected) continue;
        const pulse = Math.sin(coin.animFrame * Math.PI * 2) * 0.2 + 1;
        ctx.save(); ctx.translate(coin.x, coin.y); ctx.scale(pulse, pulse);
        ctx.fillStyle = "#FFD700"; ctx.fillRect(-coin.w / 2, -coin.h / 2, coin.w, coin.h);
        ctx.fillStyle = "#C0C0C0"; for (let i = 0; i < 4; i++) { ctx.fillRect(-coin.w / 2 - 3, -coin.h / 2 + i * 6, 3, 4); ctx.fillRect(coin.w / 2, -coin.h / 2 + i * 6, 3, 4); }
        ctx.restore();
      }

      // Enemies
      for (const enemy of enemies.current) {
        if (!enemy.alive) continue;
        ctx.save(); ctx.translate(enemy.x, enemy.y);
        const spikes = 8; const spikeLength = 8 + Math.sin(enemy.animFrame * Math.PI) * 3;
        ctx.fillStyle = "#FF3366"; ctx.beginPath();
        for (let i = 0; i < spikes; i++) {
          const angle = (i / spikes) * Math.PI * 2;
          const innerRadius = enemy.w / 2; const outerRadius = innerRadius + spikeLength;
          const x1 = Math.cos(angle) * innerRadius; const y1 = Math.sin(angle) * innerRadius;
          const x2 = Math.cos(angle + Math.PI / spikes) * outerRadius; const y2 = Math.sin(angle + Math.PI / spikes) * outerRadius;
          const x3 = Math.cos(angle + (Math.PI * 2) / spikes) * innerRadius; const y3 = Math.sin(angle + (Math.PI * 2) / spikes) * innerRadius;
          if (i === 0) ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.lineTo(x3, y3);
        }
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = "#000"; ctx.beginPath(); ctx.arc(-8, -5, 4, 0, Math.PI * 2); ctx.arc(8, -5, 4, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }

      // Wormhole
      if (wormhole.current) {
        const wh = wormhole.current;
        ctx.save(); ctx.translate(wh.x, wh.y);
        for (let i = 5; i > 0; i--) {
          const radius = (wh.w / 2) * (i / 5);
          const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
          gradient.addColorStop(0, `rgba(138, 43, 226, ${0.8 - i * 0.1})`);
          gradient.addColorStop(1, `rgba(75, 0, 130, ${0.4 - i * 0.05})`);
          ctx.fillStyle = gradient; ctx.beginPath(); ctx.arc(0, 0, radius, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
      }

      drawCharacter(ctx, p, animTimer, grokImg);
      ctx.restore();

      // HUD
      ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(10, 10, 280, 100);
      ctx.fillStyle = "#FFF"; ctx.font = "bold 20px monospace";
      ctx.fillText(`Level: ${gs.level}`, 20, 35); ctx.fillText(`Score: ${gs.score}`, 20, 60); ctx.fillText(`Lives: ${"Heart".repeat(gs.lives)}`, 20, 85);

      // Created by
      ctx.fillStyle = "#666"; ctx.font = "12px monospace";
      ctx.fillText("Created by David Gutierrez", canvasW - 180, canvasH - 20);

      if (gs.gameOver) { setTimeout(() => setGameScreen("gameOver"), 2000); }
      if (gs.levelComplete) { /* overlay */ }

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, [gameScreen, generateLevel, playSoundEffect, initAudio]);

  // === SCREENS ===
  if (gameScreen === "menu") return <MenuScreen onStart={startGame} onHowToPlay={() => setGameScreen("howToPlay")} />;
  if (gameScreen === "howToPlay") return <HowToPlayScreen onBack={() => setGameScreen("menu")} />;
  if (gameScreen === "gameOver") return <GameOverScreen score={gameState.current.score} level={gameState.current.level} onRetry={retryGame} onQuit={quitToMenu} />;

  return (
    <div style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "calc(var(--vh) * 100)", overflow: "hidden", background: "#0b1114", touchAction: "none", userSelect: "none" }}>
      {!isLandscape && <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.95)", color: "white", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: "bold", padding: 30, textAlign: "center", gap: 20, zIndex: 30 }}>Please rotate your device</div>}
      <canvas ref={canvasRef} style={{ display: "block", width: "100vw", height: "calc(var(--vh) * 100)", position: "fixed", top: 0, left: 0 }} />
      <Joystick onMove={(v) => { joyRef.current = v; initAudio(); }} />
      <JumpButton onJump={requestJump} />
    </div>
  );
}

// [PASTE YOUR FULL MenuScreen, HowToPlayScreen, GameOverScreen HERE — EXACTLY AS IS]
