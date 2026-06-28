"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getSubscriptionAccessByBranchId } from "@/lib/subscriptionAccess";

type KitchenStatus = "preparing" | "ready" | "delivered";

type Order = {
  id: string;
  order_number: string | null;
  status: KitchenStatus;
  total: number;
  notes: string | null;
  created_at: string;
  table_session_id: string | null;
  tables: {
    table_number: number;
    section_name: string | null;
  } | null;
  
  order_items?: {
  id: string;
  quantity: number;
  price: number;
  notes: string | null;
  products: {
    name: string;
  } | null;
}[];
};

const statusConfig: Record<
  KitchenStatus,
  {
    label: string;
    bg: string;
    color: string;
    border: string;
  }
> = {
  preparing: {
    label: "جاري التحضير",
    bg: "rgba(255,248,240,0.08)",
    color: "#FFF8F0",
    border: "rgba(200,182,164,0.24)",
  },
  ready: {
    label: "جاهز",
    bg: "rgba(63,163,108,0.14)",
    color: "#9DE7B4",
    border: "rgba(63,163,108,0.36)",
  },
  delivered: {
    label: "تم التسليم",
    bg: "rgba(200,182,164,0.10)",
    color: "#C8B6A4",
    border: "rgba(200,182,164,0.30)",
  },
};

const filters: { label: string; value: "all" | KitchenStatus }[] = [
  { label: "الكل", value: "all" },
    { label: "قيد التحضير", value: "preparing" },
  { label: "الجاهزة", value: "ready" },
  { label: "تم التسليم", value: "delivered" },
];

