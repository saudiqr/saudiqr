"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getSubscriptionAccessByBranchId } from "@/lib/subscriptionAccess";

type Order = {
  id: string;
  status: string;
  total: number | null;
  created_at: string;
};

type Review = {
  rating: number;
};

type ActivityLog = {
  activity_type: string;
};

type OrderItem = {
  quantity: number;
  products: {
    name: string;
  } | null;
};

type DailyOrder = {
  date: string;
  count: number;
};

type TopProduct = {
  name: string;
  quantity: number;
};

type Stats = {
  totalOrders: number;
  totalSales: number;
  newOrders: number;
  preparingOrders: number;
  readyOrders: number;
  deliveredOrders: number;
  menuOpened: number;
  cartStarted: number;
  waiterCalls: number;
  billRequests: number;
  reviewsCount: number;
  averageRating: number;
  conversionRate: number;
  topProducts: TopProduct[];
  dailyOrders: DailyOrder[];
};

export default function StatsPage() {
  const params = useParams();
  const branchId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [stats, setStats] = useState<Stats>({
    totalOrders: 0,
    totalSales: 0,
    newOrders: 0,
    preparingOrders: 0,
    readyOrders: 0,
    deliveredOrders: 0,
    menuOpened: 0,
    cartStarted: 0,
    waiterCalls: 0,
    billRequests: 0,
    reviewsCount: 0,
    averageRating: 0,
    conversionRate: 0,
    topProducts: [],
    dailyOrders: [],
  });

  const maxDailyOrders = useMemo(() => {
    return Math.max(...stats.dailyOrders.map((day) => day.count), 1);
  }, [stats.dailyOrders]);

  async function loadStats() {
    setLoading(true);
    setMessage("");

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 29);
    startDate.setHours(0, 0, 0, 0);

    const [
      ordersResult,
      waiterCallsResult,
      billRequestsResult,
      reviewsResult,
      activityLogsResult,
      orderItemsResult,
    ] = await Promise.all([
      supabase
        .from("orders")
        .select("id,status,total,created_at")
        .eq("branch_id", branchId),

      supabase
        .from("waiter_calls")
        .select("id", { count: "exact" })
        .eq("branch_id", branchId),

      supabase
        .from("bill_requests")
        .select("id", { count: "exact" })
        .eq("branch_id", branchId),

      supabase.from("reviews").select("rating").eq("branch_id", branchId),

      supabase
        .from("table_activity_logs")
        .select("activity_type")
        .eq("branch_id", branchId),

      supabase
        .from("order_items")
        .select(`
          quantity,
          products (
            name
          ),
          orders!inner (
            branch_id
          )
        `)
        .eq("orders.branch_id", branchId),
    ]);

    if (
      ordersResult.error ||
      waiterCallsResult.error ||
      billRequestsResult.error ||
      reviewsResult.error ||
      activityLogsResult.error ||
      orderItemsResult.error
    ) {
      setMessage(
        ordersResult.error?.message ||
          waiterCallsResult.error?.message ||
          billRequestsResult.error?.message ||
          reviewsResult.error?.message ||
          activityLogsResult.error?.message ||
          orderItemsResult.error?.message ||
          "حدث خطأ أثناء تحميل الإحصائيات."
      );
      setLoading(false);
      return;
    }

    const orders = (ordersResult.data || []) as Order[];
    const reviews = (reviewsResult.data || []) as Review[];
    const activityLogs = (activityLogsResult.data || []) as ActivityLog[];
    const orderItems = (orderItemsResult.data || []) as unknown as OrderItem[];

    const totalOrders = orders.length;
    const totalSales = orders.reduce(
      (sum, order) => sum + Number(order.total || 0),
      0
    );

    const menuOpened = activityLogs.filter(
      (log) => log.activity_type === "menu_opened"
    ).length;

    const cartStarted = activityLogs.filter(
      (log) => log.activity_type === "cart_started"
    ).length;

    const reviewsCount = reviews.length;
    const averageRating =
      reviewsCount > 0
        ? reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) /
          reviewsCount
        : 0;

    const conversionRate =
      menuOpened > 0 ? Math.round((totalOrders / menuOpened) * 100) : 0;

    const productMap = new Map<string, number>();

    orderItems.forEach((item) => {
      const name = item.products?.name || "منتج غير معروف";
      const quantity = Number(item.quantity || 0);
      productMap.set(name, (productMap.get(name) || 0) + quantity);
    });

    const topProducts = Array.from(productMap.entries())
      .map(([name, quantity]) => ({ name, quantity }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    const dailyOrders: DailyOrder[] = [];

    for (let index = 0; index < 30; index++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + index);

      const key = date.toISOString().slice(0, 10);
      const count = orders.filter((order) =>
        order.created_at?.startsWith(key)
      ).length;

      dailyOrders.push({
        date: key,
        count,
      });
    }

    setStats({
      totalOrders,
      totalSales,
      newOrders: orders.filter((order) => order.status === "new").length,
      preparingOrders: orders.filter((order) => order.status === "preparing")
        .length,
      readyOrders: orders.filter((order) => order.status === "ready").length,
      deliveredOrders: orders.filter((order) => order.status === "delivered")
        .length,
      menuOpened,
      cartStarted,
      waiterCalls: waiterCallsResult.count || 0,
      billRequests: billRequestsResult.count || 0,
      reviewsCount,
      averageRating,
      conversionRate,
      topProducts,
      dailyOrders,
    });

    setLoading(false);
  }

  useEffect(() => {
    if (!branchId) return;
async function checkAccess() {
  const access = await getSubscriptionAccessByBranchId(
    branchId,
    "stats"
  );

  if (!access.allowed) {
    setMessage(access.reason || "غير متاح في الباقة الحالية");
    setLoading(false);
    return false;
  }

  return true;
}

checkAccess().then((allowed) => {
  if (allowed) {
    loadStats();
  }
});
    loadStats();

    const ordersChannel = supabase
      .channel(`stats-orders-${branchId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `branch_id=eq.${branchId}`,
        },
        () => loadStats()
      )
      .subscribe();

    const reviewsChannel = supabase
      .channel(`stats-reviews-${branchId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "reviews",
          filter: `branch_id=eq.${branchId}`,
        },
        () => loadStats()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(reviewsChannel);
    };
  }, [branchId]);

  if (loading) {
    if (message === "الباقة لا تسمح بالإحصائيات.") {
  return (
    <div dir="rtl" style={pageStyle}>
      <section
        style={{
          ...bigCardStyle,
          textAlign: "center",
          maxWidth: "700px",
          margin: "auto",
        }}
      >
        <h1
          style={{
            color: "#FFF8F0",
            fontSize: "32px",
            fontWeight: 950,
            marginBottom: "16px",
          }}
        >
          غير متاح في الباقة الحالية
        </h1>

        <p
          style={{
            color: "#fca5a5",
            fontWeight: 900,
          }}
        >
          {message}
        </p>
      </section>
    </div>
  );
}
    return (
      <div dir="rtl" style={pageStyle}>
        <section style={heroStyle}>
          <p style={eyebrowStyle}></p>
          <h1 style={heroTitleStyle}>إحصائيات الفرع</h1>
          <p style={heroTextStyle}>جاري تحميل الإحصائيات...</p>
        </section>
      </div>
    );
  }

  return (
    <div dir="rtl" style={pageStyle}>
      <section style={heroStyle}>
        <div>
          <p style={eyebrowStyle}></p>
          <h1 style={heroTitleStyle}>إحصائيات الفرع</h1>
          <p style={heroTextStyle}>
            تحليل أداء الفرع، الطلبات، الزوار، التقييمات، وأفضل المنتجات.
          </p>
        </div>

      </section>

      {message ? <div style={errorStyle}>{message}</div> : null}

      <section style={topGridStyle}>
        <TopProductsCard products={stats.topProducts} />

        <ConversionCard
          menuOpened={stats.menuOpened}
          cartStarted={stats.cartStarted}
          totalOrders={stats.totalOrders}
          billRequests={stats.billRequests}
        />

        <DailyOrdersCard
          dailyOrders={stats.dailyOrders}
          maxDailyOrders={maxDailyOrders}
        />
      </section>

      <section style={statsGridStyle}>
        <MetricCard title="فتح المنيو" value={stats.menuOpened} icon="👁️" />
        <MetricCard title="بدأ الطلب" value={stats.cartStarted} icon="🛒" />
        <MetricCard title="إجمالي الطلبات" value={stats.totalOrders} icon="✅" />
        <MetricCard title="معدل التحويل" value={`${stats.conversionRate}%`} icon="📈" />
        <MetricCard
          title="إجمالي المبيعات"
          value={`${stats.totalSales.toFixed(2)} ريال`}
          icon="💰"
        />
        <MetricCard
          title="متوسط التقييم"
          value={
            stats.reviewsCount > 0 ? `⭐ ${stats.averageRating.toFixed(1)}` : "—"
          }
          icon="⭐"
        />
      </section>

      <section style={statsGridStyle}>
        <MetricCard title="استدعاء النادل" value={stats.waiterCalls} icon="🛎️" />
        <MetricCard title="طلب الفاتورة" value={stats.billRequests} icon="💳" />
        <MetricCard title="طلبات جديدة" value={stats.newOrders} icon="🟢" />
        <MetricCard title="جاري التحضير" value={stats.preparingOrders} icon="🟡" />
        <MetricCard title="جاهز" value={stats.readyOrders} icon="🔵" />
        <MetricCard title="تم التسليم" value={stats.deliveredOrders} icon="⚫" />
      </section>
    </div>
  );
}

