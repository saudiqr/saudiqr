"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type BillRequestStatus = "pending" | "done";

type BillRequest = {
  id: string;
  status: BillRequestStatus;
  created_at: string;
  branch_id: string;
  table_id: string | null;
  tables: {
    id: string;
    table_number: number;
    section_name: string | null;
    current_session_id: string | null;
  } | null;
  bill_total?: number;
  order_count?: number;
};

type SectionSummary = {
  name: string;
  total: number;
  averageWaitingMinutes: number;
};

type BreakdownItem = {
  section: string;
  count: number;
};

export default function BillRequestsPage() {
  const params = useParams();
  const branchId = params.id as string;

  const [requests, setRequests] = useState<BillRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const pendingCount = requests.length;
  const totalPendingAmount = requests.reduce(
    (sum, request) => sum + Number(request.bill_total || 0),
    0
  );

  const sectionsWithRequests = new Set(
    requests.map(
      (request) => request.tables?.section_name?.trim() || "القسم الرئيسي"
    )
  ).size;

  const newestRequestMinutes = requests.length
    ? getWaitingMinutes(requests[0].created_at)
    : 0;

  const averageWaitingMinutes = requests.length
    ? Math.round(
        requests.reduce(
          (sum, request) => sum + getWaitingMinutes(request.created_at),
          0
        ) / requests.length
      )
    : 0;

  const sectionSummaries = requests.reduce<SectionSummary[]>(
    (sections, request) => {
      const sectionName =
        request.tables?.section_name?.trim() || "القسم الرئيسي";

      const existing = sections.find((section) => section.name === sectionName);

      if (!existing) {
        sections.push({
          name: sectionName,
          total: 1,
          averageWaitingMinutes: getWaitingMinutes(request.created_at),
        });

        return sections;
      }

      existing.total += 1;
      existing.averageWaitingMinutes = Math.round(
        requests
          .filter(
            (item) =>
              (item.tables?.section_name?.trim() || "القسم الرئيسي") ===
              sectionName
          )
          .reduce((sum, item) => sum + getWaitingMinutes(item.created_at), 0) /
          existing.total
      );

      return sections;
    },
    []
  );

  const groupedRequests = sectionSummaries.map((section) => ({
    section,
    requests: requests.filter(
      (request) =>
        (request.tables?.section_name?.trim() || "القسم الرئيسي") ===
        section.name
    ),
  }));

  function getBreakdown(): BreakdownItem[] {
    return sectionSummaries
      .map((section) => ({
        section: section.name,
        count: section.total,
      }))
      .filter((item) => item.count > 0);
  }

  async function getTableBillSummary(
    tableId: string | null,
    sessionId: string | null
  ) {
    if (!tableId && !sessionId) {
      return {
        total: 0,
        orderCount: 0,
      };
    }

    let query = supabase
      .from("orders")
      .select("id, total, table_session_id, table_id")
      .eq("branch_id", branchId)
      .neq("status", "cancelled");

    if (sessionId) {
      query = query.eq("table_session_id", sessionId);
    } else if (tableId) {
      query = query.eq("table_id", tableId);
    }

    const { data, error } = await query;

    if (error || !data) {
      return {
        total: 0,
        orderCount: 0,
      };
    }

    const total = data.reduce((sum, order) => sum + Number(order.total || 0), 0);

    return {
      total,
      orderCount: data.length,
    };
  }

  async function loadRequests() {
    const { data, error } = await supabase
      .from("bill_requests")
      .select(`
        id,
        status,
        created_at,
        branch_id,
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
      .order("created_at", { ascending: false });

    if (error) {
      setMessage(error.message);
      setRequests([]);
      setLoading(false);
      return;
    }

    const enrichedRequests = await Promise.all(
      ((data || []) as unknown as BillRequest[]).map(async (request) => {
        const summary = await getTableBillSummary(
          request.table_id || request.tables?.id || null,
          request.tables?.current_session_id || null
        );

        return {
          ...request,
          bill_total: summary.total,
          order_count: summary.orderCount,
        };
      })
    );

    setRequests(enrichedRequests);
    setLoading(false);
  }

  useEffect(() => {
    loadRequests();

    const channel = supabase
      .channel(`bill-requests-${branchId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bill_requests",
          filter: `branch_id=eq.${branchId}`,
        },
        () => {
          loadRequests();
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
          loadRequests();
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
          loadRequests();
        }
      )
      .subscribe();

    const refreshInterval = window.setInterval(() => {
      loadRequests();
    }, 3000);

    return () => {
      supabase.removeChannel(channel);
      window.clearInterval(refreshInterval);
    };
  }, [branchId]);

  if (loading) {
    return (
      <div dir="rtl" style={pageStyle}>
        <section style={heroStyle}>
          <div>
            <p style={eyebrowStyle}>تنبيهات الفواتير</p>
            <h1 style={heroTitleStyle}>طلبات الفاتورة</h1>
            <p style={heroTextStyle}>جاري تحميل طلبات الفاتورة...</p>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div dir="rtl" style={pageStyle}>
      <section style={heroStyle}>
        <div>
          <p style={eyebrowStyle}>تنبيهات الفواتير</p>
          <h1 style={heroTitleStyle}>طلبات الفاتورة</h1>
          <p style={heroTextStyle}>
            هذه الصفحة للتنبيه فقط. المحاسبة وإنهاء الجلسة تتم من شاشة الكاشير.
          </p>
        </div>

        <div style={heroAmountStyle}>
          <span>إجمالي الطلبات</span>
          <strong>{formatMoney(totalPendingAmount)}</strong>
        </div>
      </section>

      <section style={statsGridStyle}>
        <StatCard title="طلبات الفاتورة" value={requests.length} icon="💳" breakdown={getBreakdown()} />
        <StatCard title="بانتظار الكاشير" value={pendingCount} icon="🧾" breakdown={getBreakdown()} />
        <StatCard title="إجمالي المبلغ" value={formatMoney(totalPendingAmount)} icon="﷼" breakdown={getBreakdown()} />
        <StatCard title="أقسام لديها طلبات" value={sectionsWithRequests} icon="📍" breakdown={getBreakdown()} />
        <StatCard title="أحدث طلب" value={requests.length ? `${newestRequestMinutes} د` : "0 د"} icon="⚡" breakdown={requests.length ? [{ section: "آخر طلب", count: newestRequestMinutes }] : []} />
        <StatCard title="متوسط الانتظار" value={requests.length ? `${averageWaitingMinutes} د` : "0 د"} icon="⏱️" breakdown={getBreakdown()} />
      </section>

      {message ? <div style={errorStyle}>{message}</div> : null}

      <section style={cardStyle}>
        <div style={sectionHeaderStyle}>
          <div>
            <h2 style={sectionTitleStyle}>طلبات الفاتورة حسب الأقسام</h2>
            <p style={sectionSubtitleStyle}>
              اضغط فتح في الكاشير لمراجعة الطلبات وتحصيل المبلغ.
            </p>
          </div>
        </div>

        {requests.length === 0 ? (
          <div style={emptyStyle}>لا توجد طلبات فاتورة حالياً.</div>
        ) : (
          <div style={sectionTablesWrapperStyle}>
            {groupedRequests.map(({ section, requests: sectionRequests }) => (
              <section key={section.name} style={sectionTablesBlockStyle}>
                <div style={sectionTablesHeaderStyle}>
                  <div>
                    <h3 style={sectionTablesTitleStyle}>{section.name}</h3>
                    <p style={sectionTablesSubtitleStyle}>
                      {section.total} طلب · متوسط الانتظار {section.averageWaitingMinutes} دقيقة
                    </p>
                  </div>

                  <span style={sectionBadgeStyle}>{section.total} بانتظار الكاشير</span>
                </div>

                <div style={requestsGridStyle}>
                  {sectionRequests.map((request) => {
                    const waitingMinutes = getWaitingMinutes(request.created_at);
                    const urgency = getUrgencyConfig(waitingMinutes);
                    const cashierUrl = `/branch/${branchId}/cashier?tableId=${
                      request.table_id || request.tables?.id || ""
                    }`;

                    return (
                      <article
                        key={request.id}
                        style={{
                          ...requestCardStyle,
                          border: `1px solid ${urgency.border}`,
                        }}
                      >
                        <div style={requestHeaderStyle}>
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                              <span
                                style={{
                                  width: "12px",
                                  height: "12px",
                                  borderRadius: "999px",
                                  background: urgency.dot,
                                  boxShadow: `0 0 12px ${urgency.dot}`,
                                }}
                              />

                              <h3 style={tableTitleStyle}>
                                طاولة {request.tables?.table_number || "غير محددة"}
                              </h3>
                            </div>

                            <span
                              style={{
                                display: "inline-flex",
                                marginTop: "12px",
                                borderRadius: "999px",
                                padding: "8px 12px",
                                background: urgency.bg,
                                color: urgency.color,
                                border: `1px solid ${urgency.border}`,
                                fontWeight: 950,
                                fontSize: "13px",
                              }}
                            >
                              {urgency.label}
                            </span>

                            <p style={mutedTextStyle}>
                              📍 {request.tables?.section_name || "القسم الرئيسي"}
                            </p>

                            <p style={mutedTextStyle}>⏱️ منذ {waitingMinutes} دقيقة</p>
                          </div>

                          <span style={billBadgeStyle}>طلب فاتورة</span>
                        </div>

                        <div style={amountBoxStyle}>
                          <span>قيمة الفاتورة</span>
                          <strong>{formatMoney(request.bill_total || 0)}</strong>
                          <small>{request.order_count || 0} طلب</small>
                        </div>

                        <div style={noticeBoxStyle}>
                          العميل طلب الحساب. راجع الطلب من شاشة الكاشير.
                        </div>

                        <Link href={cashierUrl} style={goldLinkStyle}>
                          فتح في الكاشير
                        </Link>
                      </article>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function getWaitingMinutes(date: string) {
  return Math.max(1, Math.floor((Date.now() - new Date(date).getTime()) / 60000));
}

function formatMoney(value: number) {
  return `${Number(value || 0).toFixed(2)} ريال`;
}

function getUrgencyConfig(minutes: number) {
  if (minutes >= 10) {
    return {
      label: "متأخر",
      bg: "rgba(201,79,79,0.14)",
      color: "#ffb4b4",
      border: "rgba(201,79,79,0.36)",
      dot: "#C94F4F",
    };
  }

  if (minutes >= 5) {
    return {
      label: "يحتاج متابعة",
      bg: "rgba(198,138,61,0.14)",
      color: "#DEA54B",
      border: "rgba(198,138,61,0.36)",
      dot: "#DEA54B",
    };
  }

  return {
    label: "جديد",
    bg: "rgba(63,163,108,0.15)",
    color: "#B9F6CE",
    border: "rgba(63,163,108,0.34)",
    dot: "#3FA36C",
  };
}

function StatCard({
  title,
  value,
  icon,
  breakdown,
}: {
  title: string;
  value: number | string;
  icon: string;
  breakdown: BreakdownItem[];
}) {
  return (
    <div style={statCardStyle}>
      <div style={{ width: "100%" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "10px" }}>
          <div>
            <p style={{ margin: 0, color: "#C8B6A4", fontWeight: 950 }}>{title}</p>
            <strong style={{ display: "block", marginTop: "10px", color: "#FFF8F0", fontWeight: 950, fontSize: "30px" }}>
              {value}
            </strong>
          </div>
          <div style={statIconStyle}>{icon}</div>
        </div>

        {breakdown.length > 0 ? (
          <div style={statBreakdownStyle}>
            {breakdown.slice(0, 3).map((item) => (
              <div key={`${title}-${item.section}`} style={statBreakdownLineStyle}>
                <span>{item.section}</span>
                <strong>{item.count}</strong>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  width: "100%",
  minHeight: "120px",
  color: "#FFF8F0",
  display: "grid",
  gap: "18px",
};

const heroStyle: React.CSSProperties = {
  background: "linear-gradient(135deg, #241B16, #1C1612)",
  border: "1px solid #4A3425",
  borderRadius: "30px",
  padding: "24px",
  boxShadow: "0 22px 45px rgba(0,0,0,0.28)",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "18px",
};

const eyebrowStyle: React.CSSProperties = {
  margin: "0 0 10px",
  color: "#DEA54B",
  fontWeight: 900,
  fontSize: "15px",
};

const heroTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "38px",
  fontWeight: 950,
  color: "#FFF8F0",
};

const heroTextStyle: React.CSSProperties = {
  margin: "12px 0 0",
  color: "#C8B6A4",
  fontWeight: 800,
  fontSize: "16px",
  lineHeight: 1.8,
};

const heroAmountStyle: React.CSSProperties = {
  minWidth: "210px",
  borderRadius: "24px",
  padding: "18px",
  background: "#2A211C",
  border: "1px solid #4A3425",
  textAlign: "center",
  boxShadow: "0 14px 34px rgba(0,0,0,0.22)",
};

const statsGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
  gap: "12px",
};

const statCardStyle: React.CSSProperties = {
  background: "#241B16",
  border: "1px solid #4A3425",
  borderRadius: "26px",
  padding: "16px",
  boxShadow: "0 18px 38px rgba(0,0,0,0.25)",
  minHeight: "154px",
};

const statBreakdownStyle: React.CSSProperties = {
  display: "grid",
  gap: "7px",
  marginTop: "14px",
  borderTop: "1px solid rgba(74,52,37,0.85)",
  paddingTop: "12px",
};

const statBreakdownLineStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "8px",
  color: "#C8B6A4",
  fontWeight: 850,
  fontSize: "12px",
};

const statIconStyle: React.CSSProperties = {
  width: "46px",
  height: "46px",
  borderRadius: "16px",
  background: "rgba(198,138,61,0.12)",
  border: "1px solid rgba(198,138,61,0.26)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "25px",
  flexShrink: 0,
};

const cardStyle: React.CSSProperties = {
  background: "#241B16",
  border: "1px solid #4A3425",
  borderRadius: "30px",
  padding: "22px",
  boxShadow: "0 22px 45px rgba(0,0,0,0.28)",
};

const sectionHeaderStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: "16px",
};

const sectionTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "24px",
  fontWeight: 950,
  color: "#FFF8F0",
};

const sectionSubtitleStyle: React.CSSProperties = {
  margin: "8px 0 0",
  color: "#C8B6A4",
  fontWeight: 800,
  fontSize: "14px",
  lineHeight: 1.8,
};

const errorStyle: React.CSSProperties = {
  border: "1px solid rgba(201,79,79,0.35)",
  background: "rgba(201,79,79,0.14)",
  color: "#ffb4b4",
  borderRadius: "18px",
  padding: "14px",
  fontWeight: 900,
};

const emptyStyle: React.CSSProperties = {
  marginTop: "18px",
  border: "1px solid #4A3425",
  background: "#2A211C",
  color: "#C8B6A4",
  borderRadius: "22px",
  padding: "22px",
  textAlign: "center",
  fontWeight: 950,
};

const sectionTablesWrapperStyle: React.CSSProperties = {
  display: "grid",
  gap: "20px",
  marginTop: "20px",
};

const sectionTablesBlockStyle: React.CSSProperties = {
  border: "1px solid #4A3425",
  background: "#2A211C",
  borderRadius: "28px",
  padding: "18px",
};

const sectionTablesHeaderStyle: React.CSSProperties = {
  borderBottom: "1px solid rgba(74,52,37,0.85)",
  paddingBottom: "16px",
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: "16px",
};

const sectionTablesTitleStyle: React.CSSProperties = {
  margin: 0,
  color: "#FFF8F0",
  fontWeight: 950,
  fontSize: "26px",
};

const sectionTablesSubtitleStyle: React.CSSProperties = {
  margin: "8px 0 0",
  color: "#C8B6A4",
  fontWeight: 850,
  fontSize: "14px",
  lineHeight: 1.8,
};

const sectionBadgeStyle: React.CSSProperties = {
  borderRadius: "999px",
  padding: "10px 14px",
  background: "rgba(198,138,61,0.14)",
  color: "#DEA54B",
  border: "1px solid rgba(198,138,61,0.36)",
  fontWeight: 950,
  whiteSpace: "nowrap",
};

const requestsGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: "14px",
  marginTop: "18px",
};

const requestCardStyle: React.CSSProperties = {
  background: "#241B16",
  borderRadius: "26px",
  padding: "16px",
  overflow: "visible",
};

const requestHeaderStyle: React.CSSProperties = {
  position: "relative",
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: "12px",
};

const tableTitleStyle: React.CSSProperties = {
  margin: 0,
  color: "#FFF8F0",
  fontSize: "24px",
  fontWeight: 950,
};

const mutedTextStyle: React.CSSProperties = {
  margin: "10px 0 0",
  color: "#C8B6A4",
  fontWeight: 850,
  fontSize: "13px",
};

const billBadgeStyle: React.CSSProperties = {
  borderRadius: "999px",
  padding: "10px 14px",
  background: "rgba(198,138,61,0.14)",
  color: "#DEA54B",
  border: "1px solid rgba(198,138,61,0.36)",
  fontWeight: 950,
  whiteSpace: "nowrap",
};

const amountBoxStyle: React.CSSProperties = {
  marginTop: "16px",
  border: "1px solid #4A3425",
  background: "#2A211C",
  borderRadius: "18px",
  padding: "14px",
  display: "grid",
  gap: "6px",
};

const noticeBoxStyle: React.CSSProperties = {
  marginTop: "14px",
  border: "1px solid #4A3425",
  background: "#2A211C",
  borderRadius: "16px",
  padding: "14px",
  color: "#C8B6A4",
  fontWeight: 900,
};

const goldLinkStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  marginTop: "14px",
  borderRadius: "18px",
  padding: "14px 18px",
  background: "linear-gradient(135deg, #C68A3D, #DEA54B)",
  color: "#16110E",
  fontWeight: 950,
  textAlign: "center",
  textDecoration: "none",
  boxSizing: "border-box",
};
