"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getSubscriptionAccessByBranchId } from "@/lib/subscriptionAccess";

type PermissionKey =
  | "orders"
  | "kitchen"
  | "cashier"
  | "tables"
  | "waiter_calls"
  | "bill_requests"
  | "stats"
  | "reviews"
  | "products"
  | "categories"
  | "settings";

type StaffRole = "owner" | "manager" | "cashier" | "kitchen" | "waiter";

type BranchStaffRow = {
  id: string;
  branch_id: string;
  user_id: string | null;
  email: string;
  role: StaffRole;
  permissions: PermissionKey[] | null;
  status: "active" | "disabled";
};

type PlanPermissions = {
  allowOrders: boolean;
  allowKitchen: boolean;
  allowCashier: boolean;
  allowStats: boolean;
};

const theme = {
  bg: "#16110E",
  bg2: "#1C1612",
  card: "#241B16",
  card2: "#2A211C",
  border: "#4A3425",
  gold: "#C68A3D",
  goldHover: "#DEA54B",
  cream: "#F5F0E8",
  text: "#FFF8F0",
  muted: "#C8B6A4",
  success: "#65C466",
  error: "#D95C5C",
};

const allPermissions: PermissionKey[] = [
  "orders",
  "kitchen",
  "cashier",
  "tables",
  "waiter_calls",
  "bill_requests",
  "stats",
  "reviews",
  "products",
  "categories",
  "settings",
];

const defaultPermissionsByRole: Record<StaffRole, PermissionKey[]> = {
  owner: allPermissions,
  manager: [
    "orders",
    "kitchen",
    "cashier",
    "tables",
    "waiter_calls",
    "bill_requests",
    "stats",
    "reviews",
    "products",
    "categories",
  ],
  cashier: ["orders", "cashier", "bill_requests", "tables"],
  kitchen: ["orders", "kitchen"],
  waiter: ["orders", "tables", "waiter_calls", "bill_requests"],
};

const menuLinks: {
  page: string;
  text: string;
  icon: string;
  permission: PermissionKey;
  activeIncludes: string;
}[] = [
  {
    page: "orders",
    text: "الطلبات",
    icon: "▤",
    permission: "orders",
    activeIncludes: "/orders",
  },
  {
    page: "kitchen",
    text: "المطبخ",
    icon: "♨",
    permission: "kitchen",
    activeIncludes: "/kitchen",
  },
  {
    page: "cashier",
    text: "الكاشير",
    icon: "▣",
    permission: "cashier",
    activeIncludes: "/cashier",
  },
  {
    page: "tables",
    text: "الطاولات",
    icon: "▦",
    permission: "tables",
    activeIncludes: "/tables",
  },
  {
    page: "waiter-calls",
    text: "النادل",
    icon: "♢",
    permission: "waiter_calls",
    activeIncludes: "/waiter-calls",
  },
  {
    page: "bill-requests",
    text: "الفواتير",
    icon: "▥",
    permission: "bill_requests",
    activeIncludes: "/bill-requests",
  },
  {
    page: "stats",
    text: "الإحصائيات",
    icon: "▥",
    permission: "stats",
    activeIncludes: "/stats",
  },
  {
    page: "reviews",
    text: "التقييمات",
    icon: "☆",
    permission: "reviews",
    activeIncludes: "/reviews",
  },
  {
    page: "products",
    text: "المنتجات",
    icon: "◇",
    permission: "products",
    activeIncludes: "/products",
  },
  {
    page: "categories",
    text: "الأقسام",
    icon: "▧",
    permission: "categories",
    activeIncludes: "/categories",
  },
  {
    page: "settings",
    text: "الإعدادات",
    icon: "⚙",
    permission: "settings",
    activeIncludes: "/settings",
  },
];

function isAllowedByPlan(
  permission: PermissionKey,
  planPermissions: PlanPermissions | null
) {
  if (!planPermissions) {
    return !["orders", "kitchen", "cashier", "stats"].includes(permission);
  }

  if (permission === "orders") return planPermissions.allowOrders;
  if (permission === "kitchen") return planPermissions.allowKitchen;
  if (permission === "cashier") return planPermissions.allowCashier;
  if (permission === "stats") return planPermissions.allowStats;

  return true;
}

