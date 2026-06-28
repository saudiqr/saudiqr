"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type BillRequest = {
  id: string;
  created_at: string;
  table_id: string | null;
  tables: {
    id: string;
    table_number: number;
    section_name: string | null;
    current_session_id: string | null;
  } | null;
};

type OrderItem = {
  id: string;
  quantity: number;
  price: number;
  notes: string | null;
  products: {
    name: string;
  } | null;
};

type Order = {
  id: string;
  order_number: string | null;
  status: string;
  total: number;
  notes: string | null;
  created_at: string;
  table_id: string | null;
  table_session_id: string | null;
  order_items?: OrderItem[];
};

type CashierSession = {
  request: BillRequest;
  session_id: string | null;
  table_id: string | null;
  table_number: number | null;
  section_name: string;
  orders: Order[];
  total: number;
};

export default function CashierPage() {
  const params = useParams();
  const searchParams = useSearchParams();

  const branchId = params.id as string;
  const selectedTableId = searchParams.get("tableId");

  const [sessions, setSessions] = useState<CashierSession[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const visibleSessions = useMemo(() => {
    if (!selectedTableId) return sessions;

    return sessions.filter((session) => session.table_id === selectedTableId);
  }, [sessions, selectedTableId]);

  const totalAmount = visibleSessions.reduce(
    (sum, session) => sum + session.total,
    0
  );

  const totalOrders = visibleSessions.reduce(
    (sum, session) => sum + session.orders.length,
    0
  );

  async function loadCashierSessions() {
    setLoading(true);

    const { data: billRequestsData, error } = await supabase
      .from("bill_requests")
      .select(`
        id,
        created_at,
        table_id,
        tables (
          id,
          table_number,
          section_name,
          current_session_id
        )
      `)
      .eq("branch_id", branchId)
      .eq("status", "pending")
      .order("created_at", { ascending: true });

    if (error) {
      setMessage(error.message);
      setSessions([]);
      setLoading(false);
      return;
    }

    const enrichedSessions = await Promise.all(
      ((billRequestsData || []) as unknown as BillRequest[]).map(
        async (request) => {
          const sessionId = request.tables?.current_session_id || null;
          const tableId = request.table_id || request.tables?.id || null;

          let ordersQuery = supabase
            .from("orders")
            .select(`
              id,
              order_number,
              status,
              total,
              notes,
              created_at,
              table_id,
              table_session_id,
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
            .neq("status", "cancelled")
            .order("created_at", { ascending: true });

          if (sessionId) {
            ordersQuery = ordersQuery.eq("table_session_id", sessionId);
          } else if (tableId) {
            ordersQuery = ordersQuery.eq("table_id", tableId);
          }

          const { data: ordersData } = await ordersQuery;

          const orders = (ordersData || []) as unknown as Order[];
          const total = orders.reduce(
            (sum, order) => sum + Number(order.total || 0),
            0
          );

          return {
            request,
            session_id: sessionId,
            table_id: tableId,
            table_number: request.tables?.table_number || null,
            section_name: request.tables?.section_name || "القسم الرئيسي",
            orders,
            total,
          };
        }
      )
    );

    setSessions(enrichedSessions);
    setLoading(false);
  }

  async function completePayment(session: CashierSession) {
    setMessage("");

    if (session.orders.length === 0 || session.total <= 0) {
      setMessage("لا توجد طلبات فعلية على هذه الطاولة.");
      return;
    }

    const now = new Date().toISOString();

    const { error: requestError } = await supabase
      .from("bill_requests")
      .update({ status: "done" })
      .eq("id", session.request.id);

    if (requestError) {
      setMessage(requestError.message);
      return;
    }

    if (session.session_id) {
      const { error: sessionError } = await supabase
        .from("table_sessions")
        .update({
          status: "closed",
          bill_paid_at: now,
          cleaning_started_at: now,
          closed_at: now,
        })
        .eq("id", session.session_id);

      if (sessionError) {
        setMessage(sessionError.message);
        return;
      }
    }

    if (session.table_id) {
      const { error: tableError } = await supabase
        .from("tables")
        .update({
          status: "cleaning",
          current_session_id: null,
          last_activity_at: now,
        })
        .eq("id", session.table_id);

      if (tableError) {
        setMessage(tableError.message);
        return;
      }
    }

    setMessage("تمت المحاسبة وتحويل الطاولة إلى التنظيف.");
    await loadCashierSessions();
  }

  useEffect(() => {
    loadCashierSessions();

    const channel = supabase
      .channel(`cashier-bills-${branchId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bill_requests",
          filter: `branch_id=eq.${branchId}`,
        },
        () => {
          loadCashierSessions();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `branch_id=eq.${branchId}`,
        },
        () => {
          loadCashierSessions();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tables",
          filter: `branch_id=eq.${branchId}`,
        },
        () => {
          loadCashierSessions();
        }
      )
      .subscribe();

    const refreshInterval = window.setInterval(() => {
      loadCashierSessions();
    }, 3000);

    return () => {
      supabase.removeChannel(channel);
      window.clearInterval(refreshInterval);
    };
  }, [branchId]);

  return (
    <div dir="rtl" style={pageStyle}>
      <section style={heroStyle}>
        <div>
          <p style={eyebrowStyle}>المحاسبة النهائية</p>
          <h1 style={heroTitleStyle}>شاشة الكاشير</h1>
          <p style={heroTextStyle}>
            راجع طلبات الطاولة، حصّل المبلغ، ثم أنهِ الجلسة وحوّل الطاولة إلى التنظيف.
          </p>
        </div>

        <div style={heroAmountStyle}>
          <span style={heroAmountLabelStyle}>إجمالي مطلوب</span>
          <strong style={heroAmountValueStyle}>
            {formatMoney(totalAmount)}
          </strong>
        </div>
      </section>

      <section style={statsGridStyle}>
        <StatCard title="طاولات بانتظار المحاسبة" value={visibleSessions.length} />
        <StatCard title="عدد الطلبات" value={totalOrders} />
        <StatCard title="إجمالي المبالغ" value={formatMoney(totalAmount)} />
      </section>

      {message ? <div style={messageStyle}>{message}</div> : null}

      {loading ? (
        <section style={emptyStyle}>جاري تحميل بيانات الكاشير...</section>
      ) : visibleSessions.length === 0 ? (
        <section style={emptyStyle}>
          لا توجد طاولات طلبت الفاتورة حالياً.
        </section>
      ) : (
        <section style={sessionsGridStyle}>
          {visibleSessions.map((session) => (
            <article key={session.request.id} style={sessionCardStyle}>
              <div style={sessionHeaderStyle}>
                <div>
                  <h2 style={tableTitleStyle}>
                    طاولة {session.table_number || "غير محددة"}
                  </h2>
                  <p style={mutedTextStyle}>{session.section_name}</p>
                  <p style={mutedTextStyle}>
                    طلب الفاتورة:{" "}
                    {new Date(session.request.created_at).toLocaleTimeString(
                      "ar-SA",
                      {
                        hour: "2-digit",
                        minute: "2-digit",
                      }
                    )}
                  </p>
                </div>

                <span style={billingBadgeStyle}>بانتظار المحاسبة</span>
              </div>

              <div style={ordersWrapStyle}>
                {session.orders.length === 0 ? (
                  <div style={itemRowStyle}>لا توجد طلبات مرتبطة بهذه الجلسة.</div>
                ) : (
                  session.orders.map((order) => (
                    <div key={order.id} style={orderBoxStyle}>
                      <div style={orderMiniHeaderStyle}>
                        <strong>#{order.order_number || "غير محدد"}</strong>
                        <span>{formatMoney(Number(order.total || 0))}</span>
                      </div>

                      <div style={itemsWrapStyle}>
                        {(order.order_items || []).map((item) => {
                          const itemTotal =
                            Number(item.price || 0) * Number(item.quantity || 0);

                          return (
                            <div key={item.id} style={itemRowStyle}>
                              <div style={itemInfoStyle}>
                                <span style={itemQuantityStyle}>{item.quantity}×</span>
                                <div>
                                  <strong style={itemNameStyle}>
                                    {item.products?.name || "منتج غير معروف"}
                                  </strong>
                                  {item.notes ? (
                                    <p style={itemNoteStyle}>ملاحظة: {item.notes}</p>
                                  ) : null}
                                </div>
                              </div>

                              <span style={itemPriceStyle}>
                                {formatMoney(itemTotal)}
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      {order.notes ? (
                        <div style={notesStyle}>ملاحظات الطلب: {order.notes}</div>
                      ) : null}
                    </div>
                  ))
                )}
              </div>

              <div style={totalBoxStyle}>
                <span>الإجمالي النهائي</span>
                <strong>{formatMoney(session.total)}</strong>
              </div>

              <button
                onClick={() => completePayment(session)}
                disabled={session.orders.length === 0 || session.total <= 0}
                style={{
                  ...primaryButtonStyle,
                  opacity: session.orders.length === 0 || session.total <= 0 ? 0.45 : 1,
                  cursor:
                    session.orders.length === 0 || session.total <= 0
                      ? "not-allowed"
                      : "pointer",
                }}
              >
                تمت المحاسبة وتحويل الطاولة للتنظيف
              </button>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}

function StatCard({
  title,
  value,
}: {
  title: string;
  value: number | string;
}) {
  return (
    <div style={statCardStyle}>
      <p style={statTitleStyle}>{title}</p>
      <strong style={statValueStyle}>{value}</strong>
    </div>
  );
}

function formatMoney(value: number) {
  return `${Number(value || 0).toFixed(2)} ريال`;
}

const pageStyle: React.CSSProperties = {
  width: "100%",
  minHeight: "100vh",
  color: "#FFF8F0",
  display: "grid",
  gap: "16px",
};

const heroStyle: React.CSSProperties = {
  background: "linear-gradient(135deg, #241B16, #1C1612)",
  border: "1px solid #4A3425",
  borderRadius: "30px",
  padding: "22px",
  boxShadow: "0 22px 70px rgba(0,0,0,0.28)",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "18px",
};

const eyebrowStyle: React.CSSProperties = {
  margin: "0 0 8px",
  color: "#DEA54B",
  fontWeight: 950,
  fontSize: "14px",
};

const heroTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "38px",
  fontWeight: 950,
  color: "#FFF8F0",
};

const heroTextStyle: React.CSSProperties = {
  margin: "10px 0 0",
  color: "#C8B6A4",
  fontWeight: 800,
  fontSize: "15px",
  lineHeight: 1.8,
};

const heroAmountStyle: React.CSSProperties = {
  minWidth: "210px",
  borderRadius: "26px",
  border: "1px solid rgba(198,138,61,0.35)",
  background: "rgba(198,138,61,0.10)",
  padding: "16px",
  textAlign: "center",
};

const heroAmountLabelStyle: React.CSSProperties = {
  display: "block",
  color: "#C8B6A4",
  fontSize: "13px",
  fontWeight: 900,
};

const heroAmountValueStyle: React.CSSProperties = {
  display: "block",
  marginTop: "8px",
  color: "#DEA54B",
  fontSize: "26px",
  fontWeight: 950,
  whiteSpace: "nowrap",
};

const statsGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: "12px",
};

const statCardStyle: React.CSSProperties = {
  background: "#241B16",
  border: "1px solid #4A3425",
  borderRadius: "28px",
  padding: "16px",
  boxShadow: "0 16px 48px rgba(0,0,0,0.22)",
};

const statTitleStyle: React.CSSProperties = {
  margin: 0,
  color: "#C8B6A4",
  fontWeight: 950,
  fontSize: "14px",
};

const statValueStyle: React.CSSProperties = {
  display: "block",
  marginTop: "8px",
  color: "#FFF8F0",
  fontWeight: 950,
  fontSize: "30px",
};

const emptyStyle: React.CSSProperties = {
  background: "#241B16",
  border: "1px solid #4A3425",
  borderRadius: "30px",
  padding: "28px",
  textAlign: "center",
  color: "#C8B6A4",
  fontWeight: 950,
};

const messageStyle: React.CSSProperties = {
  background: "rgba(198,138,61,0.12)",
  border: "1px solid rgba(198,138,61,0.35)",
  borderRadius: "18px",
  padding: "14px",
  color: "#DEA54B",
  fontWeight: 950,
};

const sessionsGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "14px",
  alignItems: "start",
};

const sessionCardStyle: React.CSSProperties = {
  background: "#241B16",
  border: "1px solid #4A3425",
  borderRadius: "30px",
  padding: "16px",
  boxShadow: "0 18px 55px rgba(0,0,0,0.24)",
  alignSelf: "start",
};

const sessionHeaderStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: "12px",
};

const tableTitleStyle: React.CSSProperties = {
  margin: 0,
  color: "#FFF8F0",
  fontSize: "28px",
  fontWeight: 950,
};

const mutedTextStyle: React.CSSProperties = {
  margin: "6px 0 0",
  color: "#C8B6A4",
  fontWeight: 850,
  fontSize: "13px",
};

const billingBadgeStyle: React.CSSProperties = {
  borderRadius: "999px",
  padding: "9px 13px",
  background: "rgba(198,138,61,0.14)",
  color: "#DEA54B",
  border: "1px solid rgba(198,138,61,0.34)",
  fontWeight: 950,
  whiteSpace: "nowrap",
  fontSize: "13px",
};

const ordersWrapStyle: React.CSSProperties = {
  display: "grid",
  gap: "12px",
  marginTop: "15px",
};

const orderBoxStyle: React.CSSProperties = {
  border: "1px solid rgba(74,52,37,0.95)",
  background: "#2A211C",
  borderRadius: "22px",
  padding: "12px",
};

const orderMiniHeaderStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "10px",
  color: "#DEA54B",
  fontWeight: 950,
  marginBottom: "10px",
};

const itemsWrapStyle: React.CSSProperties = {
  display: "grid",
  gap: "8px",
};

const itemRowStyle: React.CSSProperties = {
  border: "1px solid rgba(74,52,37,0.95)",
  background: "#241B16",
  borderRadius: "18px",
  padding: "11px",
  color: "#FFF8F0",
  fontWeight: 850,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "10px",
};

const itemInfoStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "9px",
  minWidth: 0,
};

const itemQuantityStyle: React.CSSProperties = {
  minWidth: "38px",
  height: "32px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "13px",
  background: "rgba(198,138,61,0.14)",
  border: "1px solid rgba(198,138,61,0.32)",
  color: "#DEA54B",
  fontWeight: 950,
};

const itemNameStyle: React.CSSProperties = {
  color: "#FFF8F0",
  fontSize: "15px",
};

const itemNoteStyle: React.CSSProperties = {
  margin: "5px 0 0",
  color: "#C8B6A4",
  fontSize: "12px",
  fontWeight: 800,
};

const itemPriceStyle: React.CSSProperties = {
  color: "#DEA54B",
  fontWeight: 950,
  fontSize: "14px",
  whiteSpace: "nowrap",
};

const notesStyle: React.CSSProperties = {
  marginTop: "10px",
  border: "1px solid rgba(198,138,61,0.34)",
  background: "rgba(198,138,61,0.10)",
  color: "#F3C77E",
  borderRadius: "18px",
  padding: "11px",
  fontWeight: 900,
  fontSize: "14px",
};

const totalBoxStyle: React.CSSProperties = {
  marginTop: "13px",
  borderTop: "1px solid rgba(74,52,37,0.95)",
  paddingTop: "13px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  color: "#FFF8F0",
  fontWeight: 950,
  fontSize: "18px",
};

const primaryButtonStyle: React.CSSProperties = {
  width: "100%",
  marginTop: "13px",
  border: "0",
  borderRadius: "18px",
  padding: "14px",
  background: "linear-gradient(135deg, #C68A3D, #DEA54B)",
  color: "#16110E",
  fontWeight: 950,
};
