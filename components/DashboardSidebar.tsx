"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function DashboardSidebar({
  firstBranchId,
}: {
  firstBranchId?: string;
}) {
  const pathname = usePathname();

  const branchPath = (page: string) =>
    firstBranchId ? `/branch/${firstBranchId}/${page}` : "/dashboard";

  return (
    <aside
      style={{
        width: "100%",
        minHeight: "100vh",
        borderLeft: "1px solid rgba(255,255,255,0.1)",
        background: "#06140f",
        padding: "32px 24px",
        boxSizing: "border-box",
      }}
    >
      <style>{`
        .sidebar-link:hover {
          background: rgba(16,185,129,0.16) !important;
          color: #10b981 !important;
          box-shadow: 0 0 10px rgba(16,185,129,0.16) !important;
        }
      `}</style>

      <h1 style={{ fontSize: "40px", fontWeight: 900 }}>SaudiQR</h1>

      <p style={{ marginTop: "8px", color: "#10b981", fontWeight: 800 }}>
        لوحة التحكم الرئيسية
      </p>

      <nav
        style={{
          marginTop: "15px",
          display: "flex",
          flexDirection: "column",
          gap: "1px",
        }}
      >
        <SideLink href="/dashboard" text="الرئيسية" icon="⌂" active={pathname === "/dashboard"} />

        <SideLink
          href={firstBranchId ? `/branch/${firstBranchId}` : "/dashboard"}
          text="الطلبات"
          icon="▢"
          active={firstBranchId ? pathname === `/branch/${firstBranchId}` : false}
        />

        <SideLink href={branchPath("kitchen")} text="المطبخ" icon="♨" active={pathname.includes("/kitchen")} />
        <SideLink href={branchPath("cashier")} text="الكاشير" icon="▣" active={pathname.includes("/cashier")} />
        <SideLink href={branchPath("tables")} text="الطاولات" icon="▤" active={pathname.includes("/tables")} />
        <SideLink href={branchPath("waiter-calls")} text="النادل" icon="♢" active={pathname.includes("/waiter-calls")} />
        <SideLink href={branchPath("bill-requests")} text="الفواتير" icon="▥" active={pathname.includes("/bill-requests")} />
        <SideLink href={branchPath("stats")} text="الإحصائيات" icon="▧" active={pathname.includes("/stats")} />
        <SideLink href={branchPath("reviews")} text="التقييمات" icon="☆" active={pathname.includes("/reviews")} />
        <SideLink href={branchPath("settings")} text="الإعدادات" icon="⚙" active={pathname.includes("/settings")} />
      </nav>

      <button
        style={{
          marginTop: "15px",
          width: "100%",
          background: "transparent",
          border: "0",
          color: "#ef4444",
          fontWeight: 900,
          fontSize: "25px",
          textAlign: "right",
          cursor: "pointer",
        }}
      >
        تسجيل خروج
      </button>
    </aside>
  );
}

function SideLink({
  href,
  text,
  icon,
  active = false,
}: {
  href: string;
  text: string;
  icon: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className="sidebar-link"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        width: "100%",
        padding: "16px 18px",
        borderRadius: "18px",
        background: active ? "rgba(16,185,129,0.16)" : "transparent",
        color: active ? "#10b981" : "#d1d5db",
        textDecoration: "none",
        fontWeight: 900,
        fontSize: "16px",
        boxSizing: "border-box",
        transition: "0.2s",
        boxShadow: active ? "0 0 10px rgba(16,185,129,0.16)" : "none",
      }}
    >
      <span>{text}</span>
      <span style={{ fontSize: "28px" }}>{icon}</span>
    </Link>
  );
}