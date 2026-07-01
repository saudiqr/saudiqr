"use client";

import type { CSSProperties, ReactNode } from "react";
import { operationTheme } from "./operationTheme";

export function OperationCard({
  children,
  style,
}: {
  children: ReactNode;
  style?: CSSProperties;
}) {
  return <article style={{ ...cardStyle, ...style }}>{children}</article>;
}

export function OperationBadge({
  children,
  style,
}: {
  children: ReactNode;
  style?: CSSProperties;
}) {
  return <span style={{ ...badgeStyle, ...style }}>{children}</span>;
}

const cardStyle: CSSProperties = {
  background: operationTheme.card,
  border: `1px solid ${operationTheme.border}`,
  borderRadius: operationTheme.radius.lg,
  padding: "10px",
  boxShadow: operationTheme.shadow,
  display: "flex",
  flexDirection: "column",
  minHeight: "285px",
};

const badgeStyle: CSSProperties = {
  borderRadius: "999px",
  padding: "7px 10px",
  fontWeight: 950,
  whiteSpace: "nowrap",
  fontSize: "13px",
};
