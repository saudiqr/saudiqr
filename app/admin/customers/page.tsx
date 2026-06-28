import Link from "next/link";
import { supabase } from "@/lib/supabase";

type BusinessRow = {
  id: string;
  name: string;
  created_at: string | null;
  branches:
    | {
        id: string;
        name: string | null;
      }[]
    | null;
  subscriptions:
    | {
        id: string;
        status: "trial" | "active" | "expired" | "cancelled" | "past_due";
        starts_at: string | null;
        ends_at: string | null;
        amount: number | null;
        currency: string | null;
        plans:
          | {
              name: string;
              price: number;
              duration_days: number;
            }[]
          | null;
      }[]
    | null;
};

const statusLabel: Record<string, string> = {
  trial: "تجريبي",
  active: "نشط",
  expired: "منتهي",
  cancelled: "ملغي",
  past_due: "متعثر",
};

function formatDate(value: string | null) {
  if (!value) return "غير محدد";

  const date = new Date(value);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}/${month}/${day}`;
}

function daysLeft(value: string | null) {
  if (!value) return "غير محدد";

  const now = new Date();
  const end = new Date(value);
  const diff = end.getTime() - now.getTime();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

  if (days < 0) return "منتهي";
  if (days === 0) return "ينتهي اليوم";

  return `${days} يوم`;
}

function getLatestSubscription(business: BusinessRow) {
  return business.subscriptions?.[0] || null;
}

function getPlanName(business: BusinessRow) {
  const subscription = getLatestSubscription(business);
  return subscription?.plans?.[0]?.name || "بدون باقة";
}

function getSubscriptionStatus(business: BusinessRow) {
  const subscription = getLatestSubscription(business);
  return subscription?.status || "none";
}

function getStatusText(status: string) {
  if (status === "none") return "بدون اشتراك";
  return statusLabel[status] || status;
}

function getStatusStyle(status: string): React.CSSProperties {
  if (status === "active") {
    return {
      background: "rgba(16,185,129,0.16)",
      color: "#6ee7b7",
      border: "1px solid rgba(16,185,129,0.34)",
    };
  }

  if (status === "trial") {
    return {
      background: "rgba(245,158,11,0.16)",
      color: "#fde68a",
      border: "1px solid rgba(245,158,11,0.34)",
    };
  }

  if (status === "expired" || status === "cancelled" || status === "past_due") {
    return {
      background: "rgba(239,68,68,0.14)",
      color: "#fca5a5",
      border: "1px solid rgba(239,68,68,0.34)",
    };
  }

  return {
    background: "rgba(255,255,255,0.08)",
    color: "#d1d5db",
    border: "1px solid rgba(255,255,255,0.14)",
  };
}

export default async function AdminCustomersPage() {
  const { data, error } = await supabase
    .from("businesses")
    .select(
      `
      id,
      name,
      created_at,
      branches(id, name),
      subscriptions(
        id,
        status,
        starts_at,
        ends_at,
        amount,
        currency,
        plans(name, price, duration_days)
      )
    `
    )
    .order("created_at", { ascending: false });

  const customers = (data || []) as BusinessRow[];

  const activeCount = customers.filter(
    (customer) => getSubscriptionStatus(customer) === "active"
  ).length;

  const trialCount = customers.filter(
    (customer) => getSubscriptionStatus(customer) === "trial"
  ).length;

  const inactiveCount = customers.filter((customer) =>
    ["expired", "cancelled", "past_due", "none"].includes(
      getSubscriptionStatus(customer)
    )
  ).length;

  const branchesCount = customers.reduce(
    (sum, customer) => sum + (customer.branches?.length || 0),
    0
  );

  return (
    <main dir="rtl" style={pageStyle}>
      <section style={topBarStyle}>
        <div>
          <p style={eyebrowStyle}>SaudiQR Admin</p>
          <h1 style={pageTitleStyle}>عملاء المنصة</h1>
          <p style={pageSubtitleStyle}>
            متابعة أصحاب النشاطات، عدد الفروع، حالة الاشتراك، والباقات المرتبطة.
          </p>
        </div>

        <span style={topBadgeStyle}>{customers.length} عميل</span>
      </section>

      <section style={statsGridStyle}>
        <StatCard title="كل العملاء" value={customers.length} />
        <StatCard title="اشتراكات نشطة" value={activeCount} />
        <StatCard title="تجريبية" value={trialCount} />
        <StatCard title="غير نشطة" value={inactiveCount} />
        <StatCard title="إجمالي الفروع" value={branchesCount} />
      </section>

      <section style={toolbarStyle}>
        <div>
          <h2 style={toolbarTitleStyle}>قائمة العملاء</h2>
          <p style={toolbarTextStyle}>
            كل كرت يمثل نشاط واحد داخل المنصة، ومنه تدخل لتفاصيل العميل.
          </p>
        </div>
      </section>

      {error ? (
        <div style={errorStyle}>خطأ في جلب العملاء: {error.message}</div>
      ) : null}

      {customers.length === 0 && !error ? (
        <section style={emptyStyle}>لا يوجد عملاء حتى الآن.</section>
      ) : (
        <section style={customersStackStyle}>
          {customers.map((customer) => {
            const subscription = getLatestSubscription(customer);
            const status = getSubscriptionStatus(customer);

            return (
              <article key={customer.id} style={customerCardStyle}>
                <div style={customerMainStyle}>
                  <div style={customerInfoStyle}>
                    <div style={cardHeaderStyle}>
                      <div>
                        <h2 style={customerTitleStyle}>{customer.name}</h2>
                        <p style={mutedTextStyle}>صاحب نشاط / عميل منصة</p>
                      </div>

                      <span
                        style={{
                          ...statusBadgeStyle,
                          ...getStatusStyle(status),
                        }}
                      >
                        {getStatusText(status)}
                      </span>
                    </div>

                    <div style={detailsGridStyle}>
                      <DetailItem title="عدد النشاطات" value="1" />
                      <DetailItem
                        title="عدد الفروع"
                        value={String(customer.branches?.length || 0)}
                      />
                      <DetailItem title="الباقة" value={getPlanName(customer)} />
                      <DetailItem
                        title="تاريخ التسجيل"
                        value={formatDate(customer.created_at)}
                      />
                      <DetailItem
                        title="بداية الاشتراك"
                        value={formatDate(subscription?.starts_at || null)}
                      />
                      <DetailItem
                        title="نهاية الاشتراك"
                        value={formatDate(subscription?.ends_at || null)}
                      />
                      <DetailItem
                        title="المتبقي"
                        value={daysLeft(subscription?.ends_at || null)}
                      />
                      <DetailItem
                        title="المبلغ"
                        value={`${subscription?.amount || 0} ${
                          subscription?.currency || "SAR"
                        }`}
                      />
                    </div>

                    <div style={branchesBoxStyle}>
                      <strong>الفروع</strong>

                      {customer.branches && customer.branches.length > 0 ? (
                        <div style={branchesListStyle}>
                          {customer.branches.map((branch) => (
                            <span key={branch.id} style={branchChipStyle}>
                              {branch.name || "فرع بدون اسم"}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span style={mutedSmallStyle}>لا توجد فروع مرتبطة.</span>
                      )}
                    </div>
                  </div>

                  <aside style={sidePanelStyle}>
                    <div style={sideSummaryStyle}>
                      <span>الحالة الحالية</span>
                      <strong>{getStatusText(status)}</strong>
                    </div>

                    <Link
                      href={`/admin/customers/${customer.id}`}
                      style={greenLinkButtonStyle}
                    >
                      تفاصيل العميل
                    </Link>

                    <Link href="/admin/subscriptions" style={outlineLinkButtonStyle}>
                      الاشتراكات
                    </Link>
                  </aside>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}

function StatCard({ title, value }: { title: string; value: string | number }) {
  return (
    <div style={statCardStyle}>
      <p style={statTitleStyle}>{title}</p>
      <strong style={statValueStyle}>{value}</strong>
    </div>
  );
}

function DetailItem({ title, value }: { title: string; value: string }) {
  return (
    <div style={detailItemStyle}>
      <span>{title}</span>
      <strong>{value}</strong>
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: "100%",
  background: "#06140f",
  color: "#e5e7eb",
  padding: "32px",
  display: "grid",
  gap: "22px",
  boxSizing: "border-box",
};

const topBarStyle: React.CSSProperties = {
  background:
    "linear-gradient(135deg, rgba(6,78,59,0.95), rgba(6,20,15,0.98))",
  border: "1px solid rgba(16,185,129,0.42)",
  borderRadius: "30px",
  padding: "28px",
  boxShadow: "0 24px 55px rgba(0,0,0,0.32)",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "18px",
};

const eyebrowStyle: React.CSSProperties = {
  margin: "0 0 10px",
  color: "#6ee7b7",
  fontWeight: 950,
  fontSize: "14px",
};

const pageTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "38px",
  fontWeight: 950,
  color: "#ffffff",
};

const pageSubtitleStyle: React.CSSProperties = {
  margin: "12px 0 0",
  color: "#d1fae5",
  fontWeight: 850,
  fontSize: "16px",
  lineHeight: 1.8,
};

const topBadgeStyle: React.CSSProperties = {
  border: "1px solid rgba(16,185,129,0.35)",
  background: "rgba(16,185,129,0.12)",
  color: "#6ee7b7",
  borderRadius: "999px",
  padding: "12px 16px",
  fontWeight: 950,
  whiteSpace: "nowrap",
};

const statsGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
  gap: "14px",
};

const statCardStyle: React.CSSProperties = {
  background:
    "linear-gradient(135deg, rgba(6,78,59,0.95), rgba(8,47,35,0.98))",
  border: "1px solid rgba(16,185,129,0.36)",
  borderRadius: "26px",
  padding: "18px",
  minHeight: "106px",
  display: "grid",
  alignContent: "center",
  gap: "10px",
  boxShadow: "0 18px 40px rgba(0,0,0,0.26)",
};

const statTitleStyle: React.CSSProperties = {
  margin: 0,
  color: "#a7f3d0",
  fontWeight: 950,
  fontSize: "14px",
};

const statValueStyle: React.CSSProperties = {
  color: "#ffffff",
  fontWeight: 950,
  fontSize: "28px",
};

const toolbarStyle: React.CSSProperties = {
  background: "rgba(8,47,35,0.88)",
  border: "1px solid rgba(16,185,129,0.28)",
  borderRadius: "26px",
  padding: "20px",
};

const toolbarTitleStyle: React.CSSProperties = {
  margin: 0,
  color: "#ffffff",
  fontSize: "22px",
  fontWeight: 950,
};

const toolbarTextStyle: React.CSSProperties = {
  margin: "8px 0 0",
  color: "#a7f3d0",
  fontWeight: 850,
  fontSize: "14px",
};

const customersStackStyle: React.CSSProperties = {
  display: "grid",
  gap: "16px",
};

const customerCardStyle: React.CSSProperties = {
  background:
    "linear-gradient(135deg, rgba(8,47,35,0.98), rgba(6,20,15,0.98))",
  border: "1px solid rgba(16,185,129,0.36)",
  borderRadius: "30px",
  padding: "20px",
  boxShadow: "0 24px 55px rgba(0,0,0,0.30)",
};

const customerMainStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 240px",
  gap: "18px",
};

const customerInfoStyle: React.CSSProperties = {
  minWidth: 0,
};

const cardHeaderStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: "14px",
};

const customerTitleStyle: React.CSSProperties = {
  margin: 0,
  color: "#ffffff",
  fontSize: "25px",
  fontWeight: 950,
};

const mutedTextStyle: React.CSSProperties = {
  margin: "8px 0 0",
  color: "#a7f3d0",
  fontWeight: 850,
  fontSize: "13px",
};

const mutedSmallStyle: React.CSSProperties = {
  color: "#9ca3af",
  fontWeight: 800,
  fontSize: "13px",
};

const statusBadgeStyle: React.CSSProperties = {
  borderRadius: "999px",
  padding: "10px 14px",
  fontWeight: 950,
  whiteSpace: "nowrap",
};

const detailsGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: "10px",
  marginTop: "16px",
};

const detailItemStyle: React.CSSProperties = {
  border: "1px solid rgba(16,185,129,0.16)",
  background: "rgba(255,255,255,0.045)",
  borderRadius: "18px",
  padding: "12px",
  display: "grid",
  gap: "8px",
  color: "#d1d5db",
  fontWeight: 850,
  fontSize: "12px",
  wordBreak: "break-word",
};

const branchesBoxStyle: React.CSSProperties = {
  marginTop: "14px",
  border: "1px solid rgba(16,185,129,0.16)",
  background: "rgba(255,255,255,0.045)",
  borderRadius: "18px",
  padding: "14px",
  display: "grid",
  gap: "12px",
  color: "#d1d5db",
  fontWeight: 850,
  fontSize: "13px",
};

const branchesListStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "8px",
};

const branchChipStyle: React.CSSProperties = {
  border: "1px solid rgba(16,185,129,0.24)",
  background: "rgba(16,185,129,0.10)",
  color: "#d1fae5",
  borderRadius: "999px",
  padding: "8px 12px",
  fontWeight: 900,
  fontSize: "12px",
};

const sidePanelStyle: React.CSSProperties = {
  border: "1px solid rgba(16,185,129,0.18)",
  background: "rgba(255,255,255,0.045)",
  borderRadius: "24px",
  padding: "14px",
  display: "grid",
  gap: "10px",
  alignContent: "start",
};

const sideSummaryStyle: React.CSSProperties = {
  border: "1px solid rgba(16,185,129,0.16)",
  background: "rgba(16,185,129,0.08)",
  borderRadius: "18px",
  padding: "14px",
  display: "grid",
  gap: "8px",
  color: "#a7f3d0",
  fontWeight: 950,
};

const greenLinkButtonStyle: React.CSSProperties = {
  width: "100%",
  border: "0",
  borderRadius: "16px",
  padding: "13px",
  background: "linear-gradient(135deg, #10b981, #059669)",
  color: "#ffffff",
  fontWeight: 950,
  cursor: "pointer",
  textDecoration: "none",
  textAlign: "center",
  boxSizing: "border-box",
};

const outlineLinkButtonStyle: React.CSSProperties = {
  width: "100%",
  border: "1px solid rgba(16,185,129,0.35)",
  borderRadius: "16px",
  padding: "13px",
  background: "rgba(16,185,129,0.12)",
  color: "#6ee7b7",
  fontWeight: 950,
  cursor: "pointer",
  textDecoration: "none",
  textAlign: "center",
  boxSizing: "border-box",
};

const errorStyle: React.CSSProperties = {
  border: "1px solid rgba(239,68,68,0.35)",
  background: "rgba(239,68,68,0.14)",
  color: "#fca5a5",
  borderRadius: "18px",
  padding: "14px",
  fontWeight: 950,
};

const emptyStyle: React.CSSProperties = {
  background:
    "linear-gradient(135deg, rgba(8,47,35,0.98), rgba(6,20,15,0.98))",
  border: "1px solid rgba(16,185,129,0.38)",
  borderRadius: "28px",
  padding: "34px",
  textAlign: "center",
  color: "#d1d5db",
  fontWeight: 950,
};
