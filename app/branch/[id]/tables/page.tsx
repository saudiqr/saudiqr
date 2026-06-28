"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type TableStatus = "available" | "occupied" | "billing" | "cleaning" | "closed";

type Table = {
  id: string;
  table_number: number;
  section_name: string | null;
  status: TableStatus | null;
  current_session_id: string | null;
  occupied_since: string | null;
};

type Branch = {
  id: string;
  slug: string;
};

type SectionSummary = {
  name: string;
  total: number;
  available: number;
  occupied: number;
  billing: number;
  cleaning: number;
  closed: number;
};

type StatusBreakdown = {
  section: string;
  count: number;
};

const statusConfig: Record<
  TableStatus,
  {
    label: string;
    bg: string;
    color: string;
    border: string;
    dot: string;
  }
> = {
  available: {
    label: "متاحة",
    bg: "rgba(198,138,61,0.14)",
    color: "#DEA54B",
    border: "#4A3425",
    dot: "#34d399",
  },
  occupied: {
    label: "مشغولة",
    bg: "rgba(239,68,68,0.14)",
    color: "#fca5a5",
    border: "rgba(239,68,68,0.34)",
    dot: "#f87171",
  },
  billing: {
    label: "بانتظار الحساب",
    bg: "rgba(245,158,11,0.14)",
    color: "#fde68a",
    border: "rgba(245,158,11,0.34)",
    dot: "#fbbf24",
  },
  cleaning: {
  label: "تحتاج تنظيف",
  bg: "rgba(0,0,0,0.18)",
  color: "#C8B6A4",
  border: "#4A3425",
  dot: "#000000",
},
  closed: {
    label: "مغلقة",
    bg: "rgba(239,68,68,0.16)",
    color: "#fca5a5",
    border: "rgba(239,68,68,0.42)",
    dot: "#ef4444",
  },
};

