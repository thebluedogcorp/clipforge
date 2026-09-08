"use client";

import type { RefObject } from "react";

/**
 * A lightweight bridge between the <video> element and the rest of the UI
 * (timeline, controls, 3D mockup). The video element is the source of truth
 * for playback; everything else reads from / commands it.
 */
class VideoController {
  private el: HTMLVideoElement | null = null;
  private listeners = new Set<() => void>();

  bind(el: HTMLVideoElement | null) {
    this.el = el;
    this.emit();
  }

  get element() {
    return this.el;
  }

  play() {
    this.el?.play().catch(() => {});
  }
  pause() {
    this.el?.pause();
  }
  toggle() {
    if (!this.el) return;
    if (this.el.paused) this.play();
    else this.pause();
  }
  seek(t: number) {
    if (this.el) this.el.currentTime = Math.max(0, t);
  }
  get currentTime() {
    return this.el?.currentTime ?? 0;
  }
  get duration() {
    return this.el?.duration ?? 0;
  }
  get paused() {
    return this.el?.paused ?? true;
  }
  setVolume(v: number) {
    if (this.el) {
      this.el.volume = v;
      this.el.muted = v === 0;
    }
  }
  toggleMute() {
    if (this.el) this.el.muted = !this.el.muted;
  }

  subscribe(fn: () => void) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
  private emit() {
    this.listeners.forEach((fn) => fn());
  }
}

export const videoController = new VideoController();

export type VideoControllerRef = RefObject<HTMLVideoElement | null>;
