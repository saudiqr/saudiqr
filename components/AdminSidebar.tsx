"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const adminLinks = [
  { href: "/admin", text: "الرئيسية", icon: "⌂", exact: true },
  { href: "/admin/customers", text: "العملاء", icon: "👥" },
  { href: "/admin/review-reports", text: "بلاغات التقييمات", icon: "⚠" },
  { href: "/admin/businesses", text: "النشاطات", icon: "🏢" },
  { href: "/admin/subscriptions", text: "الاشتراكات", icon: "◈" },
  { href: "/admin/plans", text: "الباقات", icon: "◆" },
  { href: "/admin/coupons", text: "الكوبونات", icon: "⌁" },
  { href: "/admin/reviews", text: "التقييمات", icon: "☆" },
  { href: "/admin/payments", text: "المدفوعات", icon: "▣" },
  { href: "/admin/stats", text: "إحصائيات المنصة", icon: "▧" },
  { href: "/admin/settings", text: "الإعدادات", icon: "⚙" },
];

export default function AdminSidebar() {
  const pathname = usePathname();

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
        .admin-sidebar-link:hover {
          background: rgba(16,185,129,0.16) !important;
          color: #10b981 !important;
          box-shadow: 0 0 10px rgba(16,185,129,0.16) !important;
        }
      `}</style>

      <h1 style={{ fontSize: "38px", fontWeight: 950, color: "#ffffff" }}>
        SaudiQR
      </h1>

      <p style={{ marginTop: "8px", color: "#10b981", fontWeight: 900 }}>
        لوحة إدارة المنصة
      </p>

      <nav
        style={{
          marginTop: "20px",
          display: "flex",
          flexDirection: "column",
          gap: "4px",
        }}
      >
        {adminLinks.map((link) => {
          const active = link.exact
            ? pathname === link.href
            : pathname.startsWith(link.href);

          return (
            <AdminSideLink
              key={link.href}
              href={link.href}
              text={link.text}
              icon={link.icon}
              active={active}
            />
          );
        })}
      </nav>

      <button
        style={{
          marginTop: "24px",
          width: "100%",
          background: "transparent",
          border: "0",
          color: "#ef4444",
          fontWeight: 950,
          fontSize: "20px",
          textAlign: "right",
          cursor: "pointer",
          padding: "16px 18px",
        }}
      >
        تسجيل خروج
      </button>
    </aside>
  );
}

function AdminSideLink({
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
      className="admin-sidebar-link"
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
        fontWeight: 950,
        fontSize: "17px",
        boxSizing: "border-box",
        transition: "0.2s",
        boxShadow: active ? "0 0 10px rgba(16,185,129,0.16)" : "none",
      }}
    >
      <span>{text}</span>
      <span style={{ fontSize: "24px" }}>{icon}</span>
    </Link>
  );
}
