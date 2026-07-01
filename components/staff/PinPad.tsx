"use client";

type PinPadProps = {
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
};

export default function PinPad({ value, onChange, maxLength = 4 }: PinPadProps) {
  function addDigit(digit: string) {
    if (value.length >= maxLength) return;
    onChange(value + digit);
  }

  return (
    <div dir="ltr" className="grid grid-cols-3 gap-3">
      {["1","2","3","4","5","6","7","8","9"].map((digit) => (
        <button
          key={digit}
          type="button"
          onClick={() => addDigit(digit)}
          className="h-16 rounded-2xl border border-[#6b4a25] bg-[#261910] text-2xl font-black text-[#f5d18a] transition hover:bg-[#352315]"
        >
          {digit}
        </button>
      ))}

      <button type="button" onClick={() => onChange("")} className="h-16 rounded-2xl border border-red-500/30 bg-red-500/10 text-sm font-black text-red-200">
        مسح
      </button>

      <button type="button" onClick={() => addDigit("0")} className="h-16 rounded-2xl border border-[#6b4a25] bg-[#261910] text-2xl font-black text-[#f5d18a] transition hover:bg-[#352315]">
        0
      </button>

      <button type="button" onClick={() => onChange(value.slice(0, -1))} className="h-16 rounded-2xl border border-[#6b4a25] bg-[#261910] text-sm font-black text-[#f5d18a]">
        حذف
      </button>
    </div>
  );
}