export default function KitchenPage() {
  const params = useParams();
  const branchId = params.id as string;

  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState<"all" | KitchenStatus>("all");
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [accessDeniedReason, setAccessDeniedReason] = useState<string | null>(
    null
  );

  const filteredOrders =
    filter === "all"
      ? orders
      : orders.filter((order) => order.status === filter);

  const preparingCount = orders.filter(
    (order) => order.status === "preparing"
  ).length;
  const readyCount = orders.filter((order) => order.status === "ready").length;
  const deliveredCount = orders.filter(
    (order) => order.status === "delivered"
  ).length;

  async function loadOrders() {
    const { data } = await supabase
      .from("orders")
      .select(`
        id,
        order_number,
        status,
        total,
        notes,
        created_at,
        table_session_id,
        tables (
          table_number,
          section_name
        ),
        order_items (
          id,
          quantity,
          price,
          notes,
          products (
            name
          )
        )
      `)
      .eq("branch_id", branchId)
      .in("status", ["preparing", "ready", "delivered"])
      .order("created_at", { ascending: false });

    setOrders((data ?? []) as unknown as Order[]);
  }

  async function updateStatus(
    order: Order,
    status: KitchenStatus
  ) {
    const now = new Date().toISOString();

    await supabase.from("orders").update({ status }).eq("id", order.id);

    if (order.table_session_id) {
      if (status === "preparing") {
        await supabase
          .from("table_sessions")
          .update({ ordered_at: now })
          .eq("id", order.table_session_id)
          .is("ordered_at", null);
      }

      if (status === "ready") {
        await supabase
          .from("table_sessions")
          .update({ ready_at: now })
          .eq("id", order.table_session_id)
          .is("ready_at", null);
      }

      if (status === "delivered") {
        await supabase
          .from("table_sessions")
          .update({ delivered_at: now })
          .eq("id", order.table_session_id)
          .is("delivered_at", null);
      }
    }

    await loadOrders();
  }

  useEffect(() => {
    let mounted = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function initKitchen() {
      setCheckingAccess(true);
      setAccessDeniedReason(null);

      const access = await getSubscriptionAccessByBranchId(branchId, "kitchen");

      if (!mounted) return;

      if (!access.allowed) {
        setOrders([]);
        setAccessDeniedReason(access.reason || "غير متاح في الباقة الحالية.");
        setCheckingAccess(false);
        return;
      }

      await loadOrders();

      if (!mounted) return;

      channel = supabase
        .channel(`kitchen-orders-${branchId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "orders",
            filter: `branch_id=eq.${branchId}`,
          },
          () => {
            loadOrders();
          }
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "order_items",
          },
          () => {
            loadOrders();
          }
        )
        .subscribe();

      const refreshInterval = window.setInterval(() => {
        loadOrders();
      }, 3000);

      if (mounted) {
        (window as unknown as { kitchenRefreshInterval?: number }).kitchenRefreshInterval =
          refreshInterval;
      }

      setCheckingAccess(false);
    }

    initKitchen();

    return () => {
      mounted = false;

      if (channel) {
        supabase.removeChannel(channel);
      }

      const refreshInterval = (window as unknown as {
        kitchenRefreshInterval?: number;
      }).kitchenRefreshInterval;

      if (refreshInterval) {
        window.clearInterval(refreshInterval);
      }
    };
  }, [branchId]);

  if (checkingAccess) {
    return (
      <div dir="rtl" style={pageStyle}>
        <section style={emptyStyle}>جاري التحقق من صلاحية الباقة...</section>
      </div>
    );
  }

  if (accessDeniedReason) {
    return (
      <div dir="rtl" style={pageStyle}>
        <section style={deniedCardStyle}>
          <h1 style={deniedTitleStyle}>غير متاح في الباقة الحالية</h1>
          <p style={deniedTextStyle}>{accessDeniedReason}</p>
        </section>
      </div>
    );
  }

  return (
    <div dir="rtl" style={pageStyle}>
      <section style={topBarStyle}>
        <div>
          <p style={eyebrowStyle}>تجهيز الطلبات</p>
          <h1 style={pageTitleStyle}>شاشة المطبخ</h1>
        </div>

        <div style={summaryGridStyle}>
          <SummaryBox title="نشطة" value={preparingCount + readyCount} />
          <SummaryBox title="تحضير" value={preparingCount} />
          <SummaryBox title="جاهزة" value={readyCount} />
          <SummaryBox title="مسلمة" value={deliveredCount} />
        </div>
      </section>

      <section style={filtersCardStyle}>
        <div style={filtersWrapStyle}>
          {filters.map((item) => (
            <FilterButton
              key={item.value}
              active={filter === item.value}
              onClick={() => setFilter(item.value)}
            >
              {item.label}
            </FilterButton>
          ))}
        </div>
      </section>

      {filteredOrders.length === 0 ? (
        <section style={emptyStyle}>لا توجد طلبات في هذا التصنيف</section>
      ) : (
        <section style={ordersGridStyle}>
          {filteredOrders.map((order) => {
            const status = statusConfig[order.status];
            const items = order.order_items || [];

            return (
              <article key={order.id} style={orderCardStyle}>
                <div style={orderHeaderStyle}>
                  <div>
                    <p style={tableLabelStyle}>
                      {order.tables?.section_name || "القسم الرئيسي"}
                    </p>
                    <h2 style={tableNumberStyle}>
                      طاولة {order.tables?.table_number || "غير محددة"}
                    </h2>
                  </div>

                  <div style={orderMetaStyle}>
                    <span
                      style={{
                        ...statusBadgeStyle,
                        background: status.bg,
                        color: status.color,
                        border: `1px solid ${status.border}`,
                      }}
                    >
                      {status.label}
                    </span>

                    <span style={timeStyle}>
                      {new Date(order.created_at).toLocaleTimeString("ar-SA", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>

                <div style={itemsListStyle}>
                  {items.length > 0 ? (
                    items.map((item) => (
                      <div key={item.id} style={itemRowStyle}>
                        <span style={quantityStyle}>{item.quantity}×</span>

                        <div style={{ flex: 1 }}>
                          <strong style={productNameStyle}>
                            {item.products?.name || "منتج غير معروف"}
                          </strong>

                          {item.notes && item.notes.trim() !== "" ? (
                            <div style={itemNoteStyle}>
                              📝 {item.notes}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={emptyItemsStyle}>لا توجد منتجات مرتبطة بهذا الطلب</div>
                  )}
                </div>

                {order.status === "delivered" ? (
                  <div style={archiveNoticeStyle}>
                    هذا الطلب محفوظ في الأرشيف للرجوع للملاحظات عند الحاجة.
                  </div>
                ) : null}

                {order.notes ? (
                  <div style={notesStyle}>
                    <span style={notesLabelStyle}>ملاحظات</span>
                    <p style={notesTextStyle}>{order.notes}</p>
                  </div>
                ) : null}

                {order.status !== "delivered" ? (
                  <div style={actionAreaStyle}>

                    {order.status === "preparing" ? (
                      <button
                        onClick={() => updateStatus(order, "ready")}
                        style={primaryButtonStyle}
                      >
                        جاهز
                      </button>
                    ) : null}

                    {order.status === "ready" ? (
                      <button
                        onClick={() => updateStatus(order, "delivered")}
                        style={successButtonStyle}
                      >
                        تم التسليم
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}

function SummaryBox({ title, value }: { title: string; value: number }) {
  return (
    <div style={summaryBoxStyle}>
      <span style={summaryTitleStyle}>{title}</span>
      <strong style={summaryValueStyle}>{value}</strong>
    </div>
  );
}

function FilterButton({
  children,
  active,
  onClick,
}: {
  children: ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        ...filterButtonStyle,
        border: active
          ? "1px solid rgba(198,138,61,0.72)"
          : "1px solid #4A3425",
        background: active ? "rgba(198,138,61,0.16)" : "#2A211C",
        color: active ? "#DEA54B" : "#C8B6A4",
      }}
    >
      {children}
    </button>
  );
}

const pageStyle: CSSProperties = {
  width: "100%",
  minHeight: "100vh",
  color: "#FFF8F0",
  display: "grid",
  alignContent: "start",
  gap: "10px",
};

const topBarStyle: CSSProperties = {
  background: "linear-gradient(135deg, #241B16, #1C1612)",
  border: "1px solid #4A3425",
  borderRadius: "30px",
  padding: "14px",
  boxShadow: "0 22px 70px rgba(0,0,0,0.28)",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "16px",
};

const eyebrowStyle: CSSProperties = {
  margin: "0 0 6px",
  color: "#DEA54B",
  fontWeight: 950,
  fontSize: "14px",
};

const pageTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: "34px",
  fontWeight: 950,
  color: "#FFF8F0",
};

const summaryGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(5, minmax(70px, 1fr))",
  gap: "8px",
  minWidth: "460px",
};

const summaryBoxStyle: CSSProperties = {
  borderRadius: "18px",
  border: "1px solid #4A3425",
  background: "#2A211C",
  padding: "10px 12px",
  textAlign: "center",
};

const summaryTitleStyle: CSSProperties = {
  display: "block",
  color: "#C8B6A4",
  fontSize: "13px",
  fontWeight: 900,
};

const summaryValueStyle: CSSProperties = {
  display: "block",
  marginTop: "4px",
  color: "#FFF8F0",
  fontSize: "24px",
  fontWeight: 950,
};

const filtersCardStyle: CSSProperties = {
  background: "#241B16",
  border: "1px solid #4A3425",
  borderRadius: "26px",
  padding: "10px",
  boxShadow: "0 16px 48px rgba(0,0,0,0.20)",
};

const filtersWrapStyle: CSSProperties = {
  display: "flex",
  gap: "9px",
  flexWrap: "wrap",
};

const filterButtonStyle: CSSProperties = {
  borderRadius: "999px",
  padding: "9px 15px",
  fontWeight: 950,
  cursor: "pointer",
};

const emptyStyle: CSSProperties = {
  background: "#241B16",
  border: "1px solid #4A3425",
  borderRadius: "30px",
  padding: "28px",
  textAlign: "center",
  color: "#C8B6A4",
  fontWeight: 950,
};

const deniedCardStyle: CSSProperties = {
  ...emptyStyle,
  border: "1px solid rgba(201,79,79,0.45)",
  background: "rgba(201,79,79,0.12)",
};

const deniedTitleStyle: CSSProperties = {
  margin: "0 0 12px",
  color: "#FFF8F0",
  fontSize: "24px",
  fontWeight: 950,
};

const deniedTextStyle: CSSProperties = {
  margin: 0,
  color: "#ffb4b4",
  fontWeight: 900,
  lineHeight: 1.8,
};

const ordersGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: "10px",
};

const orderCardStyle: CSSProperties = {
  background: "#241B16",
  border: "1px solid #4A3425",
  borderRadius: "30px",
  padding: "13px",
  boxShadow: "0 18px 55px rgba(0,0,0,0.24)",
  display: "flex",
  flexDirection: "column",
  minHeight: "290px",
};

const orderHeaderStyle: CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: "10px",
  paddingBottom: "10px",
  borderBottom: "1px solid rgba(74,52,37,0.9)",
};

const tableLabelStyle: CSSProperties = {
  margin: 0,
  color: "#C8B6A4",
  fontSize: "13px",
  fontWeight: 900,
};

const tableNumberStyle: CSSProperties = {
  margin: "2px 0 0",
  color: "#FFF8F0",
  fontSize: "30px",
  lineHeight: 1,
  fontWeight: 950,
};

const orderMetaStyle: CSSProperties = {
  display: "grid",
  justifyItems: "end",
  gap: "8px",
};

const statusBadgeStyle: CSSProperties = {
  borderRadius: "999px",
  padding: "8px 12px",
  fontWeight: 950,
  whiteSpace: "nowrap",
  fontSize: "13px",
};

const timeStyle: CSSProperties = {
  color: "#C8B6A4",
  fontWeight: 900,
  fontSize: "13px",
};

const itemsListStyle: CSSProperties = {
  display: "grid",
  gap: "7px",
  marginTop: "10px",
  flex: 1,
  maxHeight: "150px",
  overflowY: "auto",
};

const itemRowStyle: CSSProperties = {
  border: "1px solid rgba(74,52,37,0.95)",
  background: "#2A211C",
  borderRadius: "18px",
  padding: "9px",
  color: "#FFF8F0",
  fontWeight: 850,
  display: "flex",
  alignItems: "center",
  gap: "10px",
};

const quantityStyle: CSSProperties = {
  minWidth: "38px",
  height: "31px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "15px",
  background: "rgba(198,138,61,0.14)",
  border: "1px solid rgba(198,138,61,0.34)",
  color: "#DEA54B",
  fontWeight: 950,
  fontSize: "14px",
};

const productNameStyle: CSSProperties = {
  color: "#FFF8F0",
  fontSize: "15px",
  lineHeight: 1.4,
};

const itemNoteStyle: CSSProperties = {
  marginTop: "6px",
  color: "#F3C77E",
  fontSize: "12px",
  fontWeight: 900,
  lineHeight: 1.6,
};

const emptyItemsStyle: CSSProperties = {
  border: "1px solid rgba(74,52,37,0.95)",
  background: "#2A211C",
  borderRadius: "18px",
  padding: "10px",
  color: "#C8B6A4",
  fontWeight: 900,
};

const archiveNoticeStyle: CSSProperties = {
  marginTop: "9px",
  border: "1px solid rgba(200,182,164,0.24)",
  background: "rgba(200,182,164,0.08)",
  color: "#C8B6A4",
  borderRadius: "18px",
  padding: "10px",
  fontWeight: 900,
  fontSize: "12px",
  lineHeight: 1.7,
};

const notesStyle: CSSProperties = {
  marginTop: "9px",
  border: "1px solid rgba(198,138,61,0.38)",
  background: "rgba(198,138,61,0.11)",
  color: "#F3C77E",
  borderRadius: "18px",
  padding: "10px",
};

const notesLabelStyle: CSSProperties = {
  display: "block",
  color: "#DEA54B",
  fontSize: "12px",
  fontWeight: 950,
  marginBottom: "5px",
};

const notesTextStyle: CSSProperties = {
  margin: 0,
  color: "#FFF8F0",
  fontSize: "14px",
  fontWeight: 900,
  lineHeight: 1.7,
};

const actionAreaStyle: CSSProperties = {
  display: "grid",
  gap: "10px",
  marginTop: "10px",
};

const primaryButtonStyle: CSSProperties = {
  border: "0",
  borderRadius: "18px",
  padding: "12px",
  background: "linear-gradient(135deg, #C68A3D, #DEA54B)",
  color: "#16110E",
  fontWeight: 950,
  cursor: "pointer",
  fontSize: "14px",
};

const successButtonStyle: CSSProperties = {
  border: "1px solid rgba(63,163,108,0.44)",
  borderRadius: "18px",
  padding: "12px",
  background: "rgba(63,163,108,0.18)",
  color: "#B9F6CE",
  fontWeight: 950,
  cursor: "pointer",
  fontSize: "14px",
};
