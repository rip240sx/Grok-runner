"use client"

import type React from "react"
import { useRef, useEffect, useCallback } from "react"

interface JoystickProps {
  onMove: (vector: { x: number; y: number }) => void
}

export default function Joystick({ onMove }: JoystickProps) {
  const baseRef = useRef<HTMLDivElement>(null)
  const stickRef = useRef<HTMLDivElement>(null)
  const activeTouch = useRef<number | null>(null)
  const centerX = useRef(0)
  const centerY = useRef(0)

  const updateStick = useCallback(
    (clientX: number, clientY: number) => {
      if (!baseRef.current || !stickRef.current) return

      const dx = clientX - centerX.current
      const dy = clientY - centerY.current
      const distance = Math.sqrt(dx * dx + dy * dy)
      const maxDistance = 50

      let finalX = dx
      let finalY = dy

      if (distance > maxDistance) {
        finalX = (dx / distance) * maxDistance
        finalY = (dy / distance) * maxDistance
      }

      stickRef.current.style.transform = `translate(${finalX}px, ${finalY}px)`

      // Normalize to -1 to 1 range
      const normalizedX = finalX / maxDistance
      const normalizedY = finalY / maxDistance

      onMove({ x: normalizedX, y: normalizedY })
    },
    [onMove],
  )

  const resetStick = useCallback(() => {
    if (!stickRef.current) return
    stickRef.current.style.transform = "translate(-50%, -50%)"
    stickRef.current.style.transition = "transform 0.2s ease-out"
    setTimeout(() => {
      if (stickRef.current) {
        stickRef.current.style.transition = "none"
      }
    }, 200)
    onMove({ x: 0, y: 0 })
  }, [onMove])

  useEffect(() => {
    const base = baseRef.current
    if (!base) return

    const updateCenter = () => {
      const rect = base.getBoundingClientRect()
      centerX.current = rect.left + rect.width / 2
      centerY.current = rect.top + rect.height / 2
    }

    updateCenter()
    window.addEventListener("resize", updateCenter)

    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault()
      if (activeTouch.current !== null) return

      const touch = e.touches[0]
      activeTouch.current = touch.identifier
      updateCenter()
      updateStick(touch.clientX, touch.clientY)
    }

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault()
      if (activeTouch.current === null) return

      const touch = Array.from(e.touches).find((t) => t.identifier === activeTouch.current)
      if (touch) {
        updateStick(touch.clientX, touch.clientY)
      }
    }

    const handleTouchEnd = (e: TouchEvent) => {
      e.preventDefault()
      const ended = Array.from(e.changedTouches).find((t) => t.identifier === activeTouch.current)
      if (ended) {
        activeTouch.current = null
        resetStick()
      }
    }

    base.addEventListener("touchstart", handleTouchStart, { passive: false })
    base.addEventListener("touchmove", handleTouchMove, { passive: false })
    base.addEventListener("touchend", handleTouchEnd, { passive: false })
    base.addEventListener("touchcancel", handleTouchEnd, { passive: false })

    return () => {
      window.removeEventListener("resize", updateCenter)
      base.removeEventListener("touchstart", handleTouchStart)
      base.removeEventListener("touchmove", handleTouchMove)
      base.removeEventListener("touchend", handleTouchEnd)
      base.removeEventListener("touchcancel", handleTouchEnd)
    }
  }, [updateStick, resetStick])

  return (
    <div
      ref={baseRef}
      style={{
        position: "absolute",
        left: "80px",
        bottom: "80px",
        width: "120px",
        height: "120px",
        borderRadius: "50%",
        background: "rgba(255, 255, 255, 0.1)",
        border: "3px solid rgba(255, 255, 255, 0.3)",
        zIndex: 20,
        touchAction: "none",
      }}
    >
      <div
        ref={stickRef}
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: "50px",
          height: "50px",
          borderRadius: "50%",
          background: "rgba(255, 255, 255, 0.6)",
          border: "2px solid rgba(255, 255, 255, 0.8)",
          transform: "translate(-50%, -50%)",
          transition: "none",
          pointerEvents: "none",
        }}
      />
    </div>
  )
}

export function JumpButton({ onJump }: { onJump: () => void }) {
  const handleTouch = (e: React.TouchEvent) => {
    e.preventDefault()
    onJump()
  }

  return (
    <button
      onTouchStart={handleTouch}
      style={{
        position: "absolute",
        right: "80px",
        bottom: "80px",
        width: "100px",
        height: "100px",
        borderRadius: "50%",
        background: "rgba(106, 176, 74, 0.8)",
        border: "3px solid rgba(255, 255, 255, 0.5)",
        color: "white",
        fontSize: "18px",
        fontWeight: "bold",
        zIndex: 20,
        touchAction: "none",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      JUMP
    </button>
  )
}
