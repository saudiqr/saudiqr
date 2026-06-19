export function playSound(file: string) {
  const audio = new Audio(file);

  audio.volume = 0.8;

  audio.play().catch(() => {});
}