"use client";

import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from "react";
import { operationTheme } from "./operationTheme";
import type { OperationTone } from "./types";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  tone?: OperationTone;
  fullWidth?: boolean;
};

export function OperationButton({
  children,
  tone = "gold",
  fullWidth = false,
  disabled,
  style,
  ...props
}: Props) {
  return (
    <button
      {...props}
      disabled={disabled}
      style={{
        ...buttonStyle(tone, fullWidth, Boolean(disabled)),
        ...style,
      }}
    >
      {children}
    </button>
  );
}

const toneStyles: Record<OperationTone, CSSProperties> = {
  default: {
    border: `1px solid ${operationTheme.border}`,
    background: operationTheme.card,
    color: operationTheme.text,
  },
  gold: {
    border: "0",
    background: `linear-gradient(135deg, ${operationTheme.gold}, ${operationTheme.goldHover})`,
    color: operationTheme.background,
  },
  green: {
    border: "1px solid rgba(63,163,108,.44)",
    background: "rgba(63,163,108,.18)",
    color: "#B9F6CE",
  },
  blue: {
    border: "1px solid rgba(49,130,206,.55)",
    background: "linear-gradient(135deg, rgba(49,130,206,.30), rgba(49,130,206,.16))",
    color: "#DBEEFF",
  },
  red: {
    border: "1px solid rgba(201,79,79,.42)",
    background: "rgba(201,79,79,.14)",
    color: "#F3B0B0",
  },
  gray: {
    border: "1px solid rgba(200,182,164,.28)",
    background: "rgba(200,182,164,.10)",
    color: operationTheme.muted,
  },
  purple: {
    border: "1px solid rgba(139,92,246,.38)",
    background: "rgba(139,92,246,.18)",
    color: operationTheme.purpleText,
  },
};

const buttonStyle = (
  tone: OperationTone,
  fullWidth: boolean,
  disabled: boolean
): CSSProperties => ({
  ...toneStyles[tone],
  width: fullWidth ? "100%" : "auto",
  borderRadius: operationTheme.radius.md,
  padding: "12px 16px",
  fontWeight: 950,
  cursor: disabled ? "not-allowed" : "pointer",
  opacity: disabled ? 0.5 : 1,
  whiteSpace: "nowrap",
});
