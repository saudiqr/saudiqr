import { supabase } from "@/lib/supabase";

type SubscriptionRow = {
  id: string;
  status: "trial" | "active" | "expired" | "cancelled" | "past_due";
  amount: number | null;
  currency: string | null;
  starts_at: string | null;
  ends_at: string | null;
  plans:
    | {
        name: string;
      }[]
    | null;
  businesses:
    | {
        name: string;
      }[]
    | null;
};

type OrderRow = {
  id: string;
  total: number | null;
  status: string | null;
  created_at: string | null;
};

type ReviewRow = {
  id: string;
  rating: number | null;
  approved: boolean | null;
};

function formatMoney(value: number) {
  return `${value.toFixed(2)} ريال`;
}

function formatDate(value: string | null) {
  if (!value) return "غير محدد";

  const date = new Date(value);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}/${month}/${day}`;
}

function getSubscriptionStatusStyle(status: string): React.CSSProperties {
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

  return {
    background: "rgba(239,68,68,0.14)",
    color: "#fca5a5",
    border: "1px solid rgba(239,68,68,0.34)",
  };
}

const statusLabel: Record<string, string> = {
  trial: "تجريبي",
  active: "نشط",
  expired: "منتهي",
  cancelled: "ملغي",
  past_due: "متعثر",
};

export default async function AdminStatsPage() {
  const [
    businessesResult,
    branchesResult,
    subscriptionsResult,
    ordersResult,
    productsResult,
    reviewsResult,
    plansResult,
  ] = await Promise.all([
    supabase.from("businesses").select("id", { count: "exact", head: true }),
    supabase.from("branches").select("id", { count: "exact", head: true }),
    supabase
      .from("subscriptions")
      .select(
        `
        id,
        status,
        amount,
        currency,
        starts_at,
        ends_at,
        plans(name),
        businesses(name)
      `
      )
      .order("created_at", { ascending: false }),
    supabase.from("orders").select("id,total,status,created_at"),
    supabase.from("products").select("id", { count: "exact", head: true }),
    supabase.from("product_reviews").select("id,rating,approved"),
    supabase.from("plans").select("id", { count: "exact", head: true }),
  ]);

  const subscriptions = (subscriptionsResult.data || []) as SubscriptionRow[];
  const orders = (ordersResult.data || []) as OrderRow[];
  const reviews = (reviewsResult.data || []) as ReviewRow[];

  const customersCount = businessesResult.count || 0;
  const branchesCount = branchesResult.count || 0;
  const productsCount = productsResult.count || 0;
  const plansCount = plansResult.count || 0;

  const subscriptionsCount = subscriptions.length;
  const activeSubscriptions = subscriptions.filter((item) => item.status === "active").length;
  const trialSubscriptions = subscriptions.filter((item) => item.status === "trial").length;
  const inactiveSubscriptions = subscriptions.filter((item) =>
    ["expired", "cancelled", "past_due"].includes(item.status)
  ).length;

  const ordersCount = orders.length;
  const deliveredOrders = orders.filter((order) => order.status === "delivered").length;
  const activeOrders = orders.filter((order) =>
    ["new", "preparing", "ready"].includes(String(order.status || ""))
  ).length;

  const ordersRevenue = orders.reduce(
    (sum, order) => sum + Number(order.total || 0),
    0
  );

  const subscriptionsRevenue = subscriptions.reduce(
    (sum, subscription) => sum + Number(subscription.amount || 0),
    0
  );

  const totalRevenue = ordersRevenue + subscriptionsRevenue;

  const approvedReviews = reviews.filter((review) => review.approved !== false);
  const averageRating =
    approvedReviews.length > 0
      ? approvedReviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) /
        approvedReviews.length
      : 0;

  const latestSubscriptions = subscriptions.slice(0, 6);
  const latestOrders = orders
    .slice()
    .sort((a, b) => {
      const left = new Date(a.created_at || 0).getTime();
      const right = new Date(b.created_at || 0).getTime();
      return right - left;
    })
    .slice(0, 6);

  const hasError =
    businessesResult.error ||
    branchesResult.error ||
    subscriptionsResult.error ||
    ordersResult.error ||
    productsResult.error ||
    reviewsResult.error ||
    plansResult.error;

  return (
    <main dir="rtl" style={pageStyle}>
      <section style={topBarStyle}>
        <div>
          <p style={eyebrowStyle}>SaudiQR Admin</p>
          <h1 style={pageTitleStyle}>إحصائيات المنصة</h1>
          <p style={pageSubtitleStyle}>
            ملخص سريع لحركة المنصة، الاشتراكات، العملاء، الطلبات، والإيرادات.
          </p>
        </div>

        <span style={topBadgeStyle}>لوحة تحكم المنصة</span>
      </section>

      {hasError ? (
        <div style={errorStyle}>
          يوجد خطأ في قراءة بعض الإحصائيات. راجع أسماء الجداول والعلاقات في Supabase.
        </div>
      ) : null}

      <section style={statsGridStyle}>
        <StatCard title="كل العملاء" value={customersCount} />
        <StatCard title="كل الفروع" value={branchesCount} />
        <StatCard title="كل الطلبات" value={ordersCount} />
        <StatCard title="كل المنتجات" value={productsCount} />
        <StatCard title="الباقات" value={plansCount} />
        <StatCard title="الاشتراكات النشطة" value={activeSubscriptions} />
        <StatCard title="الاشتراكات التجريبية" value={trialSubscriptions} />
        <StatCard title="غير النشطة" value={inactiveSubscriptions} />
        <StatCard title="متوسط التقييم" value={averageRating.toFixed(1)} />
        <StatCard title="إجمالي الإيرادات" value={formatMoney(totalRevenue)} />
      </section>

      <section style={contentGridStyle}>
        <article style={bigCardStyle}>
          <div style={cardHeaderStyle}>
            <div>
              <h2 style={sectionTitleStyle}>ملخص الإيرادات</h2>
              <p style={sectionSubtitleStyle}>
                الإيرادات هنا تجمع مبالغ الاشتراكات ومبالغ الطلبات المسجلة.
              </p>
            </div>
          </div>

          <div style={revenueGridStyle}>
            <RevenueBox title="إيرادات الاشتراكات" value={formatMoney(subscriptionsRevenue)} />
            <RevenueBox title="إيرادات الطلبات" value={formatMoney(ordersRevenue)} />
            <RevenueBox title="الإجمالي" value={formatMoney(totalRevenue)} highlight />
          </div>
        </article>

        <article style={bigCardStyle}>
          <div style={cardHeaderStyle}>
            <div>
              <h2 style={sectionTitleStyle}>حالة التشغيل</h2>
              <p style={sectionSubtitleStyle}>
                قراءة سريعة لحالة الطلبات والاشتراكات داخل النظام.
              </p>
            </div>
          </div>

          <div style={operationGridStyle}>
            <OperationItem title="طلبات نشطة" value={activeOrders} />
            <OperationItem title="طلبات مسلمة" value={deliveredOrders} />
            <OperationItem title="كل الاشتراكات" value={subscriptionsCount} />
            <OperationItem title="كل التقييمات" value={reviews.length} />
          </div>
        </article>
      </section>

      <section style={tablesGridStyle}>
        <article style={listCardStyle}>
          <div>
            <h2 style={sectionTitleStyle}>آخر الاشتراكات</h2>
            <p style={sectionSubtitleStyle}>
              أحدث الاشتراكات المسجلة في المنصة.
            </p>
          </div>

          {latestSubscriptions.length === 0 ? (
            <div style={emptyInnerStyle}>لا توجد اشتراكات حتى الآن.</div>
          ) : (
            <div style={listStyle}>
              {latestSubscriptions.map((subscription) => (
                <div key={subscription.id} style={listItemStyle}>
                  <div>
                    <strong style={listTitleStyle}>
                      {subscription.businesses?.[0]?.name || "نشاط غير معروف"}
                    </strong>
                    <p style={listTextStyle}>
                      {subscription.plans?.[0]?.name || "باقة غير معروفة"} -{" "}
                      {formatDate(subscription.ends_at)}
                    </p>
                  </div>

                  <span
                    style={{
                      ...statusBadgeStyle,
                      ...getSubscriptionStatusStyle(subscription.status),
                    }}
                  >
                    {statusLabel[subscription.status] || subscription.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </article>

        <article style={listCardStyle}>
          <div>
            <h2 style={sectionTitleStyle}>آخر الطلبات</h2>
            <p style={sectionSubtitleStyle}>
              آخر الطلبات حسب تاريخ الإنشاء.
            </p>
          </div>

          {latestOrders.length === 0 ? (
            <div style={emptyInnerStyle}>لا توجد طلبات حتى الآن.</div>
          ) : (
            <div style={listStyle}>
              {latestOrders.map((order) => (
                <div key={order.id} style={listItemStyle}>
                  <div>
                    <strong style={listTitleStyle}>{formatMoney(Number(order.total || 0))}</strong>
                    <p style={listTextStyle}>{formatDate(order.created_at)}</p>
                  </div>

                  <span style={orderStatusBadgeStyle}>{order.status || "غير محدد"}</span>
                </div>
              ))}
            </div>
          )}
        </article>
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

function RevenueBox({
  title,
  value,
  highlight,
}: {
  title: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div style={highlight ? revenueBoxHighlightStyle : revenueBoxStyle}>
      <span>{title}</span>
      <strong>{value}</strong>
    </div>
  );
}

function OperationItem({ title, value }: { title: string; value: string | number }) {
  return (
    <div style={operationItemStyle}>
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
  fontSize: "24px",
  wordBreak: "break-word",
};

const contentGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "18px",
};

const bigCardStyle: React.CSSProperties = {
  background:
    "linear-gradient(135deg, rgba(8,47,35,0.98), rgba(6,20,15,0.98))",
  border: "1px solid rgba(16,185,129,0.36)",
  borderRadius: "30px",
  padding: "22px",
  boxShadow: "0 24px 55px rgba(0,0,0,0.30)",
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
  fontWeight: 850,
  fontSize: "14px",
  lineHeight: 1.8,
};

const revenueGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: "12px",
  marginTop: "18px",
};

const revenueBoxStyle: React.CSSProperties = {
  border: "1px solid rgba(16,185,129,0.16)",
  background: "rgba(255,255,255,0.045)",
  borderRadius: "20px",
  padding: "16px",
  display: "grid",
  gap: "10px",
  color: "#d1d5db",
  fontWeight: 900,
};

const revenueBoxHighlightStyle: React.CSSProperties = {
  ...revenueBoxStyle,
  background: "rgba(16,185,129,0.12)",
  color: "#6ee7b7",
  border: "1px solid rgba(16,185,129,0.32)",
};

const operationGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "12px",
  marginTop: "18px",
};

const operationItemStyle: React.CSSProperties = {
  border: "1px solid rgba(16,185,129,0.16)",
  background: "rgba(255,255,255,0.045)",
  borderRadius: "20px",
  padding: "16px",
  display: "grid",
  gap: "10px",
  color: "#d1d5db",
  fontWeight: 900,
};

const tablesGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "18px",
};

const listCardStyle: React.CSSProperties = {
  background:
    "linear-gradient(135deg, rgba(8,47,35,0.98), rgba(6,20,15,0.98))",
  border: "1px solid rgba(16,185,129,0.36)",
  borderRadius: "30px",
  padding: "22px",
  boxShadow: "0 24px 55px rgba(0,0,0,0.30)",
};

const listStyle: React.CSSProperties = {
  display: "grid",
  gap: "10px",
  marginTop: "18px",
};

const listItemStyle: React.CSSProperties = {
  border: "1px solid rgba(16,185,129,0.16)",
  background: "rgba(255,255,255,0.045)",
  borderRadius: "18px",
  padding: "14px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "12px",
};

const listTitleStyle: React.CSSProperties = {
  color: "#ffffff",
  fontWeight: 950,
  fontSize: "15px",
};

const listTextStyle: React.CSSProperties = {
  margin: "6px 0 0",
  color: "#a7f3d0",
  fontWeight: 850,
  fontSize: "13px",
};

const statusBadgeStyle: React.CSSProperties = {
  borderRadius: "999px",
  padding: "9px 12px",
  fontWeight: 950,
  whiteSpace: "nowrap",
  fontSize: "12px",
};

const orderStatusBadgeStyle: React.CSSProperties = {
  border: "1px solid rgba(16,185,129,0.32)",
  background: "rgba(16,185,129,0.12)",
  color: "#6ee7b7",
  borderRadius: "999px",
  padding: "9px 12px",
  fontWeight: 950,
  whiteSpace: "nowrap",
  fontSize: "12px",
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