function TopProductsCard({ products }: { products: TopProduct[] }) {
  return (
    <section style={bigCardStyle}>
      <h2 style={sectionTitleStyle}>أكثر المنتجات طلبًا</h2>
      <p style={sectionSubtitleStyle}>أعلى المنتجات حسب إجمالي الكمية.</p>

      {products.length === 0 ? (
        <div style={emptyInnerStyle}>لا توجد بيانات منتجات بعد.</div>
      ) : (
        <div style={{ display: "grid", gap: "12px", marginTop: "20px" }}>
          {products.map((product, index) => (
            <div key={product.name} style={productRowStyle}>
              <div>
                <strong style={{ color: "#FFF8F0", fontWeight: 950 }}>
                  {index + 1}- {product.name}
                </strong>
                <p style={mutedTextStyle}>إجمالي الكمية</p>
              </div>

              <span style={quantityBadgeStyle}>{product.quantity}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function ConversionCard({
  menuOpened,
  cartStarted,
  totalOrders,
  billRequests,
}: {
  menuOpened: number;
  cartStarted: number;
  totalOrders: number;
  billRequests: number;
}) {
  const max = Math.max(menuOpened, 1);

  return (
    <section style={bigCardStyle}>
      <h2 style={sectionTitleStyle}>ملخص التحويل</h2>
      <p style={sectionSubtitleStyle}>من فتح المنيو إلى إرسال الطلب.</p>

      <div style={{ display: "grid", gap: "16px", marginTop: "22px" }}>
        <ProgressRow title="فتح المنيو" value={menuOpened} max={max} />
        <ProgressRow title="بدأ الطلب" value={cartStarted} max={max} />
        <ProgressRow title="أرسل طلب" value={totalOrders} max={max} />
        <ProgressRow title="طلب الفاتورة" value={billRequests} max={max} />
      </div>
    </section>
  );
}

function DailyOrdersCard({
  dailyOrders,
  maxDailyOrders,
}: {
  dailyOrders: DailyOrder[];
  maxDailyOrders: number;
}) {
  return (
    <section style={bigCardStyle}>
      <h2 style={sectionTitleStyle}>الطلبات آخر 30 يوم</h2>
      <p style={sectionSubtitleStyle}>رسم مبسط لعدد الطلبات اليومية.</p>

      <div style={chartStyle}>
        {dailyOrders.map((day) => (
          <div key={day.date} style={barWrapperStyle}>
            <div
              style={{
                ...barStyle,
                height: `${Math.max(
                  (day.count / maxDailyOrders) * 100,
                  day.count > 0 ? 8 : 0
                )}%`,
              }}
              title={`${day.date}: ${day.count} طلب`}
            />

            <span style={barLabelStyle}>{new Date(day.date).getDate()}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function MetricCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: string | number;
  icon: string;
}) {
  return (
    <div style={metricCardStyle}>
      <div>
        <p style={{ margin: 0, color: "#C8B6A4", fontWeight: 950 }}>
          {title}
        </p>

        <strong style={metricValueStyle}>{value}</strong>
      </div>

      <div style={metricIconStyle}>{icon}</div>
    </div>
  );
}

function ProgressRow({
  title,
  value,
  max,
}: {
  title: string;
  value: number;
  max: number;
}) {
  const percent = max > 0 ? Math.min((value / max) * 100, 100) : 0;

  return (
    <div>
      <div style={progressHeaderStyle}>
        <span>{title}</span>
        <strong>{value}</strong>
      </div>

      <div style={progressTrackStyle}>
        <div style={{ ...progressFillStyle, width: `${percent}%` }} />
      </div>
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  width: "100%",
  minHeight: "100vh",
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
  background: "rgba(198,138,61,0.12)",
  color: "#DEA54B",
  border: "1px solid #4A3425",
  fontWeight: 950,
};

const errorStyle: React.CSSProperties = {
  border: "1px solid rgba(239,68,68,0.35)",
  background: "rgba(239,68,68,0.14)",
  color: "#fca5a5",
  borderRadius: "18px",
  padding: "14px",
  fontWeight: 900,
};

const topGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: "18px",
};

const statsGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
  gap: "14px",
};

const bigCardStyle: React.CSSProperties = {
  background:
    "linear-gradient(135deg, #241B16, #16110E)",
  border: "1px solid #4A3425",
  borderRadius: "28px",
  padding: "24px",
  boxShadow: "0 22px 45px rgba(0,0,0,0.28)",
  minHeight: "320px",
};

const sectionTitleStyle: React.CSSProperties = {
  margin: 0,
  color: "#FFF8F0",
  fontWeight: 950,
  fontSize: "24px",
};

const sectionSubtitleStyle: React.CSSProperties = {
  margin: "8px 0 0",
  color: "#C8B6A4",
  fontWeight: 800,
  fontSize: "14px",
  lineHeight: 1.8,
};

const mutedTextStyle: React.CSSProperties = {
  margin: "6px 0 0",
  color: "#C8B6A4",
  fontWeight: 800,
  fontSize: "13px",
};

const emptyInnerStyle: React.CSSProperties = {
  marginTop: "20px",
  border: "1px solid #4A3425",
  background: "rgba(255,255,255,0.055)",
  color: "#C8B6A4",
  borderRadius: "18px",
  padding: "18px",
  fontWeight: 900,
};

const productRowStyle: React.CSSProperties = {
  border: "1px solid #4A3425",
  background: "rgba(255,255,255,0.055)",
  borderRadius: "18px",
  padding: "14px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "12px",
};

const quantityBadgeStyle: React.CSSProperties = {
  borderRadius: "999px",
  padding: "9px 14px",
  background: "rgba(198,138,61,0.12)",
  color: "#DEA54B",
  border: "1px solid #4A3425",
  fontWeight: 950,
};

const chartStyle: React.CSSProperties = {
  marginTop: "28px",
  height: "220px",
  display: "flex",
  alignItems: "end",
  gap: "6px",
  borderBottom: "1px solid rgba(255,255,255,0.12)",
  paddingBottom: "18px",
};

const barWrapperStyle: React.CSSProperties = {
  flex: 1,
  height: "100%",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "end",
  gap: "7px",
};

const barStyle: React.CSSProperties = {
  width: "100%",
  minHeight: "0px",
  borderRadius: "12px 12px 0 0",
  background: "linear-gradient(180deg, #DEA54B, #C68A3D)",
};

const barLabelStyle: React.CSSProperties = {
  color: "#C8B6A4",
  fontSize: "10px",
  fontWeight: 800,
};

const metricCardStyle: React.CSSProperties = {
  background:
    "linear-gradient(135deg, #241B16, #2A211C)",
  border: "1px solid #4A3425",
  borderRadius: "24px",
  padding: "18px",
  boxShadow: "0 18px 38px rgba(0,0,0,0.25)",
  minHeight: "130px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "12px",
};

const metricValueStyle: React.CSSProperties = {
  display: "block",
  marginTop: "10px",
  color: "#FFF8F0",
  fontWeight: 950,
  fontSize: "26px",
};

const metricIconStyle: React.CSSProperties = {
  width: "48px",
  height: "48px",
  borderRadius: "16px",
  background: "rgba(198,138,61,0.12)",
  border: "1px solid #4A3425",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "24px",
  flexShrink: 0,
};

const progressHeaderStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "10px",
  color: "#C8B6A4",
  fontWeight: 900,
  marginBottom: "8px",
};

const progressTrackStyle: React.CSSProperties = {
  height: "12px",
  borderRadius: "999px",
  overflow: "hidden",
  background: "rgba(255,255,255,0.08)",
};

const progressFillStyle: React.CSSProperties = {
  height: "100%",
  borderRadius: "999px",
  background: "linear-gradient(135deg, #C68A3D, #DEA54B)",
};
