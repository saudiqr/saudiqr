import Link from "next/link";
import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Branch = {
  id: string;
  name: string | null;
  city: string | null;
  slug: string | null;
  created_at: string | null;
};

type Subscription = {
  id: string;
  status: "trial" | "active" | "expired" | "cancelled" | "past_due";
  starts_at: string | null;
  ends_at: string | null;
  amount: number | null;
  currency: string | null;
  payment_provider: string | null;
  payment_reference: string | null;
  plans:
    | {
        name: string;
        price: number;
        duration_days: number;
        max_branches: number;
        max_products: number | null;
        allow_orders: boolean;
        allow_kitchen: boolean;
        allow_cashier: boolean;
        allow_stats: boolean;
      }[]
    | null;
};

type Business = {
  id: string;
  name: string;
  created_at: string | null;
  branches: Branch[] | null;
  subscriptions: Subscription[] | null;
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

function getLatestSubscription(customer: Business) {
  return customer.subscriptions?.[0] || null;
}

function getPlan(subscription: Subscription | null) {
  return subscription?.plans?.[0] || null;
}

function getStatusText(status: string | null) {
  if (!status) return "بدون اشتراك";
  return statusLabel[status] || status;
}

function getStatusStyle(status: string | null): React.CSSProperties {
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

export default async function AdminCustomerDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { data, error } = await supabase
    .from("businesses")
    .select(
      `
      id,
      name,
      created_at,
      branches(
        id,
        name,
        city,
        slug,
        created_at
      ),
      subscriptions(
        id,
        status,
        starts_at,
        ends_at,
        amount,
        currency,
        payment_provider,
        payment_reference,
        plans(
          name,
          price,
          duration_days,
          max_branches,
          max_products,
          allow_orders,
          allow_kitchen,
          allow_cashier,
          allow_stats
        )
      )
    `
    )
    .eq("id", id)
    .single();

  if (!data && !error) {
    notFound();
  }

  const customer = data as Business | null;

  if (!customer) {
    return (
      <main dir="rtl" style={pageStyle}>
        <section style={errorStyle}>لم يتم العثور على العميل.</section>
      </main>
    );
  }

  const subscription = getLatestSubscription(customer);
  const plan = getPlan(subscription);
  const status = subscription?.status || null;
  const branches = customer.branches || [];

  return (
    <main dir="rtl" style={pageStyle}>
      <section style={heroStyle}>
        <div>
          <p style={eyebrowStyle}>SaudiQR Admin</p>
          <h1 style={heroTitleStyle}>{customer.name}</h1>
          <p style={heroTextStyle}>
            تفاصيل العميل، الفروع التابعة له، الاشتراك الحالي، وحدود الباقة.
          </p>
        </div>

        <div style={heroActionsStyle}>
          <Link href="/admin/customers" style={secondaryLinkStyle}>
            رجوع للعملاء
          </Link>

          <Link
            href={`/dashboard/branches?business_id=${customer.id}`}
            style={primaryLinkStyle}
          >
            إدارة الفروع
          </Link>
        </div>
      </section>

      {error ? (
        <div style={errorStyle}>خطأ في جلب بيانات العميل: {error.message}</div>
      ) : null}

      <section style={statsGridStyle}>
        <StatCard title="عدد النشاطات" value="1" />
        <StatCard title="عدد الفروع" value={branches.length} />
        <StatCard title="الباقة" value={plan?.name || "بدون باقة"} />
        <StatCard title="حالة الاشتراك" value={getStatusText(status)} />
        <StatCard title="المتبقي" value={daysLeft(subscription?.ends_at || null)} />
      </section>

      <section style={contentGridStyle}>
        <article style={cardStyle}>
          <div style={cardHeaderStyle}>
            <div>
              <h2 style={sectionTitleStyle}>بيانات العميل</h2>
              <p style={sectionSubtitleStyle}>البيانات الأساسية للنشاط داخل المنصة.</p>
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
            <DetailItem title="اسم النشاط" value={customer.name} />
            <DetailItem title="معرف النشاط" value={customer.id} />
            <DetailItem title="تاريخ التسجيل" value={formatDate(customer.created_at)} />
            <DetailItem title="عدد الفروع" value={String(branches.length)} />
          </div>
        </article>

        <article style={cardStyle}>
          <h2 style={sectionTitleStyle}>الاشتراك الحالي</h2>
          <p style={sectionSubtitleStyle}>
            حالة الاشتراك، الباقة، تاريخ البداية والنهاية، وبيانات الدفع.
          </p>

          <div style={detailsGridStyle}>
            <DetailItem title="الحالة" value={getStatusText(status)} />
            <DetailItem title="الباقة" value={plan?.name || "بدون باقة"} />
            <DetailItem
              title="تاريخ البداية"
              value={formatDate(subscription?.starts_at || null)}
            />
            <DetailItem
              title="تاريخ النهاية"
              value={formatDate(subscription?.ends_at || null)}
            />
            <DetailItem
              title="المتبقي"
              value={daysLeft(subscription?.ends_at || null)}
            />
            <DetailItem
              title="المبلغ"
              value={`${subscription?.amount || 0} ${subscription?.currency || "SAR"}`}
            />
            <DetailItem
              title="مزود الدفع"
              value={subscription?.payment_provider || "غير محدد"}
            />
            <DetailItem
              title="مرجع الدفع"
              value={subscription?.payment_reference || "غير محدد"}
            />
          </div>

          <div style={singleActionStyle}>
            <Link href="/admin/subscriptions" style={outlineLinkButtonStyle}>
              إدارة الاشتراك
            </Link>
          </div>
        </article>
      </section>

      <section style={cardStyle}>
        <h2 style={sectionTitleStyle}>حدود وصلاحيات الباقة</h2>
        <p style={sectionSubtitleStyle}>
          هذه القيم تحدد ما يستطيع العميل استخدامه داخل النظام.
        </p>

        <div style={detailsGridStyle}>
          <DetailItem title="أقصى عدد فروع" value={String(plan?.max_branches ?? "غير محدد")} />
          <DetailItem
            title="أقصى عدد منتجات"
            value={plan?.max_products == null ? "غير محدود" : String(plan.max_products)}
          />
          <DetailItem title="الطلبات" value={plan?.allow_orders ? "مسموح" : "غير مسموح"} />
          <DetailItem title="المطبخ" value={plan?.allow_kitchen ? "مسموح" : "غير مسموح"} />
          <DetailItem title="الكاشير" value={plan?.allow_cashier ? "مسموح" : "غير مسموح"} />
          <DetailItem title="الإحصائيات" value={plan?.allow_stats ? "مسموح" : "غير مسموح"} />
        </div>
      </section>

      <section style={cardStyle}>
        <div style={cardHeaderStyle}>
          <div>
            <h2 style={sectionTitleStyle}>الفروع</h2>
            <p style={sectionSubtitleStyle}>
              كل الفروع المرتبطة بهذا العميل / النشاط.
            </p>
          </div>

          <Link
            href={`/dashboard/branches?business_id=${customer.id}`}
            style={secondaryLinkStyle}
          >
            إدارة الفروع
          </Link>
        </div>

        {branches.length === 0 ? (
          <div style={emptyInnerStyle}>لا توجد فروع مرتبطة بهذا العميل.</div>
        ) : (
          <div style={branchesGridStyle}>
            {branches.map((branch) => (
              <article key={branch.id} style={branchCardStyle}>
                <h3 style={branchTitleStyle}>{branch.name || "فرع بدون اسم"}</h3>

                <div style={branchDetailsStyle}>
                  <span>المدينة: {branch.city || "غير محدد"}</span>
                  <span>الرابط: {branch.slug || "غير محدد"}</span>
                  <span>تاريخ الإضافة: {formatDate(branch.created_at)}</span>
                </div>

                <div style={actionsGridStyle}>
                  <Link href={`/branch/${branch.id}`} style={greenLinkButtonStyle}>
                    فتح الفرع
                  </Link>

                  {branch.slug ? (
                    <Link href={`/menu/${branch.slug}`} style={outlineLinkButtonStyle}>
                      فتح المنيو
                    </Link>
                  ) : (
                    <span style={disabledButtonStyle}>لا يوجد منيو</span>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
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
  gap: "24px",
  boxSizing: "border-box",
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

const heroActionsStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  flexWrap: "wrap",
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

const primaryLinkStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  textDecoration: "none",
  border: "0",
  borderRadius: "18px",
  padding: "14px 20px",
  background: "linear-gradient(135deg, #10b981, #059669)",
  color: "#ffffff",
  fontWeight: 950,
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const secondaryLinkStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  textDecoration: "none",
  border: "1px solid rgba(16,185,129,0.32)",
  borderRadius: "18px",
  padding: "14px 20px",
  background: "rgba(255,255,255,0.06)",
  color: "#d1fae5",
  fontWeight: 950,
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const statsGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
  gap: "14px",
};

const statCardStyle: React.CSSProperties = {
  background:
    "linear-gradient(135deg, rgba(6,78,59,0.98), rgba(9,40,30,0.98))",
  border: "1px solid rgba(16,185,129,0.38)",
  borderRadius: "24px",
  padding: "18px",
  boxShadow: "0 18px 38px rgba(0,0,0,0.25)",
  minHeight: "108px",
  display: "grid",
  alignContent: "center",
  gap: "10px",
};

const statTitleStyle: React.CSSProperties = {
  margin: 0,
  color: "#a7f3d0",
  fontWeight: 950,
};

const statValueStyle: React.CSSProperties = {
  color: "#ffffff",
  fontWeight: 950,
  fontSize: "24px",
  wordBreak: "break-word",
};

const contentGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "18px",
};

const cardStyle: React.CSSProperties = {
  background:
    "linear-gradient(135deg, rgba(8,47,35,0.98), rgba(6,20,15,0.98))",
  border: "1px solid rgba(16,185,129,0.38)",
  borderRadius: "28px",
  padding: "24px",
  boxShadow: "0 22px 45px rgba(0,0,0,0.28)",
};

const cardHeaderStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: "14px",
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
  marginTop: "18px",
};

const detailItemStyle: React.CSSProperties = {
  border: "1px solid rgba(16,185,129,0.18)",
  background: "rgba(255,255,255,0.055)",
  borderRadius: "16px",
  padding: "12px",
  display: "grid",
  gap: "8px",
  color: "#d1d5db",
  fontWeight: 850,
  fontSize: "12px",
  wordBreak: "break-word",
};

const singleActionStyle: React.CSSProperties = {
  marginTop: "14px",
};

const branchesGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "14px",
  marginTop: "18px",
};

const branchCardStyle: React.CSSProperties = {
  border: "1px solid rgba(16,185,129,0.18)",
  background: "rgba(255,255,255,0.055)",
  borderRadius: "20px",
  padding: "16px",
};

const branchTitleStyle: React.CSSProperties = {
  margin: 0,
  color: "#ffffff",
  fontSize: "19px",
  fontWeight: 950,
};

const branchDetailsStyle: React.CSSProperties = {
  display: "grid",
  gap: "8px",
  marginTop: "12px",
  color: "#d1d5db",
  fontSize: "13px",
  fontWeight: 850,
};

const actionsGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "10px",
  marginTop: "14px",
};

const greenLinkButtonStyle: React.CSSProperties = {
  width: "100%",
  border: "0",
  borderRadius: "15px",
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
  borderRadius: "15px",
  padding: "13px",
  background: "rgba(16,185,129,0.12)",
  color: "#6ee7b7",
  fontWeight: 950,
  cursor: "pointer",
  textDecoration: "none",
  textAlign: "center",
  boxSizing: "border-box",
};

const disabledButtonStyle: React.CSSProperties = {
  width: "100%",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: "15px",
  padding: "13px",
  background: "rgba(255,255,255,0.05)",
  color: "#9ca3af",
  fontWeight: 950,
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

const emptyInnerStyle: React.CSSProperties = {
  marginTop: "18px",
  border: "1px solid rgba(16,185,129,0.18)",
  background: "rgba(255,255,255,0.055)",
  borderRadius: "18px",
  padding: "18px",
  textAlign: "center",
  color: "#d1d5db",
  fontWeight: 900,
};
