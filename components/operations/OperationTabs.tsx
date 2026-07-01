"use client";

import type { CSSProperties } from "react";
import { operationTheme } from "./operationTheme";
import type { OperationTab } from "./types";

export function OperationTabs<T extends string>({
  tabs,
  activeTab,
  onChange,
}: {
  tabs: OperationTab<T>[];
  activeTab: T;
  onChange: (tab: T) => void;
}) {
  return (
    <section style={tabsCardStyle}>
      <div style={tabsWrapStyle}>
        {tabs.map((tab) => {
          const active = tab.key === activeTab;

          return (
            <button
              key={tab.key}
              onClick={() => onChange(tab.key)}
              style={{
                ...tabButtonStyle,
                border: active
                  ? "1px solid rgba(198,138,61,.72)"
                  : `1px solid ${operationTheme.border}`,
                background: active ? "rgba(198,138,61,.16)" : operationTheme.cardAlt,
                color: active ? operationTheme.goldHover : operationTheme.muted,
              }}
            >
              {tab.icon ? <span>{tab.icon}</span> : null}
              <span>{tab.label}</span>
              {typeof tab.count === "number" ? (
                <strong style={countStyle}>{tab.count}</strong>
              ) : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}

const tabsCardStyle: CSSProperties = {
  background: operationTheme.card,
  border: `1px solid ${operationTheme.border}`,
  borderRadius: operationTheme.radius.lg,
  padding: "10px",
  boxShadow: "0 16px 48px rgba(0,0,0,.20)",
};

const tabsWrapStyle: CSSProperties = {
  display: "flex",
  gap: "9px",
  flexWrap: "wrap",
};

const tabButtonStyle: CSSProperties = {
  borderRadius: "999px",
  padding: "9px 15px",
  fontWeight: 950,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: "8px",
};

const countStyle: CSSProperties = {
  minWidth: "24px",
  height: "24px",
  borderRadius: "999px",
  background: "rgba(0,0,0,.25)",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "0 6px",
};
