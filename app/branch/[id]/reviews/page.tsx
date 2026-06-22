"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import BranchPageHeader from "@/components/BranchPageHeader";
import BranchLayout from "@/components/BranchLayout";

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
  menuOpened: number;
  cartStarted: number;
  totalOrders: number;
  conversionRate: number;
  totalSales: number;
  averageRating: number;
  reviewsCount: number;
  waiterCalls: number;
  billRequests: number;
  newOrders: number;
  preparingOrders: number;
  readyOrders: number;
  deliveredOrders: number;
  topProducts: TopProduct[];
  dailyOrders: DailyOrder[];
};

export default function StatsPage() {
  const params = useParams();
  const branchId = params.id as string;

  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState<Stats>({
    menuOpened: 0,
    cartStarted: 0,
    totalOrders: 0,
    conversionRate: 0,
    totalSales: 0,
    averageRating: 0,
    reviewsCount: 0,
    waiterCalls: 0,
    billRequests: 0,
    newOrders: 0,
    preparingOrders: 0,
    readyOrders: 0,
    deliveredOrders: 0,
    topProducts: [],
    dailyOrders: [],
  });

  const maxDailyOrders = useMemo(() => {
    return Math.max(...stats.dailyOrders.map((day) => day.count), 1);
  }, [stats.dailyOrders]);

  async function loadStats() {
    setLoading(true);

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
        ? reviews.reduce((sum, review) => sum + review.rating, 0) /
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
      menuOpened,
      cartStarted,
      totalOrders,
      conversionRate,
      totalSales,
      averageRating,
      reviewsCount,
      waiterCalls: waiterCallsResult.count || 0,
      billRequests: billRequestsResult.count || 0,
      newOrders: orders.filter((order) => order.status === "new").length,
      preparingOrders: orders.filter((order) => order.status === "preparing")
        .length,
      readyOrders: orders.filter((order) => order.status === "ready").length,
      deliveredOrders: orders.filter((order) => order.status === "delivered")
        .length,
      topProducts,
      dailyOrders,
    });

    setLoading(false);
  }

  useEffect(() => {
    if (!branchId) return;

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
    return (
      <BranchLayout branchId={branchId}>
        <main className="min-h-screen bg-[#10b981] p-6 text-white md:p-8">
          جاري تحميل الإحصائيات...
        </main>
      </BranchLayout>
    );
  }

  return (
    <BranchLayout branchId={branchId}>
      <main className="min-h-screen bg-[#10b981] p-4 text-white md:p-8">
        <div className="mx-auto max-w-7xl">
          <BranchPageHeader
            title="إحصائيات الفرع"
            description="تحليل أداء الفرع، الطلبات، الزوار، التقييمات، وأفضل المنتجات."
            branchId={branchId}
          />

          <section className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-3">
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

          <section className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
            <StatCard title="👁️ فتح المنيو" value={stats.menuOpened} />
            <StatCard title="🛒 بدأ الطلب" value={stats.cartStarted} />
            <StatCard title="✅ إجمالي الطلبات" value={stats.totalOrders} />
            <StatCard title="📈 معدل التحويل" value={`${stats.conversionRate}%`} />
            <StatCard
              title="💰 إجمالي المبيعات"
              value={`${stats.totalSales.toFixed(0)} ريال`}
            />
            <StatCard
              title="⭐ متوسط التقييم"
              value={
                stats.reviewsCount > 0
                  ? `${stats.averageRating.toFixed(1)} / 5`
                  : "—"
              }
            />
          </section>

          <section className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
            <StatCard title="🛎️ استدعاء النادل" value={stats.waiterCalls} />
            <StatCard title="💳 طلب الفاتورة" value={stats.billRequests} />
            <StatCard title="طلبات جديدة" value={stats.newOrders} />
            <StatCard title="جاري التحضير" value={stats.preparingOrders} />
            <StatCard title="جاهز" value={stats.readyOrders} />
            <StatCard title="تم التسليم" value={stats.deliveredOrders} />
          </section>
        </div>
      </main>
    </BranchLayout>
  );
}

function TopProductsCard({ products }: { products: TopProduct[] }) {
  return (
    <div className="h-[280px] overflow-hidden rounded-[28px] border border-white/20 bg-[#06140f] p-6 text-white shadow-2xl">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black md:text-2xl">
          🔥 أكثر المنتجات طلبًا
        </h2>
        <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-gray-300">
          Top 5
        </span>
      </div>

      {products.length === 0 ? (
        <p className="mt-8 text-sm text-gray-400">لا توجد بيانات منتجات بعد.</p>
      ) : (
        <div className="mt-5 space-y-3">
          {products.slice(0, 4).map((product, index) => (
            <div
              key={product.name}
              className="flex items-center justify-between rounded-2xl bg-white/[0.06] p-3"
            >
              <div className="min-w-0">
                <p className="truncate font-black">
                  {index + 1}- {product.name}
                </p>
                <p className="mt-1 text-xs text-gray-400">إجمالي الكمية</p>
              </div>

              <span className="shrink-0 rounded-full bg-emerald-500/20 px-4 py-2 font-black text-emerald-300">
                {product.quantity}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
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
  const max = Math.max(menuOpened, cartStarted, totalOrders, billRequests, 1);

  return (
    <div className="h-[280px] overflow-hidden rounded-[28px] border border-white/20 bg-[#06140f] p-6 text-white shadow-2xl">
      <h2 className="text-xl font-black md:text-2xl">📊 ملخص التحويل</h2>

      <div className="mt-6 space-y-4">
        <ProgressRow title="فتح المنيو" value={menuOpened} max={max} />
        <ProgressRow title="بدأ الطلب" value={cartStarted} max={max} />
        <ProgressRow title="أرسل طلب" value={totalOrders} max={max} />
        <ProgressRow title="طلب الفاتورة" value={billRequests} max={max} />
      </div>
    </div>
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
    <div className="h-[280px] overflow-hidden rounded-[28px] border border-white/20 bg-[#06140f] p-6 text-white shadow-2xl">
      <h2 className="text-xl font-black md:text-2xl">
        📈 الطلبات آخر 30 يوم
      </h2>

      <div className="mt-8 flex h-36 items-end gap-1 border-b border-white/10 pb-3">
        {dailyOrders.map((day) => (
          <div
            key={day.date}
            className="flex flex-1 flex-col items-center justify-end gap-2"
          >
            <div
              className="w-full rounded-t-lg bg-emerald-400"
              style={{
                height: `${Math.max(
                  (day.count / maxDailyOrders) * 100,
                  day.count > 0 ? 8 : 0
                )}%`,
              }}
              title={`${day.date}: ${day.count} طلب`}
            />

            <span className="text-[8px] text-gray-500">
              {new Date(day.date).getDate()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatCard({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="flex h-[150px] flex-col justify-between rounded-[24px] border border-white/20 bg-[#06140f] p-4 text-white shadow-xl transition hover:-translate-y-1 hover:bg-[#071b14] md:p-5">
      <p className="text-sm leading-6 text-gray-400">{title}</p>
      <h2 className="break-words text-2xl font-black">{value}</h2>
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
      <div className="mb-2 flex items-center justify-between gap-4">
        <span className="text-sm text-gray-300">{title}</span>
        <span className="font-black text-white">{value}</span>
      </div>

      <div className="h-3 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-emerald-500"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}