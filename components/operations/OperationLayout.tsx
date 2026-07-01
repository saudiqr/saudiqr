"use client";

import type { CSSProperties, ReactNode } from "react";
import { operationTheme } from "./operationTheme";

export function OperationLayout({
  operationMode,
  children,
}: {
  operationMode: boolean;
  children: ReactNode;
}) {
  return (
    <main dir="rtl" style={layoutStyle(operationMode)}>
      {children}
    </main>
  );
}

const layoutStyle = (operationMode: boolean): CSSProperties => ({
  position: operationMode ? "fixed" : "relative",
  inset: operationMode ? 0 : "auto",
  zIndex: operationMode ? 9999 : "auto",
  width: operationMode ? "100vw" : "100%",
  height: operationMode ? "100vh" : "auto",
  minHeight: "100vh",
  overflowY: operationMode ? "auto" : "visible",
  background: operationMode ? operationTheme.backgroundDark : "transparent",
  color: operationTheme.text,
  display: "grid",
  alignContent: "start",
  gap: "14px",
  padding: operationMode ? "14px" : 0,
});