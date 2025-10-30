// app/page.tsx
"use client";

import React, { useRef, useEffect, useState } from "react";
import "./globals.css";

const GameCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const runningRef = useRef(false);

  const playerRef = useRef<any>(null);
  const platformsRef = useRef<any[]>([]);
  const keysRef = useRef({ left: false, right: false });
  const scoreRef = useRef(0);
  const livesRef = useRef(3);
  const levelRef = useRef(1);
  const lastDeathTimeRef = useRef(0);

  const [, setTick] = useState(0);
  const gameOverRef = useRef(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const bgAudioRef = useRef<HTMLAudioElement | null>(null);
  const bgGainRef = useRef<GainNode | null>(null);

  const joystickRef = useRef({
    touching: false,
    id: null as number | null,
    startX: 0,
    startY: 0,
    dx: 0,
  });

  // === RESIZE + FULLSCREEN CANVAS ===
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctxRef.current = ctx;

    const setSize = () => {
      const w = Math.max(window.innerWidth, 320);
      const h = Math.max(window.innerHeight, 480);
      const dpr = window.devicePixelRatio || 1;
      canvas.style.width = "100vw";
      canvas.style.height = "100vh";
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawFrame();
    };

    setSize();
    window.addEventListener("resize", setSize);
    return () => window.removeEventListener("resize", setSize);
  }, []);

  // === INIT GAME + AUDIO + VISIBILITY ===
  useEffect(() => {
    resetGameState();

    const onVisibility = () => {
      const ac = audioCtxRef.current;
      if (!ac) return;
      if (document.hidden) {
        ac.suspend?.();
      } else {
        ac.resume?.();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      stopLoop();
      audioCtxRef.current?.close().catch(() => {});
    };
  }, []);

  const resetGameState = () => {
    playerRef.current = {
      x: 50, y: 200, w: 36, h: 48,
      vx: 0, vy: 0, speed: 2.6, jumpPower: -9.5,
      grounded: false, frame: 0, frameTick: 0, facing: 1,
    };

    const baseY = window.innerHeight - 80;
    platformsRef.current = [
      { x: 0, y: baseY, w: 9999, h: 80 },
      { x: 80, y: baseY - 120, w: 140, h: 18 },
      { x: 260, y: baseY - 210, w: 120, h: 18 },
      { x: 420, y: baseY - 80, w: 100, h: 18 },
      { x: 560, y: baseY - 160, w: 140, h: 18 },
    ];

    scoreRef.current = 0;
    livesRef.current = 3;
    levelRef.current = 1;
    gameOverRef.current = false;
    setTick(t => t + 1);
    startLoop();
  };

  const restartGame = () => {
    resetGameState();
    resumeAudioContext();
  };

  // === GAME LOOP ===
  const startLoop = () => {
    if (runningRef.current) return;
    runningRef.current = true;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(40, now - last);
      update(dt / 16.6667);
      drawFrame();
      last = now;
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
  };

  const stopLoop = () => {
    runningRef.current = false;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  };

  const update = (dt: number) => {
    const p = playerRef.current;
    if (!p || gameOverRef.current) return;

    let move = 0;
    if (keysRef.current.left) move -= 1;
    if (keysRef.current.right) move += 1;
    if (joystickRef.current.touching) {
      const d = joystickRef.current.dx;
      move = Math.abs(d) > 10 ? (d < 0 ? -1 : 1) : 0;
    }
    p.vx = p.speed * move * 1.5;
    if (move !== 0) p.facing = move > 0 ? 1 : -1;

    p.vy += 0.55 * dt;
    p.x += p.vx * dt * 12;
    p.y += p.vy * dt * 12;

    p.grounded = false;
    for (let plat of platformsRef.current) {
      if (
        p.x + p.w > plat.x &&
        p.x < plat.x + plat.w &&
        p.y + p.h > plat.y &&
        p.y + p.h < plat.y + plat.h + 24 &&
        p.vy >= 0
      ) {
        p.y = plat.y - p.h;
        p.vy = 0;
        p.grounded = true;
      }
    }

    if (Math.abs(p.vx) > 0.5) {
      p.frameTick += Math.abs(p.vx) * dt;
      if (p.frameTick > 6) {
        p.frame = (p.frame + 1) % 4;
        p.frameTick = 0;
      }
    } else {
      p.frame = 0;
    }

    const screenW = window.innerWidth;
    if (p.x < 0) p.x = 0;
    if (p.x + p.w > screenW) p.x = screenW - p.w;

    if (p.y > window.innerHeight + 120) handleDeath();

    if (p.x > 900) {
      scoreRef.current += 100;
      levelRef.current += 1;
      platformsRef.current.push({
        x: 950 + levelRef.current * 80,
        y: window.innerHeight - 180 - (levelRef.current % 4) * 40,
        w: 120,
        h: 18,
      });
      p.x = 40;
      p.y = 200;
      setTick(t => t + 1);
    }
  };

  const drawFrame = () => {
    const ctx = ctxRef.current;
    if (!ctx || !canvasRef.current) return;
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

    ctx.fillStyle = "#87CEEB";
    ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);

    ctx.fillStyle = "#6b4f35";
    for (let plat of platformsRef.current) {
      ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
    }

    const p = playerRef.current;
    if (p) {
      ctx.save();
      ctx.translate(p.x + p.w / 2, p.y + p.h / 2);
      if (p.facing < 0) ctx.scale(-1, 1);
      ctx.fillStyle = "#ff5555";
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.fillStyle = "#222";
      ctx.fillRect(-p.w / 4 + (p.frame % 2) * 2, -p.h / 4, 6, 6);
      ctx.restore();
    }

    ctx.fillStyle = "#fff";
    ctx.font = "16px sans-serif";
    ctx.textBaseline = "top";
    ctx.fillText(`Lives: ${livesRef.current}`, 12, 12);
    ctx.fillText(`Score: ${scoreRef.current}`, 12, 36);
    ctx.fillText(`Level: ${levelRef.current}`, 12, 60);

    drawControlsOverlay(ctx);

    if (gameOverRef.current) {
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.fillRect(0, window.innerHeight / 2 - 80, window.innerWidth, 160);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 28px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Game Over", window.innerWidth / 2, window.innerHeight / 2 - 20);
      ctx.font = "16px sans-serif";
      ctx.fillText("Tap Restart to play again", window.innerWidth / 2, window.innerHeight / 2 + 10);
      ctx.textAlign = "left";
    }
  };

  const drawControlsOverlay = (ctx: CanvasRenderingContext2D) => {
    const radius = 48;
    const x = 80;
    const y = window.innerHeight - 120;
    ctx.beginPath();
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();

    if (joystickRef.current.touching) {
      ctx.beginPath();
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      const knobX = x + Math.max(-radius, Math.min(radius, joystickRef.current.dx));
      ctx.arc(knobX, y, 20, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.fillStyle = "rgba(255,255,255,0.25)";
      ctx.arc(x, y, 20, 0, Math.PI * 2);
      ctx.fill();
    }

    const bx = window.innerWidth - 84;
    const by = window.innerHeight - 120;
    ctx.beginPath();
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.arc(bx, by, 48, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.font = "bold 18px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("JUMP", bx, by + 6);
    ctx.textAlign = "left";
  };

  const handleDeath = () => {
    const now = performance.now();
    if (now - lastDeathTimeRef.current < 800) return;
    lastDeathTimeRef.current = now;
    livesRef.current -= 1;
    setTick(t => t + 1);
    if (livesRef.current <= 0) {
      gameOverRef.current = true;
      stopLoop();
      audioCtxRef.current?.suspend?.();
    } else {
      const p = playerRef.current;
      p.x = 40;
      p.y = 200;
      p.vx = 0;
      p.vy = 0;
    }
  };

  // === INPUT ===
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onPointerDown = (e: PointerEvent) => {
      ensureAudioContext();
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      if (x < window.innerWidth / 2) {
        joystickRef.current.touching = true;
        joystickRef.current.id = e.pointerId;
        joystickRef.current.startX = x;
        joystickRef.current.startY = y;
        joystickRef.current.dx = 0;
      } else {
        jump();
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!joystickRef.current.touching || e.pointerId !== joystickRef.current.id) return;
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      joystickRef.current.dx = x - joystickRef.current.startX;
      if (joystickRef.current.dx < -12) {
        keysRef.current.left = true;
        keysRef.current.right = false;
      } else if (joystickRef.current.dx > 12) {
        keysRef.current.right = true;
        keysRef.current.left = false;
      } else {
        keysRef.current.left = false;
        keysRef.current.right = false;
      }
    };

    const onPointerUp = () => {
      if (joystickRef.current.touching) {
        joystickRef.current.touching = false;
        joystickRef.current.id = null;
        joystickRef.current.dx = 0;
        keysRef.current.left = false;
        keysRef.current.right = false;
      }
    };

    canvas.addEventListener("pointerdown", onPointerDown, { passive: false });
    window.addEventListener("pointermove", onPointerMove, { passive: false });
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);

    return () => {
      canvas.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
    };
  }, []);

  const jump = () => {
    const p = playerRef.current;
    if (!p || !p.grounded) return;
    p.vy = p.jumpPower;
    p.grounded = false;
    p.frame = 1;
    if (!runningRef.current && !gameOverRef.current) startLoop();
  };

  const ensureAudioContext = () => {
    if (audioCtxRef.current) {
      audioCtxRef.current.resume?.();
      return;
    }
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ac = new AudioContext();
      audioCtxRef.current = ac;

      if (bgAudioRef.current) {
        const src = ac.createMediaElementSource(bgAudioRef.current);
        const gain = ac.createGain();
        bgGainRef.current = gain;
        src.connect(gain).connect(ac.destination);
        bgAudioRef.current.loop = true;
        bgAudioRef.current.play().catch(() => {});
      }
    } catch (err) {
      console.warn("AudioContext failed:", err);
    }
  };

  const resumeAudioContext = () => {
    audioCtxRef.current?.resume?.();
    bgAudioRef.current?.play().catch(() => {});
  };

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        position: "relative",
        touchAction: "none",
        userSelect: "none",
        background: "#87CEEB",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          width: "100vw",
          height: "100vh",
          display: "block",
          objectFit: "contain",
        }}
      />

      <div style={{ position: "absolute", left: 12, top: 12, color: "#fff", fontWeight: "600" }}>
        <div>Lives: {livesRef.current}</div>
        <div style={{ marginTop: 6 }}>Score: {scoreRef.current}</div>
      </div>

      <div
        onTouchStart={(e) => { e.preventDefault(); ensureAudioContext(); jump(); }}
        onMouseDown={(e) => { e.preventDefault(); ensureAudioContext(); jump(); }}
        style={{
          position: "absolute",
          right: 28,
          bottom: 80,
          width: 96,
          height: 96,
          borderRadius: 48,
          background: "rgba(0,0,0,0.12)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff",
          fontWeight: "700",
          touchAction: "none",
        }}
      >
        JUMP
      </div>

      {gameOverRef.current && (
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: "translate(-50%,-10%)",
            display: "flex",
            flexDirection: "column",
            gap: 12,
            alignItems: "center",
          }}
        >
          <div style={{ color: "#fff", fontSize: 28, fontWeight: "800" }}>Game Over</div>
          <button
            onClick={restartGame}
            style={{
              padding: "12px 20px",
              borderRadius: 10,
              border: "none",
              background: "#ff6b6b",
              color: "#fff",
              fontWeight: "700",
            }}
          >
            Restart Game
          </button>
        </div>
      )}

      <audio
        ref={bgAudioRef}
        src="https://cdn.pixabay.com/download/audio/2022/03/15/audio_9fdc21c4ef.mp3?filename=retro-wave-11040.mp3"
        crossOrigin="anonymous"
        style={{ display: "none" }}
      />
    </div>
  );
};

export default GameCanvas;
