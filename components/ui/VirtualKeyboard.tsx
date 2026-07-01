"use client";

type KeyboardMode = "text" | "pin";

type VirtualKeyboardProps = {
  value: string;
  onChange: (value: string) => void;
  mode?: KeyboardMode;
  maxLength?: number;
  onEnter?: () => void;
};

const textRows = [
  ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
  ["Z", "X", "C", "V", "B", "N", "M", "-", "_"],
];

const pinRows = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
];

export default function VirtualKeyboard({
  value,
  onChange,
  mode = "text",
  maxLength = 32,
  onEnter,
}: VirtualKeyboardProps) {
  function addKey(key: string) {
    if (value.length >= maxLength) return;
    onChange(value + key);
  }

  function backspace() {
    onChange(value.slice(0, -1));
  }

  function clear() {
    onChange("");
  }

  if (mode === "pin") {
    return (
      <div dir="ltr" className="grid gap-2">
        {pinRows.map((row, rowIndex) => (
          <div key={rowIndex} className="grid grid-cols-3 gap-2">
            {row.map((key) => (
              <KeyboardButton key={key} onClick={() => addKey(key)} size="pin">
                {key}
              </KeyboardButton>
            ))}
          </div>
        ))}

        <div className="grid grid-cols-3 gap-2">
          <KeyboardButton tone="danger" onClick={clear} size="pin">
            Clear
          </KeyboardButton>

          <KeyboardButton onClick={() => addKey("0")} size="pin">
            0
          </KeyboardButton>

          <KeyboardButton onClick={backspace} size="pin">
            ⌫
          </KeyboardButton>
        </div>
      </div>
    );
  }

  return (
    <div dir="ltr" className="grid gap-2">
      {textRows.map((row, rowIndex) => (
        <div
          key={rowIndex}
          className="grid gap-1.5"
          style={{
            gridTemplateColumns: `repeat(${row.length}, minmax(0, 1fr))`,
          }}
        >
          {row.map((key) => (
            <KeyboardButton key={key} onClick={() => addKey(key)}>
              {key}
            </KeyboardButton>
          ))}
        </div>
      ))}

      <div className="grid grid-cols-[1fr_2fr_1fr_1fr] gap-1.5">
        <KeyboardButton tone="danger" onClick={clear}>
          Clear
        </KeyboardButton>

        <KeyboardButton onClick={() => addKey(" ")}>
          Space
        </KeyboardButton>

        <KeyboardButton onClick={backspace}>
          ⌫
        </KeyboardButton>

        <KeyboardButton tone="gold" onClick={onEnter || (() => {})}>
          Enter
        </KeyboardButton>
      </div>
    </div>
  );
}

function KeyboardButton({
  children,
  onClick,
  tone = "default",
  size = "text",
}: {
  children: React.ReactNode;
  onClick: () => void;
  tone?: "default" | "danger" | "gold";
  size?: "text" | "pin";
}) {
  const toneClass =
    tone === "danger"
      ? "border-red-500/30 bg-red-500/10 text-red-200 hover:bg-red-500/20"
      : tone === "gold"
        ? "border-[#d8a342]/40 bg-[#d8a342] text-[#160f09] hover:bg-[#efbd61]"
        : "border-[#6b4a25] bg-[#261910] text-[#f5d18a] hover:bg-[#352315]";

  const heightClass = size === "pin" ? "h-12" : "h-10";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`${heightClass} rounded-xl border px-1 text-sm font-black shadow-sm transition active:scale-[0.98] ${toneClass}`}
    >
      {children}
    </button>
  );
}
