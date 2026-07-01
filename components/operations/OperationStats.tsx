"use client";

import type { CSSProperties } from "react";
import { operationTheme } from "./operationTheme";
import type { OperationTone } from "./types";

type Stat = {
  title: string;
  value: number | string;
  tone?: OperationTone;
};

export function OperationStats({
  stats,
  columns = 4,
}: {
  stats: Stat[];
  columns?: number;
}) {
  return (
    <div style={gridStyle(columns)}>
      {stats.map((stat) => (
        <OperationStatBox
          key={stat.title}
          title={stat.title}
          value={stat.value}
          tone={stat.tone}
        />
      ))}
    </div>
  );
}

export function OperationStatBox({
  title,
  value,
  tone = "default",
}: Stat) {
  const colors = toneMap[tone] || toneMap.default;

  return (
    <div
      style={{
        ...boxStyle,
        border: `1px solid ${colors.border}`,
        background: colors.bg,
      }}
    >
      <span style={titleStyle}>{title}</span>
      <strong style={{ ...valueStyle, color: colors.color }}>{value}</strong>
    </div>
  );
}

const toneMap: Record<OperationTone, { bg: string; border: string; color: string }> = {
  default: { bg: operationTheme.cardAlt, border: operationTheme.border, color: operationTheme.text },
  gold: { bg: "rgba(198,138,61,.14)", border: "rgba(198,138,61,.34)", color: operationTheme.goldHover },
  green: { bg: "rgba(63,163,108,.14)", border: "rgba(63,163,108,.34)", color: operationTheme.successText },
  blue: { bg: "rgba(59,130,246,.14)", border: "rgba(59,130,246,.34)", color: operationTheme.blueText },
  red: { bg: "rgba(201,79,79,.14)", border: "rgba(201,79,79,.42)", color: operationTheme.dangerText },
  gray: { bg: "rgba(200,182,164,.10)", border: "rgba(200,182,164,.24)", color: operationTheme.muted },
  purple: { bg: "rgba(139,92,246,.18)", border: "rgba(139,92,246,.38)", color: operationTheme.purpleText },
};

const gridStyle = (columns: number): CSSProperties => ({
  display: "grid",
  gridTemplateColumns: `repeat(${columns}, minmax(70px, 1fr))`,
  gap: "8px",
});

const boxStyle: CSSProperties = {
  borderRadius: operationTheme.radius.md,
  padding: "8px 10px",
  textAlign: "center",
};

const titleStyle: CSSProperties = {
  display: "block",
  color: operationTheme.muted,
  fontSize: "13px",
  fontWeight: 900,
};

const valueStyle: CSSProperties = {
  display: "block",
  marginTop: "4px",
  fontSize: "22px",
  fontWeight: 950,
};
