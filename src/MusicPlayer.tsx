// src/MusicPlayer.tsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  togglePlayPause,
  seekTo,
  isPlaying,
  getCurrentTime,
  getDuration,
} from "./audioReactive";

function formatTime(seconds: number): string {
  if (!seconds || !isFinite(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export default function MusicPlayer() {
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const progressRef = useRef<HTMLDivElement>(null);

  // Update state from audio
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isDragging) {
        setPlaying(isPlaying());
        setCurrentTime(getCurrentTime());
        setDuration(getDuration());
      }
    }, 100);

    return () => clearInterval(interval);
  }, [isDragging]);

  const handlePlayPause = () => {
    togglePlayPause();
    setPlaying(!playing);
  };

  const calculateTimeFromPosition = useCallback(
    (clientY: number): number => {
      if (!progressRef.current || !duration) return 0;
      const rect = progressRef.current.getBoundingClientRect();
      // Inverted: top = end, bottom = start
      const relativeY = rect.bottom - clientY;
      const percentage = Math.max(0, Math.min(1, relativeY / rect.height));
      return percentage * duration;
    },
    [duration]
  );

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const newTime = calculateTimeFromPosition(e.clientY);
    seekTo(newTime);
    setCurrentTime(newTime);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsDragging(true);
    const newTime = calculateTimeFromPosition(e.clientY);
    setCurrentTime(newTime);
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (isDragging) {
        const newTime = calculateTimeFromPosition(e.clientY);
        setCurrentTime(newTime);
      }
    },
    [isDragging, calculateTimeFromPosition]
  );

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      seekTo(currentTime);
      setIsDragging(false);
    }
  }, [isDragging, currentTime]);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const progress = duration ? (currentTime / duration) * 100 : 0;

  return (
    <div className="cyber-player">
      {/* Decorative corner accents */}
      <div className="cyber-player-corner cyber-player-corner-tl" />
      <div className="cyber-player-corner cyber-player-corner-tr" />
      <div className="cyber-player-corner cyber-player-corner-bl" />
      <div className="cyber-player-corner cyber-player-corner-br" />

      {/* Header */}
      <div className="cyber-player-header">
        <span className="cyber-player-label">AUDIO</span>
        <div className="cyber-player-indicator">
          <span className={`cyber-player-dot ${playing ? "active" : ""}`} />
        </div>
      </div>

      {/* Progress bar container */}
      <div
        className="cyber-player-progress-container"
        ref={progressRef}
        onClick={handleProgressClick}
        onMouseDown={handleMouseDown}
      >
        {/* Track background */}
        <div className="cyber-player-track">
          {/* Tick marks */}
          {[...Array(10)].map((_, i) => (
            <div
              key={i}
              className="cyber-player-tick"
              style={{ bottom: `${i * 10}%` }}
            />
          ))}

          {/* Progress fill */}
          <div
            className="cyber-player-fill"
            style={{ height: `${progress}%` }}
          />

          {/* Seek handle */}
          <div
            className="cyber-player-handle"
            style={{ bottom: `calc(${progress}% - 6px)` }}
          />
        </div>

        {/* Glow effect */}
        <div
          className="cyber-player-glow"
          style={{ height: `${progress}%` }}
        />
      </div>

      {/* Time display */}
      <div className="cyber-player-time">
        <span className="cyber-player-current">{formatTime(currentTime)}</span>
        <span className="cyber-player-separator">/</span>
        <span className="cyber-player-duration">{formatTime(duration)}</span>
      </div>

      {/* Play/Pause button */}
      <button className="cyber-player-btn" onClick={handlePlayPause}>
        {playing ? (
          <svg viewBox="0 0 24 24" className="cyber-player-icon">
            <rect x="6" y="4" width="4" height="16" />
            <rect x="14" y="4" width="4" height="16" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="cyber-player-icon">
            <polygon points="5,3 19,12 5,21" />
          </svg>
        )}
        <span className="cyber-player-btn-glow" />
      </button>

      {/* Status text */}
      <div className="cyber-player-status">
        {playing ? "▶ PLAYING" : "❚❚ PAUSED"}
      </div>
    </div>
  );
}

