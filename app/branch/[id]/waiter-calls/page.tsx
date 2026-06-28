"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { playSound } from "@/lib/playSound";
import { supabase } from "@/lib/supabase";

type WaiterCallStatus = "pending" | "done";

type WaiterCall = {
  id: string;
  status: WaiterCallStatus;
  created_at: string;
  tables: {
    table_number: number;
    section_name: string | null;
  } | null;
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

export default function WaiterCallsPage() {
  const params = useParams();
  const branchId = params.id as string;

  const [calls, setCalls] = useState<WaiterCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const playedIds = useRef(new Set<string>());

  const pendingCount = calls.length;
  const sectionsWithCalls = new Set(
    calls.map((call) => call.tables?.section_name?.trim() || "القسم الرئيسي")
  ).size;

  const newestCallMinutes = calls.length
    ? getWaitingMinutes(calls[0].created_at)
    : 0;

  const averageWaitingMinutes = calls.length
    ? Math.round(
        calls.reduce((sum, call) => sum + getWaitingMinutes(call.created_at), 0) /
          calls.length
      )
    : 0;

  const sectionSummaries = calls.reduce<SectionSummary[]>((sections, call) => {
    const sectionName = call.tables?.section_name?.trim() || "القسم الرئيسي";
    const existing = sections.find((section) => section.name === sectionName);

    if (!existing) {
      sections.push({
        name: sectionName,
        total: 1,
        averageWaitingMinutes: getWaitingMinutes(call.created_at),
      });

      return sections;
    }

    existing.total += 1;
    existing.averageWaitingMinutes = Math.round(
      calls
        .filter(
          (item) =>
            (item.tables?.section_name?.trim() || "القسم الرئيسي") === sectionName
        )
        .reduce((sum, item) => sum + getWaitingMinutes(item.created_at), 0) /
        existing.total
    );

    return sections;
  }, []);

  const groupedCalls = sectionSummaries.map((section) => ({
    section,
    calls: calls.filter(
      (call) =>
        (call.tables?.section_name?.trim() || "القسم الرئيسي") === section.name
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

  async function loadCalls() {
    const { data, error } = await supabase
      .from("waiter_calls")
      .select(`
        id,
        status,
        created_at,
        tables (
          table_number,
          section_name
        )
      `)
      .eq("branch_id", branchId)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) {
      setMessage(error.message);
      setCalls([]);
      setLoading(false);
      return;
    }

    setCalls((data || []) as unknown as WaiterCall[]);
    setLoading(false);
  }

  async function completeCall(callId: string) {
    setMessage("");

    const { error } = await supabase
      .from("waiter_calls")
      .update({ status: "done" })
      .eq("id", callId);

    if (error) {
      setMessage(error.message);
      return;
    }

    await loadCalls();
  }

  useEffect(() => {
    loadCalls();

    const channel = supabase
      .channel(`waiter-calls-${branchId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "waiter_calls",
          filter: `branch_id=eq.${branchId}`,
        },
        (payload) => {
          const newCall = payload.new as { id?: string };

          if (payload.eventType === "INSERT" && newCall.id) {
            if (!playedIds.current.has(newCall.id)) {
              playedIds.current.add(newCall.id);
              playSound("waiter-call");
            }
          }

          loadCalls();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [branchId]);

  if (loading) {
    return (
      <div dir="rtl" style={pageStyle}>
        <section style={heroStyle}>
          <div>
            <p style={eyebrowStyle}>SaudiQR Waiter</p>
            <h1 style={heroTitleStyle}>طلبات النادل</h1>
            <p style={heroTextStyle}>جاري تحميل طلبات النادل...</p>
          </div>

          <div style={liveBadgeStyle}>Realtime</div>
        </section>
      </div>
    );
  }

  return (
    <div dir="rtl" style={pageStyle}>
      <section style={heroStyle}>
        <div>
          <p style={eyebrowStyle}>SaudiQR Waiter</p>
          <h1 style={heroTitleStyle}>طلبات النادل</h1>
          <p style={heroTextStyle}>
            تابع طلبات النادل حسب القسم، واعرف سرعة الاستجابة لكل طاولة.
          </p>
        </div>

      </section>

      <section style={statsGridStyle}>
        <StatCard
          title="كل الطلبات"
          value={calls.length}
          icon="🛎️"
          breakdown={getBreakdown()}
        />

        <StatCard
          title="طلبات بانتظار الخدمة"
          value={pendingCount}
          icon="🔔"
          breakdown={getBreakdown()}
        />

        <StatCard
          title="أقسام لديها طلبات"
          value={sectionsWithCalls}
          icon="📍"
          breakdown={getBreakdown()}
        />

        <StatCard
          title="أحدث طلب"
          value={calls.length ? `${newestCallMinutes} د` : "0 د"}
          icon="⚡"
          breakdown={calls.length ? [{ section: "آخر طلب", count: newestCallMinutes }] : []}
        />

        <StatCard
          title="متوسط وقت الانتظار"
          value={calls.length ? `${averageWaitingMinutes} د` : "0 د"}
          icon="⏱️"
          breakdown={getBreakdown()}
        />

        <StatCard
          title="حالة الشاشة"
          value="مباشر"
          icon="🟢"
          breakdown={[{ section: "Realtime", count: 1 }]}
        />
      </section>

      {message ? <div style={errorStyle}>{message}</div> : null}

      <section style={cardStyle}>
        <div style={sectionHeaderStyle}>
          <div>
            <h2 style={sectionTitleStyle}>طلبات النادل حسب الأقسام</h2>
            <p style={sectionSubtitleStyle}>
              كل قسم ظاهر لوحده، وكل طلب يظهر مع رقم الطاولة ومدة الانتظار.
            </p>
          </div>
        </div>

        {calls.length === 0 ? (
          <div style={emptyStyle}>لا توجد طلبات نادل حالياً.</div>
        ) : (
          <div style={sectionTablesWrapperStyle}>
            {groupedCalls.map(({ section, calls: sectionCalls }) => (
              <section key={section.name} style={sectionTablesBlockStyle}>
                <div style={sectionTablesHeaderStyle}>
                  <div>
                    <h3 style={sectionTablesTitleStyle}>{section.name}</h3>
                    <p style={sectionTablesSubtitleStyle}>
                      {section.total} طلب · متوسط الانتظار{" "}
                      {section.averageWaitingMinutes} دقيقة
                    </p>
                  </div>

                  <span style={sectionBadgeStyle}>
                    {section.total} بانتظار الخدمة
                  </span>
                </div>

                <div style={callsGridStyle}>
                  {sectionCalls.map((call) => {
                    const waitingMinutes = getWaitingMinutes(call.created_at);
                    const urgency = getUrgencyConfig(waitingMinutes);

                    return (
                      <article
                        key={call.id}
                        style={{
                          ...callCardStyle,
                          border: `1px solid ${urgency.border}`,
                        }}
                      >
                        <div style={callHeaderStyle}>
                          <div>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "10px",
                              }}
                            >
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
                                طاولة{" "}
                                {call.tables?.table_number || "غير محددة"}
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
                              📍 {call.tables?.section_name || "القسم الرئيسي"}
                            </p>

                            <p style={mutedTextStyle}>
                              ⏱️ منذ {waitingMinutes} دقيقة
                            </p>
                          </div>

                          <span style={waiterBadgeStyle}>طلب نادل</span>
                        </div>

                        <div style={noticeBoxStyle}>
                          العميل يحتاج مساعدة من الموظف.
                        </div>

                        <button
                          onClick={() => completeCall(call.id)}
                          style={greenButtonStyle}
                        >
                          ✅ تمت الخدمة
                        </button>
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

function getUrgencyConfig(minutes: number) {
  if (minutes >= 10) {
    return {
      label: "متأخر",
      bg: "rgba(239,68,68,0.14)",
      color: "#fca5a5",
      border: "rgba(239,68,68,0.34)",
      dot: "#f87171",
    };
  }

  if (minutes >= 5) {
    return {
      label: "يحتاج متابعة",
      bg: "rgba(245,158,11,0.14)",
      color: "#fde68a",
      border: "rgba(245,158,11,0.34)",
      dot: "#fbbf24",
    };
  }

  return {
    label: "جديد",
    bg: "rgba(16,185,129,0.16)",
    color: "#6ee7b7",
    border: "rgba(16,185,129,0.42)",
    dot: "#34d399",
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
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: "10px",
          }}
        >
          <div>
            <p style={{ margin: 0, color: "#a7f3d0", fontWeight: 950 }}>
              {title}
            </p>

            <strong
              style={{
                display: "block",
                marginTop: "10px",
                color: "#ffffff",
                fontWeight: 950,
                fontSize: "34px",
              }}
            >
              {value}
            </strong>
          </div>

          <div style={statIconStyle}>{icon}</div>
        </div>

        {breakdown.length > 0 ? (
          <div style={statBreakdownStyle}>
            {breakdown.slice(0, 4).map((item) => (
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
  minHeight: "170px",
  color: "#e5e7eb",
  display: "grid",
  gap: "24px",
};

const heroStyle: React.CSSProperties = {
  background:
    "linear-gradient(135deg, rgba(6,78,59,0.98), rgba(6,20,15,0.98))",
  border: "1px solid rgba(16,185,129,0.42)",
  borderRadius: "28px",
  padding: "28px",
  boxShadow: "0 22px 45px rgba(0,0,0,0.28)",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "18px",
};

const eyebrowStyle: React.CSSProperties = {
  margin: "0 0 10px",
  color: "#6ee7b7",
  fontWeight: 900,
  fontSize: "15px",
};

const heroTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "38px",
  fontWeight: 950,
  color: "#ffffff",
};

const heroTextStyle: React.CSSProperties = {
  margin: "12px 0 0",
  color: "#d1fae5",
  fontWeight: 800,
  fontSize: "16px",
  lineHeight: 1.8,
};

const liveBadgeStyle: React.CSSProperties = {
  borderRadius: "999px",
  padding: "12px 16px",
  background: "rgba(16,185,129,0.16)",
  color: "#6ee7b7",
  border: "1px solid rgba(16,185,129,0.28)",
  fontWeight: 950,
};

const statsGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
  gap: "14px",
};

const statCardStyle: React.CSSProperties = {
  background:
    "linear-gradient(135deg, rgba(6,78,59,0.98), rgba(9,40,30,0.98))",
  border: "1px solid rgba(16,185,129,0.38)",
  borderRadius: "24px",
  padding: "18px",
  boxShadow: "0 18px 38px rgba(0,0,0,0.25)",
  minHeight: "120px",
};

const statBreakdownStyle: React.CSSProperties = {
  display: "grid",
  gap: "7px",
  marginTop: "14px",
  borderTop: "1px solid rgba(16,185,129,0.18)",
  paddingTop: "12px",
};

const statBreakdownLineStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "8px",
  color: "#d1fae5",
  fontWeight: 850,
  fontSize: "12px",
};

const statIconStyle: React.CSSProperties = {
  width: "48px",
  height: "48px",
  borderRadius: "16px",
  background: "rgba(16,185,129,0.16)",
  border: "1px solid rgba(16,185,129,0.22)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "26px",
  flexShrink: 0,
};

const cardStyle: React.CSSProperties = {
  background:
    "linear-gradient(135deg, rgba(8,47,35,0.98), rgba(6,20,15,0.98))",
  border: "1px solid rgba(16,185,129,0.38)",
  borderRadius: "28px",
  padding: "24px",
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
  color: "#ffffff",
};

const sectionSubtitleStyle: React.CSSProperties = {
  margin: "8px 0 0",
  color: "#a7f3d0",
  fontWeight: 800,
  fontSize: "14px",
  lineHeight: 1.8,
};

const errorStyle: React.CSSProperties = {
  border: "1px solid rgba(239,68,68,0.35)",
  background: "rgba(239,68,68,0.14)",
  color: "#fca5a5",
  borderRadius: "18px",
  padding: "14px",
  fontWeight: 900,
};

const emptyStyle: React.CSSProperties = {
  marginTop: "18px",
  border: "1px solid rgba(16,185,129,0.22)",
  background: "rgba(255,255,255,0.055)",
  color: "#d1d5db",
  borderRadius: "22px",
  padding: "22px",
  textAlign: "center",
  fontWeight: 950,
};

const sectionTablesWrapperStyle: React.CSSProperties = {
  display: "grid",
  gap: "22px",
  marginTop: "20px",
};

const sectionTablesBlockStyle: React.CSSProperties = {
  border: "1px solid rgba(16,185,129,0.24)",
  background: "rgba(255,255,255,0.035)",
  borderRadius: "26px",
  padding: "20px",
};

const sectionTablesHeaderStyle: React.CSSProperties = {
  borderBottom: "1px solid rgba(16,185,129,0.16)",
  paddingBottom: "16px",
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: "16px",
};

const sectionTablesTitleStyle: React.CSSProperties = {
  margin: 0,
  color: "#ffffff",
  fontWeight: 950,
  fontSize: "26px",
};

const sectionTablesSubtitleStyle: React.CSSProperties = {
  margin: "8px 0 0",
  color: "#a7f3d0",
  fontWeight: 850,
  fontSize: "14px",
  lineHeight: 1.8,
};

const sectionBadgeStyle: React.CSSProperties = {
  borderRadius: "999px",
  padding: "10px 14px",
  background: "rgba(59,130,246,0.16)",
  color: "#bfdbfe",
  border: "1px solid rgba(59,130,246,0.38)",
  fontWeight: 950,
  whiteSpace: "nowrap",
};

const callsGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: "16px",
  marginTop: "18px",
};

const callCardStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.055)",
  borderRadius: "24px",
  padding: "18px",
  overflow: "visible",
};

const callHeaderStyle: React.CSSProperties = {
  position: "relative",
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: "12px",
};

const tableTitleStyle: React.CSSProperties = {
  margin: 0,
  color: "#ffffff",
  fontSize: "24px",
  fontWeight: 950,
};

const mutedTextStyle: React.CSSProperties = {
  margin: "10px 0 0",
  color: "#a7f3d0",
  fontWeight: 850,
  fontSize: "13px",
};

const waiterBadgeStyle: React.CSSProperties = {
  borderRadius: "999px",
  padding: "10px 14px",
  background: "rgba(59,130,246,0.16)",
  color: "#bfdbfe",
  border: "1px solid rgba(59,130,246,0.38)",
  fontWeight: 950,
  whiteSpace: "nowrap",
};

const noticeBoxStyle: React.CSSProperties = {
  marginTop: "18px",
  border: "1px solid rgba(16,185,129,0.18)",
  background: "rgba(255,255,255,0.055)",
  borderRadius: "16px",
  padding: "14px",
  color: "#d1d5db",
  fontWeight: 900,
};

const greenButtonStyle: React.CSSProperties = {
  width: "100%",
  marginTop: "14px",
  border: "0",
  borderRadius: "16px",
  padding: "14px 18px",
  background: "linear-gradient(135deg, #10b981, #059669)",
  color: "#ffffff",
  fontWeight: 950,
  cursor: "pointer",
};