export default function DashboardSidebar({
  firstBranchId,
}: {
  firstBranchId?: string;
}) {
  const pathname = usePathname();

  const [allowedPermissions, setAllowedPermissions] =
    useState<PermissionKey[]>(allPermissions);
  const [planPermissions, setPlanPermissions] =
    useState<PlanPermissions | null>(null);
  const [loadingPermissions, setLoadingPermissions] = useState(false);

  const [pendingBills, setPendingBills] = useState(0);
  const [pendingWaiters, setPendingWaiters] = useState(0);
  const [newReviews, setNewReviews] = useState(0);
  const [newOrders, setNewOrders] = useState(0);
  const [kitchenOrders, setKitchenOrders] = useState(0);
  const [cashierBills, setCashierBills] = useState(0);

  const branchPath = (page: string) => {
    if (!firstBranchId) return "/dashboard";
    return page ? `/branch/${firstBranchId}/${page}` : `/branch/${firstBranchId}`;
  };

  useEffect(() => {
    async function loadPermissions() {
      if (!firstBranchId) {
        setAllowedPermissions(allPermissions);
        setPlanPermissions(null);
        return;
      }

      setLoadingPermissions(true);

      const access = await getSubscriptionAccessByBranchId(firstBranchId);

      if (access.plan) {
        setPlanPermissions({
          allowOrders: access.plan.allowOrders,
          allowKitchen: access.plan.allowKitchen,
          allowCashier: access.plan.allowCashier,
          allowStats: access.plan.allowStats,
        });
      } else {
        setPlanPermissions(null);
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user?.email) {
        setAllowedPermissions(allPermissions);
        setLoadingPermissions(false);
        return;
      }

      const { data, error } = await supabase
        .from("branch_staff")
        .select("id, branch_id, user_id, email, role, permissions, status")
        .eq("branch_id", firstBranchId)
        .eq("email", user.email.toLowerCase())
        .eq("status", "active")
        .maybeSingle();

      if (error || !data) {
        setAllowedPermissions(allPermissions);
        setLoadingPermissions(false);
        return;
      }

      const staffRow = data as BranchStaffRow;
      const permissions =
        staffRow.permissions && staffRow.permissions.length > 0
          ? staffRow.permissions
          : defaultPermissionsByRole[staffRow.role];

      setAllowedPermissions(permissions);
      setLoadingPermissions(false);
    }

    async function loadCounters() {
      if (!firstBranchId) {
        setPendingBills(0);
        setPendingWaiters(0);
        setNewReviews(0);
        setNewOrders(0);
        setKitchenOrders(0);
        setCashierBills(0);
        return;
      }

      const [
  { count: bills },
  { count: waiters },
  { count: reviews },
  { count: orders },
  { count: kitchen },
  { count: cashier },
  { count: readyWaiterItems },
  { count: cleaning },
] = await Promise.all([
  supabase
    .from("bill_requests")
    .select("*", { count: "exact", head: true })
    .eq("branch_id", firstBranchId)
    .eq("status", "pending"),

  supabase
    .from("waiter_calls")
    .select("*", { count: "exact", head: true })
    .eq("branch_id", firstBranchId)
    .eq("status", "pending"),

  supabase
    .from("product_reviews")
    .select("*", { count: "exact", head: true })
    .eq("branch_id", firstBranchId)
    .eq("seen_by_owner", false),

  supabase
    .from("orders")
    .select("*", { count: "exact", head: true })
    .eq("branch_id", firstBranchId)
    .eq("status", "new"),

  supabase
    .from("orders")
    .select("*", { count: "exact", head: true })
    .eq("branch_id", firstBranchId)
    .in("status", ["preparing", "ready"]),

  supabase
    .from("bill_requests")
    .select("*", { count: "exact", head: true })
    .eq("branch_id", firstBranchId)
    .eq("status", "pending"),

  supabase
          .from("order_items")
          .select("id, orders!inner(id, branch_id)", { count: "exact", head: true })
          .eq("orders.branch_id", firstBranchId)
          .eq("status", "ready"),

  supabase
    .from("tables")
    .select("*", { count: "exact", head: true })
    .eq("branch_id", firstBranchId)
    .eq("status", "cleaning"),
]);

setPendingBills(bills || 0);
setNewReviews(reviews || 0);
setNewOrders(orders || 0);
setKitchenOrders(kitchen || 0);
setCashierBills(cashier || 0);

setPendingWaiters(
        (waiters || 0) +
          (readyWaiterItems || 0) +
          (bills || 0) +
          (cleaning || 0)
      );
    }

    loadPermissions();
    loadCounters();

    const channel = supabase
      .channel(`sidebar-counters-${firstBranchId || "dashboard"}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: firstBranchId ? `branch_id=eq.${firstBranchId}` : undefined,
        },
        () => loadCounters()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bill_requests",
          filter: firstBranchId ? `branch_id=eq.${firstBranchId}` : undefined,
        },
        () => loadCounters()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "waiter_calls",
          filter: firstBranchId ? `branch_id=eq.${firstBranchId}` : undefined,
        },
        () => loadCounters()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "product_reviews",
          filter: firstBranchId ? `branch_id=eq.${firstBranchId}` : undefined,
        },
        () => loadCounters()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "reviews",
          filter: firstBranchId ? `branch_id=eq.${firstBranchId}` : undefined,
        },
        () => loadCounters()
      )
      .on(
  "postgres_changes",
  {
    event: "*",
    schema: "public",
    table: "order_items",
  },
  () => loadCounters()
)
.on(
  "postgres_changes",
  {
    event: "*",
    schema: "public",
    table: "tables",
    filter: firstBranchId ? `branch_id=eq.${firstBranchId}` : undefined,
  },
  () => loadCounters()
)
      .subscribe();

    const refreshInterval = window.setInterval(() => {
      loadCounters();
    }, 3000);

    return () => {
      supabase.removeChannel(channel);
      window.clearInterval(refreshInterval);
    };
  }, [firstBranchId]);

  const visibleBranchLinks = useMemo(() => {
    return menuLinks.filter((link) => {
      const staffAllowed = allowedPermissions.includes(link.permission);
      const planAllowed = isAllowedByPlan(link.permission, planPermissions);

      return staffAllowed && planAllowed;
    });
  }, [allowedPermissions, planPermissions]);

  const canManageStaff =
    allowedPermissions.includes("settings") ||
    allowedPermissions.length === allPermissions.length;

  return (
    <aside
      className="dashboard-sidebar"
      style={{
        width: "100%",
        minHeight: "100vh",
        padding: "22px",
        borderLeft: `1px solid ${theme.border}`,
        background:
          "linear-gradient(180deg, rgba(36,27,22,.98), rgba(22,17,14,.98))",
        position: "sticky",
        top: 0,
        boxSizing: "border-box",
        color: theme.text,
        overflow: "hidden",
      }}
    >
      <style>{`
        .dashboard-sidebar * {
          box-sizing: border-box;
        }

        .sidebar-link {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          padding: 14px 18px;
          border-radius: 16px;
          color: ${theme.muted};
          text-decoration: none;
          font-weight: 900;
          transition: .2s;
          border: 1px solid transparent;
          white-space: nowrap;
          cursor: pointer;
        }

        .sidebar-link:hover,
        .sidebar-link.active {
          background: linear-gradient(135deg, ${theme.gold}, ${theme.goldHover});
          color: #1C1612;
          border-color: rgba(198,138,61,.42);
          box-shadow: 0 12px 24px rgba(198,138,61,.20);
        }

        .sidebar-link .icon {
          font-size: 19px;
          opacity: .95;
          line-height: 1;
          flex: 0 0 auto;
        }

        @media (max-width: 1100px) {
          .dashboard-sidebar {
            display: none !important;
          }
        }
      `}</style>

      <div
        style={{
          border: `1px solid rgba(198,138,61,.28)`,
          borderRadius: "26px",
          padding: "18px",
          textAlign: "center",
          marginBottom: "18px",
          background: "rgba(198,138,61,.06)",
        }}
      >
        <div style={{ fontSize: "38px", color: theme.gold }}>☕</div>

        <h2
          style={{
            margin: "6px 0 0",
            fontSize: "28px",
            color: theme.goldHover,
            fontWeight: 950,
          }}
        >
          SaudiQR
        </h2>

        <p
          style={{
            color: theme.muted,
            marginTop: "6px",
            fontSize: "13px",
            fontWeight: 800,
          }}
        >
          إدارة المطاعم والكافيهات
        </p>
      </div>

      <nav
        style={{
          display: "grid",
          gap: "8px",
          paddingBottom: "76px",
        }}
      >
        <SideLink
          href="/dashboard"
          text="الرئيسية"
          icon="⌂"
          active={pathname === "/dashboard"}
        />

        <SideLink
          href="/subscription/custom"
          text="الاشتراكات"
          icon="♛"
          active={
            pathname.includes("/subscription") ||
            pathname.includes("/dashboard/subscription")
          }
        />

        {firstBranchId ? (
          <SideLink
            href={branchPath("")}
            text="لوحة الفرع"
            icon="◇"
            active={pathname === `/branch/${firstBranchId}`}
          />
        ) : null}

        <SideLink
          href="/dashboard/branches"
          text="إدارة الفروع"
          icon="□"
          active={pathname.includes("/dashboard/branches")}
        />

        <Divider title="إدارة الفرع" />

        {loadingPermissions ? (
          <div
            style={{
              padding: "14px 18px",
              color: theme.goldHover,
              fontWeight: 900,
              fontSize: "15px",
            }}
          >
            جاري تحميل الصلاحيات...
          </div>
        ) : (
          visibleBranchLinks.map((link) => (
            <SideLink
              key={link.page}
              href={branchPath(link.page)}
              text={link.text}
              icon={link.icon}
              active={pathname.includes(link.activeIncludes)}
              badge={
                link.permission === "orders"
                  ? newOrders
                  : link.permission === "kitchen"
                    ? kitchenOrders
                    : link.permission === "cashier"
                      ? cashierBills
                      : link.permission === "bill_requests"
                        ? pendingBills
                        : link.permission === "waiter_calls"
                          ? pendingWaiters
                          : link.permission === "reviews"
                            ? newReviews
                            : 0
              }
            />
          ))
        )}

        {canManageStaff ? (
          <SideLink
            href={branchPath("staff")}
            text="الموظفين"
            icon="♙"
            active={pathname.includes("/staff")}
          />
        ) : null}
      </nav>

      <button
        onClick={async () => {
          await supabase.auth.signOut();
          window.location.href = "/login";
        }}
        style={{
          position: "absolute",
          bottom: "22px",
          left: "22px",
          right: "22px",
          border: `1px solid rgba(198,138,61,.32)`,
          borderRadius: "18px",
          padding: "14px",
          textAlign: "center",
          color: theme.goldHover,
          fontWeight: 900,
          background: "rgba(198,138,61,.06)",
          whiteSpace: "nowrap",
          cursor: "pointer",
        }}
      >
        تسجيل خروج
      </button>
    </aside>
  );
}

function Divider({ title }: { title: string }) {
  return (
    <div
      style={{
        margin: "12px 4px 6px",
        color: theme.goldHover,
        fontWeight: 950,
        fontSize: "13px",
        opacity: 0.9,
      }}
    >
      {title}
    </div>
  );
}

function CounterBadge({ count }: { count: number }) {
  if (!count) return null;

  return (
    <span
      style={{
        minWidth: "22px",
        height: "22px",
        borderRadius: "999px",
        background: theme.error,
        color: "#fff",
        fontSize: "11px",
        fontWeight: 950,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 6px",
        flex: "0 0 auto",
      }}
    >
      {count}
    </span>
  );
}

function SideLink({
  href,
  text,
  icon,
  active = false,
  badge,
}: {
  href: string;
  text: string;
  icon: string;
  active?: boolean;
  badge?: number;
}) {
  return (
    <Link href={href} className={`sidebar-link ${active ? "active" : ""}`}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          minWidth: 0,
          overflow: "hidden",
        }}
      >
        <span
          style={{
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {text}
        </span>

        <CounterBadge count={badge || 0} />
      </div>

      <span className="icon">{icon}</span>
    </Link>
  );
}
