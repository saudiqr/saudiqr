"use client";

import type { CSSProperties, ReactNode } from "react";
import { operationTheme } from "./operationTheme";

type Props = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  operationMode: boolean;
  actions?: ReactNode;
  stats?: ReactNode;
};

export function OperationHeader({
  eyebrow,
  title,
  subtitle,
  operationMode,
  actions,
  stats,
}: Props) {
  return (
    <section style={headerStyle}>
      <div>
        {eyebrow ? <p style={eyebrowStyle}>{eyebrow}</p> : null}

        <h1
          style={{
            ...titleStyle,
            fontSize: operationMode ? "38px" : "30px",
          }}
        >
          {title}
        </h1>

        {!operationMode && subtitle ? (
          <p style={subtitleStyle}>{subtitle}</p>
        ) : null}
      </div>

      {actions ? (
        <div style={actionsStyle}>
          {actions}
        </div>
      ) : null}

      {stats ? (
        <div style={statsStyle}>
          {stats}
        </div>
      ) : null}
    </section>
  );
}

const headerStyle: CSSProperties = {
  background: `linear-gradient(135deg, ${operationTheme.card}, ${operationTheme.backgroundDark})`,
  border: `1px solid ${operationTheme.border}`,
  borderRadius: operationTheme.radius.lg,
  padding: "16px",
  display: "grid",
  gridTemplateColumns: "1.2fr auto 1.5fr",
  gap: "16px",
  alignItems: "center",
  boxShadow: operationTheme.shadow,
};

const eyebrowStyle: CSSProperties = {
  margin: "0 0 6px",
  color: operationTheme.goldHover,
  fontWeight: 900,
  fontSize: "14px",
};

const titleStyle: CSSProperties = {
  margin: 0,
  color: operationTheme.text,
  fontWeight: 950,
};

const subtitleStyle: CSSProperties = {
  marginTop: "8px",
  color: operationTheme.muted,
  fontWeight: 700,
  lineHeight: 1.7,
};

const actionsStyle: CSSProperties = {
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
};

const statsStyle: CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  gap: "8px",
  flexWrap: "wrap",
};