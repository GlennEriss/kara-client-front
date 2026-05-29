/**
 * Generates a short two-tone notification chime using the Web Audio API.
 *
 * Why synthesized: avoids hosting an audio asset, no CORS concerns, and works
 * offline. The chime is a quick C5 → E5 with a soft envelope (~250 ms total).
 */

const MUTE_STORAGE_KEY = "kara:notification-sound-muted";

let cachedContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (cachedContext && cachedContext.state !== "closed") return cachedContext;

  const Ctor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Ctor) return null;

  try {
    cachedContext = new Ctor();
    return cachedContext;
  } catch {
    return null;
  }
}

function playTone(
  ctx: AudioContext,
  frequency: number,
  startOffset: number,
  duration: number,
  peakGain: number
): void {
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(frequency, ctx.currentTime + startOffset);

  // Soft attack/decay envelope to avoid clicks
  const now = ctx.currentTime + startOffset;
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(peakGain, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  oscillator.connect(gain);
  gain.connect(ctx.destination);

  oscillator.start(now);
  oscillator.stop(now + duration + 0.05);
}

export function isNotificationSoundMuted(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(MUTE_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function setNotificationSoundMuted(muted: boolean): void {
  if (typeof window === "undefined") return;
  try {
    if (muted) {
      window.localStorage.setItem(MUTE_STORAGE_KEY, "1");
    } else {
      window.localStorage.removeItem(MUTE_STORAGE_KEY);
    }
  } catch {
    /* ignore quota / privacy mode */
  }
}

export function playNotificationSound(): void {
  if (isNotificationSoundMuted()) return;

  const ctx = getAudioContext();
  if (!ctx) return;

  // Browsers may suspend the context until user interaction
  if (ctx.state === "suspended") {
    ctx.resume().catch(() => {});
  }

  // C5 then E5 — pleasant rising chime
  playTone(ctx, 523.25, 0, 0.18, 0.18);
  playTone(ctx, 659.25, 0.12, 0.22, 0.18);
}