export default function TablesPage() {
  const params = useParams();
  const branchId = params.id as string;

  const [tables, setTables] = useState<Table[]>([]);
  const [branch, setBranch] = useState<Branch | null>(null);
  const [tableNumber, setTableNumber] = useState("");
  const [sectionName, setSectionName] = useState("القسم الرئيسي");
  const [errorMessage, setErrorMessage] = useState("");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const availableCount = tables.filter(
    (table) => (table.status || "available") === "available"
  ).length;
  const occupiedCount = tables.filter((table) => table.status === "occupied").length;
  const billingCount = tables.filter((table) => table.status === "billing").length;
  const cleaningCount = tables.filter((table) => table.status === "cleaning").length;
  const closedCount = tables.filter((table) => table.status === "closed").length;

  const sectionSummaries = tables.reduce<SectionSummary[]>((sections, table) => {
    const sectionNameValue = table.section_name?.trim() || "القسم الرئيسي";
    const status = table.status || "available";
    const existing = sections.find((section) => section.name === sectionNameValue);

    if (!existing) {
      sections.push({
        name: sectionNameValue,
        total: 1,
        available: status === "available" ? 1 : 0,
        occupied: status === "occupied" ? 1 : 0,
        billing: status === "billing" ? 1 : 0,
        cleaning: status === "cleaning" ? 1 : 0,
        closed: status === "closed" ? 1 : 0,
      });

      return sections;
    }

    existing.total += 1;
    if (status === "available") existing.available += 1;
    if (status === "occupied") existing.occupied += 1;
    if (status === "billing") existing.billing += 1;
    if (status === "cleaning") existing.cleaning += 1;
    if (status === "closed") existing.closed += 1;

    return sections;
  }, []);

  const groupedTables = sectionSummaries.map((section) => ({
    section,
    tables: tables.filter(
      (table) => (table.section_name?.trim() || "القسم الرئيسي") === section.name
    ),
  }));

  function getBreakdown(status?: TableStatus): StatusBreakdown[] {
    return sectionSummaries
      .map((section) => {
        let count = section.total;

        if (status === "available") count = section.available;
        if (status === "occupied") count = section.occupied;
        if (status === "billing") count = section.billing;
        if (status === "cleaning") count = section.cleaning;
        if (status === "closed") count = section.closed;

        return { section: section.name, count };
      })
      .filter((item) => item.count > 0);
  }

  async function loadData() {
    const { data: branchData } = await supabase
      .from("branches")
      .select("id, slug")
      .eq("id", branchId)
      .single();

    setBranch(branchData);

    const { data, error } = await supabase
      .from("tables")
      .select(`
        id,
        table_number,
        section_name,
        status,
        current_session_id,
        occupied_since
      `)
      .eq("branch_id", branchId)
      .order("table_number", { ascending: true });

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setTables((data || []) as Table[]);
  }

  async function addTable() {
    setErrorMessage("");

    if (!tableNumber) {
      setErrorMessage("اكتب رقم الطاولة.");
      return;
    }

    const { error } = await supabase.from("tables").insert({
      branch_id: branchId,
      table_number: Number(tableNumber),
      section_name: sectionName.trim() || "القسم الرئيسي",
      status: "available",
    });

    if (error) {
  if (
    error.message.includes("unique_branch_table_number") ||
    error.message.includes("duplicate key")
  ) {
    setErrorMessage("رقم الطاولة موجود مسبقًا. اختر رقم طاولة آخر.");
    return;
  }

  setErrorMessage("حدث خطأ أثناء تعديل الطاولة. حاول مرة أخرى.");
  return;
}

    setTableNumber("");
    setSectionName("القسم الرئيسي");
    await loadData();
  }

  async function updateTableStatus(table: Table, status: TableStatus) {
    setErrorMessage("");

    if (table.status === "cleaning" && status === "available") {
      setErrorMessage("الطاولة التي تحتاج تنظيف لا تتحول إلى متاحة إلا من زر إنهاء التنظيف.");
      return;
    }

    const { error } = await supabase
      .from("tables")
      .update({ status })
      .eq("id", table.id);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    await loadData();
  }

  async function finishCleaning(table: Table) {
    setErrorMessage("");

    const now = new Date().toISOString();

    if (table.current_session_id) {
      const { error: sessionError } = await supabase
        .from("table_sessions")
        .update({
          cleaning_finished_at: now,
          closed_at: now,
          status: "closed",
        })
        .eq("id", table.current_session_id);

      if (sessionError) {
        setErrorMessage(sessionError.message);
        return;
      }
    }

    const { error } = await supabase
      .from("tables")
      .update({
        status: "available",
        current_session_id: null,
        occupied_since: null,
        cleaned_at: now,
        last_activity_at: now,
      })
      .eq("id", table.id);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    await loadData();
  }

  async function renameSection(oldName: string) {
    const newName = window.prompt("اكتب اسم القسم الجديد", oldName)?.trim();

    if (!newName || newName === oldName) return;

    setErrorMessage("");

    const { error } = await supabase
      .from("tables")
      .update({ section_name: newName })
      .eq("branch_id", branchId)
      .eq("section_name", oldName);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    await loadData();
  }

  async function deleteSection(section: SectionSummary) {
    const confirmed = window.confirm(
      `سيتم حذف قسم "${section.name}" وحذف جميع الطاولات التابعة له وعددها ${section.total}. هل أنت متأكد؟`
    );

    if (!confirmed) return;

    setErrorMessage("");

    const { error } = await supabase
      .from("tables")
      .delete()
      .eq("branch_id", branchId)
      .eq("section_name", section.name);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    await loadData();
  }

  async function editTable(table: Table) {
    setOpenMenuId(null);

    const nextTableNumber = window.prompt(
      "اكتب رقم الطاولة الجديد",
      String(table.table_number)
    );

    if (!nextTableNumber) return;

    const nextSectionName = window.prompt(
      "اكتب اسم القسم",
      table.section_name || "القسم الرئيسي"
    );

    if (!nextSectionName) return;

    setErrorMessage("");

    const { error } = await supabase
      .from("tables")
      .update({
        table_number: Number(nextTableNumber),
        section_name: nextSectionName.trim() || "القسم الرئيسي",
      })
      .eq("id", table.id);

    if (error) {
  if (
    error.message.includes("unique_branch_table_number") ||
    error.message.includes("duplicate key")
  ) {
    setErrorMessage("رقم الطاولة موجود مسبقًا. اختر رقم طاولة آخر.");
    return;
  }

  setErrorMessage("حدث خطأ أثناء تعديل الطاولة. حاول مرة أخرى.");
  return;
}

    await loadData();
  }

  async function deleteTable(table: Table) {
    setOpenMenuId(null);

    const confirmed = window.confirm(`هل تريد حذف طاولة رقم ${table.table_number}؟`);

    if (!confirmed) return;

    setErrorMessage("");

    const { error } = await supabase.from("tables").delete().eq("id", table.id);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    await loadData();
  }

  function getTableMenuUrl(table: Table) {
  if (!branch) return "#";
  return `/menu/${encodeURIComponent(branch.slug)}?tableId=${table.id}`;
}

  useEffect(() => {
  loadData();

  const tablesChannel = supabase
    .channel(`tables-status-${branchId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "tables",
        filter: `branch_id=eq.${branchId}`,
      },
      () => {
        loadData();
      }
    )
    .subscribe();

  const refreshInterval = window.setInterval(() => {
    loadData();
  }, 3000);

  return () => {
    supabase.removeChannel(tablesChannel);
    window.clearInterval(refreshInterval);
  };
}, [branchId]);

  useEffect(() => {
    function closeMenu(event: MouseEvent) {
      const target = event.target as HTMLElement | null;

      if (target?.closest("[data-table-menu]")) {
        return;
      }

      setOpenMenuId(null);
    }

    document.addEventListener("mousedown", closeMenu);

    return () => {
      document.removeEventListener("mousedown", closeMenu);
    };
  }, []);

  return (
    <div dir="rtl" style={pageStyle}>
      <section style={heroStyle}>
        <div>
          <p style={eyebrowStyle}></p>
          <h1 style={heroTitleStyle}>إدارة الطاولات</h1>
          <p style={heroTextStyle}>
            تابع حالة الطاولات حسب القسم، وافتح رابط المنيو أو QR الخاص بكل طاولة.
          </p>
        </div>

      </section>

      <section style={statsGridStyle}>
        <StatCard
          title="كل الطاولات"
          value={tables.length}
          icon="🪑"
          breakdown={getBreakdown()}
        />
        <StatCard
          title="متاحة"
          value={availableCount}
          icon="🟢"
          breakdown={getBreakdown("available")}
        />
        <StatCard
          title="مشغولة"
          value={occupiedCount}
          icon="🔴"
          breakdown={getBreakdown("occupied")}
        />
        <StatCard
          title="بانتظار الحساب"
          value={billingCount}
          icon="🟡"
          breakdown={getBreakdown("billing")}
        />
        <StatCard
          title="تحتاج تنظيف"
          value={cleaningCount}
          icon="🧹"
          breakdown={getBreakdown("cleaning")}
        />
        <StatCard
          title="مغلقة"
          value={closedCount}
          icon="🔒"
          breakdown={getBreakdown("closed")}
        />
      </section>

      {errorMessage ? <div style={errorStyle}>{errorMessage}</div> : null}

      <section style={cardStyle}>
        <div style={sectionHeaderStyle}>
          <div>
            <h2 style={sectionTitleStyle}>خريطة الطاولات</h2>
            <p style={sectionSubtitleStyle}>
              كل قسم ظاهر لوحده، وكل 4 طاولات تظهر بجانب بعض.
            </p>
          </div>
        </div>

        {tables.length === 0 ? (
          <div style={emptyStyle}>لا توجد طاولات حتى الآن.</div>
        ) : (
          <div style={sectionTablesWrapperStyle}>
            {groupedTables.map(({ section, tables: sectionTables }) => (
              <section key={section.name} style={sectionTablesBlockStyle}>
                <div style={sectionTablesHeaderStyle}>
                  <div>
                    <h3 style={sectionTablesTitleStyle}>{section.name}</h3>
                    <p style={sectionTablesSubtitleStyle}>
                      {section.total} طاولة · متاح {section.available} · مشغول {section.occupied} · تنظيف {section.cleaning} · بانتظار الحساب {section.billing} · مغلق {section.closed}
                    </p>
                  </div>

                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    <button onClick={() => renameSection(section.name)} style={smallActionButtonStyle}>
                      تعديل القسم
                    </button>
                    <button onClick={() => deleteSection(section)} style={smallDangerButtonStyle}>
                      حذف القسم
                    </button>
                  </div>
                </div>

                <div style={tablesGridStyle}>
                  {sectionTables.map((table) => {
                    const tableUrl = getTableMenuUrl(table);
                    const status = table.status || "available";
                    const config = statusConfig[status];
                    let occupiedMinutes = 0;

                    if (table.occupied_since) {
                      occupiedMinutes = Math.floor(
                        (Date.now() - new Date(table.occupied_since).getTime()) / 60000
                      );
                    }

                    return (
                      <article
                        key={table.id}
                        style={{
                          ...tableCardStyle,
                          border: `1px solid ${config.border}`,
                        }}
                      >
                        <div style={tableHeaderStyle}>
                          <button
                            data-table-menu="true"
                            onMouseDown={(event) => {
                              event.stopPropagation();
                            }}
                            onClick={(event) => {
                              event.stopPropagation();
                              setOpenMenuId((current) =>
                                current === table.id ? null : table.id
                              );
                            }}
                            style={threeDotsButtonStyle}
                            aria-label="خيارات الطاولة"
                            type="button"
                          >
                            ⋮
                          </button>

                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                              <span
                                style={{
                                  width: "12px",
                                  height: "12px",
                                  borderRadius: "999px",
                                  background: config.dot,
                                  boxShadow:
  config.dot === "#000000"
    ? "0 0 0 2px rgba(255,255,255,0.15)"
    : `0 0 12px ${config.dot}`,
                                }}
                              />
                              <h3 style={tableTitleStyle}>طاولة {table.table_number}</h3>
                            </div>

                            <span
                              style={{
                                display: "inline-flex",
                                marginTop: "12px",
                                borderRadius: "999px",
                                padding: "8px 12px",
                                background: config.bg,
                                color: config.color,
                                border: `1px solid ${config.border}`,
                                fontWeight: 950,
                                fontSize: "13px",
                              }}
                            >
                              {config.label}
                            </span>

                            {table.occupied_since ? (
                              <p style={mutedTextStyle}>
                                ⏱️ مدة الإشغال: {occupiedMinutes} دقيقة
                              </p>
                            ) : null}
                          </div>

                          {openMenuId === table.id ? (
                            <div
                              data-table-menu="true"
                              onMouseDown={(event) => {
                                event.stopPropagation();
                              }}
                              onClick={(event) => event.stopPropagation()}
                              style={tableMenuStyle}
                            >
                              <button
                                onClick={() => editTable(table)}
                                style={tableMenuButtonStyle}
                              >
                                تعديل الطاولة
                              </button>

                              <button
                                onClick={() => deleteTable(table)}
                                style={tableMenuDangerButtonStyle}
                              >
                                حذف الطاولة
                              </button>
                            </div>
                          ) : null}
                        </div>

                        <div style={statusButtonsGridStyle}>
                          <StatusButton
                            label="متاحة"
                            onClick={() => updateTableStatus(table, "available")}
                            color="#DEA54B"
                            border="rgba(16,185,129,0.35)"
                            bg="rgba(16,185,129,0.12)"
                          />

                          <StatusButton
                            label="مشغولة"
                            onClick={() => updateTableStatus(table, "occupied")}
                            color="#fca5a5"
                            border="rgba(239,68,68,0.3)"
                            bg="rgba(239,68,68,0.12)"
                          />

                          <StatusButton
                            label="بانتظار الحساب"
                            onClick={() => updateTableStatus(table, "billing")}
                            color="#fde68a"
                            border="rgba(245,158,11,0.3)"
                            bg="rgba(245,158,11,0.12)"
                          />

                          <StatusButton
                            label="تنظيف"
                            onClick={() => updateTableStatus(table, "cleaning")}
                            color="#C8B6A4"
                            border="#4A3425"
                            bg="rgba(16,185,129,0.10)"
                          />

                          <StatusButton
                            label="إغلاق"
                            onClick={() => updateTableStatus(table, "closed")}
                            color="#fca5a5"
                            border="rgba(239,68,68,0.35)"
                            bg="rgba(239,68,68,0.14)"
                          />
                        </div>

                        <div style={{ display: "grid", gap: "10px", marginTop: "16px" }}>
                          {table.status === "cleaning" ? (
                            <button
                              onClick={() => finishCleaning(table)}
                              style={greenButtonStyle}
                            >
                              ✅ إنهاء التنظيف
                            </button>
                          ) : null}

                          <Link href={tableUrl} style={greenLinkStyle}>
                            فتح منيو الطاولة
                          </Link>

                          <Link
                            href={`/branch/${branchId}/tables/${table.id}/qr`}
                            style={secondaryLinkStyle}
                          >
                            QR الطاولة
                          </Link>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </section>

      <section style={addTableCardStyle}>
        <div style={sectionHeaderStyle}>
          <div>
            <h2 style={sectionTitleStyle}>إضافة طاولة جديدة</h2>
            <p style={sectionSubtitleStyle}>
              هذا القسم للاستخدام عند إضافة طاولات جديدة فقط، وليس للتشغيل اليومي.
            </p>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr auto",
            gap: "14px",
            marginTop: "20px",
          }}
        >
          <input
            value={tableNumber}
            onChange={(event) => setTableNumber(event.target.value)}
            placeholder="رقم الطاولة"
            type="number"
            style={inputStyle}
          />

          <input
            value={sectionName}
            onChange={(event) => setSectionName(event.target.value)}
            placeholder="اسم القسم: العوائل - الشباب - VIP"
            style={inputStyle}
          />

          <button onClick={addTable} style={greenButtonStyle}>
            + إضافة طاولة
          </button>
        </div>
      </section>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  breakdown,
}: {
  title: string;
  value: number;
  icon: string;
  breakdown: StatusBreakdown[];
}) {
  return (
    <div style={statCardStyle}>
      <div style={{ width: "100%" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "10px" }}>
          <div>
            <p style={{ margin: 0, color: "#C8B6A4", fontWeight: 950 }}>
              {title}
            </p>

            <strong
              style={{
                display: "block",
                marginTop: "10px",
                color: "#FFF8F0",
                fontWeight: 950,
                fontSize: "36px",
              }}
            >
              {value}
            </strong>
          </div>

          <div style={statIconStyle}>{icon}</div>
        </div>

        {breakdown.length > 0 ? (
          <div style={statBreakdownStyle}>
            {breakdown.map((item) => (
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

function StatusButton({
  label,
  onClick,
  color,
  border,
  bg,
}: {
  label: string;
  onClick: () => void;
  color: string;
  border: string;
  bg: string;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        border: `1px solid ${border}`,
        background: bg,
        color,
        borderRadius: "14px",
        padding: "10px 8px",
        fontWeight: 950,
        cursor: "pointer",
        fontSize: "12px",
      }}
    >
      {label}
    </button>
  );
}

const pageStyle: React.CSSProperties = {
  width: "100%",
  minHeight: "120px",
  color: "#e5e7eb",
  display: "grid",
  gap: "24px",
};

const heroStyle: React.CSSProperties = {
  background:
    "linear-gradient(135deg, #241B16, #16110E)",
  border: "1px solid #4A3425",
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

const liveBadgeStyle: React.CSSProperties = {
  borderRadius: "999px",
  padding: "12px 16px",
  background: "rgba(198,138,61,0.14)",
  color: "#DEA54B",
  border: "1px solid #4A3425",
  fontWeight: 950,
};

const statsGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
  gap: "14px",
};

const statCardStyle: React.CSSProperties = {
  background:
    "linear-gradient(135deg, #241B16, #2A211C)",
  border: "1px solid #4A3425",
  borderRadius: "24px",
  padding: "18px",
  boxShadow: "0 18px 38px rgba(0,0,0,0.25)",
  minHeight: "168px",
};

const statBreakdownStyle: React.CSSProperties = {
  display: "grid",
  gap: "7px",
  marginTop: "14px",
  borderTop: "1px solid #4A3425",
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
  width: "48px",
  height: "48px",
  borderRadius: "16px",
  background: "rgba(198,138,61,0.14)",
  border: "1px solid #4A3425",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "26px",
  flexShrink: 0,
};

const cardStyle: React.CSSProperties = {
  background:
    "linear-gradient(135deg, #241B16, #16110E)",
  border: "1px solid #4A3425",
  borderRadius: "28px",
  padding: "24px",
  boxShadow: "0 22px 45px rgba(0,0,0,0.28)",
};

const addTableCardStyle: React.CSSProperties = {
  ...cardStyle,
  opacity: 0.96,
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

const inputStyle: React.CSSProperties = {
  width: "100%",
  border: "1px solid #4A3425",
  borderRadius: "18px",
  padding: "16px",
  outline: "none",
  background: "#2A211C",
color: "#FFF8F0",
  fontWeight: 850,
  fontSize: "15px",
  boxSizing: "border-box",
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
  border: "1px solid #4A3425",
  background: "rgba(255,255,255,0.055)",
  color: "#C8B6A4",
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
  border: "1px solid #4A3425",
  background: "rgba(255,255,255,0.035)",
  borderRadius: "26px",
  padding: "20px",
};

const sectionTablesHeaderStyle: React.CSSProperties = {
  borderBottom: "1px solid rgba(198,138,61,0.14)",
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

const tablesGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: "16px",
  marginTop: "18px",
};

const tableCardStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.055)",
  borderRadius: "24px",
  padding: "18px",
  overflow: "visible",
};

const tableHeaderStyle: React.CSSProperties = {
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

const threeDotsButtonStyle: React.CSSProperties = {
  position: "absolute",
  left: 0,
  top: 0,
  border: "1px solid #4A3425",
  background: "rgba(255,255,255,0.055)",
  color: "#C8B6A4",
  borderRadius: "14px",
  width: "38px",
  height: "38px",
  fontSize: "24px",
  fontWeight: 950,
  cursor: "pointer",
  lineHeight: 1,
};

const tableMenuStyle: React.CSSProperties = {
  position: "absolute",
  top: "44px",
  left: 0,
  zIndex: 9999,
  minWidth: "160px",
  overflow: "hidden",
  borderRadius: "16px",
  border: "1px solid #4A3425",
  background: "#06140f",
  boxShadow: "0 18px 35px rgba(0,0,0,0.36)",
};

const tableMenuButtonStyle: React.CSSProperties = {
  width: "100%",
  border: "0",
  background: "transparent",
  color: "#DEA54B",
  padding: "13px 14px",
  fontWeight: 950,
  cursor: "pointer",
  textAlign: "right",
};

const tableMenuDangerButtonStyle: React.CSSProperties = {
  width: "100%",
  border: "0",
  borderTop: "1px solid rgba(255,255,255,0.08)",
  background: "transparent",
  color: "#fca5a5",
  padding: "13px 14px",
  fontWeight: 950,
  cursor: "pointer",
  textAlign: "right",
};

const statusButtonsGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "8px",
  marginTop: "18px",
};

const greenButtonStyle: React.CSSProperties = {
  border: "0",
  borderRadius: "16px",
  padding: "14px 18px",
  background: "linear-gradient(135deg, #C68A3D, #DEA54B)",
  color: "#FFF8F0",
  fontWeight: 950,
  cursor: "pointer",
};

const smallActionButtonStyle: React.CSSProperties = {
  border: "1px solid #4A3425",
  borderRadius: "14px",
  padding: "10px 12px",
  background: "rgba(16,185,129,0.12)",
  color: "#DEA54B",
  fontWeight: 950,
  cursor: "pointer",
};

const smallDangerButtonStyle: React.CSSProperties = {
  border: "1px solid rgba(239,68,68,0.32)",
  borderRadius: "14px",
  padding: "10px 12px",
  background: "rgba(239,68,68,0.12)",
  color: "#fca5a5",
  fontWeight: 950,
  cursor: "pointer",
};

const greenLinkStyle: React.CSSProperties = {
  display: "block",
  textAlign: "center",
  textDecoration: "none",
  border: "0",
  borderRadius: "16px",
  padding: "14px 18px",
  background: "linear-gradient(135deg, #C68A3D, #DEA54B)",
  color: "#FFF8F0",
  fontWeight: 950,
};

const secondaryLinkStyle: React.CSSProperties = {
  display: "block",
  textAlign: "center",
  textDecoration: "none",
  border: "1px solid #4A3425",
  borderRadius: "16px",
  padding: "14px 18px",
  background: "rgba(255,255,255,0.055)",
  color: "#C8B6A4",
  fontWeight: 950,
};
