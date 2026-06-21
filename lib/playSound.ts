type SoundType = "new-order" | "waiter-call" | "bill-request";

export function playSound(type: SoundType) {
  const AudioContextClass =
    window.AudioContext || (window as any).webkitAudioContext;

  const audio = new AudioContextClass();

  const oscillator = audio.createOscillator();
  const gain = audio.createGain();

  oscillator.connect(gain);
  gain.connect(audio.destination);

  if (type === "new-order") {
    oscillator.frequency.setValueAtTime(880, audio.currentTime);
    oscillator.frequency.setValueAtTime(1175, audio.currentTime + 0.12);
  }

  if (type === "waiter-call") {
    oscillator.frequency.setValueAtTime(660, audio.currentTime);
    oscillator.frequency.setValueAtTime(990, audio.currentTime + 0.1);
  }

  if (type === "bill-request") {
    oscillator.frequency.setValueAtTime(520, audio.currentTime);
    oscillator.frequency.setValueAtTime(780, audio.currentTime + 0.08);
  }

  oscillator.type = "sine";

  gain.gain.setValueAtTime(0.0001, audio.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.5, audio.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 0.35);

  oscillator.start(audio.currentTime);
  oscillator.stop(audio.currentTime + 0.38);
}