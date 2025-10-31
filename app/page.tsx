// app/page.tsx
"use client"

import { useRef, useEffect, useCallback, useState } from "react"
import MobileLandscapeGuard from '@/components/MobileLandscapeGuard'
import Joystick, { JumpButton } from "@/components/Joystick"

// === ALL YOUR INTERFACES (Platform, Enemy, etc.) ===
// [Keep ALL your interface code here — copy from your old file]

interface Platform { x: number; y: number; w: number; h: number; }
interface FloorSegment { x: number; w: number; }
interface Enemy { x: number; y: number; w: number; h: number; vx: number; alive: boolean; animFrame: number; }
interface Coin { x: number; y: number; w: number; h: number; collected: boolean; animFrame: number; }
interface Wormhole { x: number; y: number; w: number; h: number; animFrame: number; }
interface GameState { level: number; score: number; lives: number; gameOver: boolean; levelComplete: boolean; transitioning: boolean; }
type GameScreen = "menu" | "howToPlay" | "playing" | "gameOver"

// === MAIN GAME COMPONENT ===
export default function Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const joyRef = useRef({ x: 0, y: 0 })
  const jumpRef = useRef(false)
  const [gameScreen, setGameScreen] = useState<GameScreen>("menu")

  // === ALL YOUR useRef, audio, generateLevel, etc. ===
  // [Copy ALL your game logic from your old page.tsx — everything except the return]

  const camera = useRef({ x: 0, y: 0 })
  const player = useRef({ x: 100, y: 200, vx: 0, vy: 0, w: 40, h: 60, grounded: false, facingRight: true, walkFrame: 0, walkTimer: 0, invincible: false, invincibleTimer: 0 })
  const gameState = useRef<GameState>({ level: 1, score: 0, lives: 3, gameOver: false, levelComplete: false, transitioning: false })
  const platforms = useRef<Platform[]>([])
  const floorSegments = useRef<FloorSegment[]>([])
  const enemies = useRef<Enemy[]>([])
  const coins = useRef<Coin[]>([])
  const wormhole = useRef<Wormhole | null>(null)
  const levelWidth = useRef(3000)
  const audioContext = useRef<AudioContext | null>(null)
  const musicGain = useRef<GainNode | null>(null)
  const sfxGain = useRef<GainNode | null>(null)

  // === ALL YOUR useCallback, useEffect, game loop ===
  // [Copy ALL your functions: initAudio, playSoundEffect, generateLevel, requestJump, startGame, etc.]

  const initAudio = useCallback(() => { /* ... */ }, [])
  const playSoundEffect = useCallback((type: "jump" | "coin" | "hit" | "wormhole") => { /* ... */ }, [])
  const generateLevel = useCallback((level: number) => { /* ... */ }, [])
  const requestJump = useCallback(() => { /* ... */ }, [initAudio, playSoundEffect])
  const startGame = useCallback(() => { /* ... */ }, [initAudio, generateLevel])
  const retryGame = useCallback(() => { startGame() }, [startGame])
  const quitToMenu = useCallback(() => { setGameScreen("menu") }, [])

  // === GAME LOOP useEffect ===
  useEffect(() => {
    // [Your full game loop]
  }, [gameScreen, generateLevel, playSoundEffect, initAudio])

  // === MENU, HOW TO PLAY, GAME OVER SCREENS ===
  if (gameScreen === "menu") {
    return <MenuScreen onStart={startGame} onHowToPlay={() => setGameScreen("howToPlay")} />
  }
  if (gameScreen === "howToPlay") {
    return <HowToPlayScreen onBack={() => setGameScreen("menu")} />
  }
  if (gameScreen === "gameOver") {
    return <GameOverScreen score={gameState.current.score} level={gameState.current.level} onRetry={retryGame} onQuit={quitToMenu} />
  }

  return (
    <MobileLandscapeGuard startButtonLabel="Play">
      <div className="full-viewport">
        <canvas ref={canvasRef} className="game-canvas" />
        <Joystick onMove={(v) => { joyRef.current = v; initAudio(); }} />
        <JumpButton onJump={requestJump} />
      </div>
    </MobileLandscapeGuard>
  )
}

// === MENU SCREEN ===
function MenuScreen({ onStart, onHowToPlay }: { onStart: () => void; onHowToPlay: () => void }) {
  return (
    <div style={{ width: "100vw", height: "100vh", background: "linear-gradient(135deg, #0a1a1a 0%, #1a3a2a 100%)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 40 }}>
      <h1 style={{ fontSize: 64, color: "#4ECDC4" }}>CYBER GROK</h1>
      <button onClick={onStart} style={{ padding: "20px 60px", fontSize: 28, background: "#4ECDC4", border: "none", borderRadius: 15 }}>START GAME</button>
      <button onClick={onHowToPlay} style={{ padding: "15px 50px", fontSize: 22, background: "rgba(78, 205, 196, 0.1)", border: "3px solid #4ECDC4", borderRadius: 15 }}>HOW TO PLAY</button>
    </div>
  )
}

// === HOW TO PLAY SCREEN ===
function HowToPlayScreen({ onBack }: { onBack: () => void }) {
  return (
    <div style={{ width: "100vw", height: "100vh", background: "linear-gradient(135deg, #0a1a1a 0%, #1a3a2a 100%)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 30 }}>
      <h1 style={{ fontSize: 48, color: "#4ECDC4" }}>HOW TO PLAY</h1>
      <button onClick={onBack} style={{ padding: "15px 50px", fontSize: 22, background: "rgba(78, 205, 196, 0.1)", border: "3px solid #4ECDC4", borderRadius: 15 }}>BACK</button>
    </div>
  )
}

// === GAME OVER SCREEN ===
function GameOverScreen({ score, level, onRetry, onQuit }: { score: number; level: number; onRetry: () => void; onQuit: () => void }) {
  return (
    <div style={{ width: "100vw", height: "100vh", background: "linear-gradient(135deg, #1a0a0a 0%, #3a1a1a 100%)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 30 }}>
      <h1 style={{ fontSize: 56, color: "#FF3366" }}>GAME OVER</h1>
      <p style={{ fontSize: 24, color: "#FFD700" }}>Score: {score}</p>
      <p style={{ fontSize: 20, color: "#4ECDC4" }}>Level: {level}</p>
      <button onClick={onRetry} style={{ padding: "18px 45px", fontSize: 24, background: "#4ECDC4", border: "none", borderRadius: 15 }}>RETRY</button>
      <button onClick={onQuit} style={{ padding: "18px 45px", fontSize: 24, background: "rgba(255, 51, 102, 0.1)", border: "3px solid #FF3366", borderRadius: 15 }}>QUIT</button>
    </div>
  )
}
