"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import BranchPageHeader from "@/components/BranchPageHeader";

type OrderStatus = "new" | "preparing" | "ready" | "delivered";

type Order = {
  id: string;
  order_number: string | null;
  status: OrderStatus;
  total: number;
  notes: string | null;
  created_at: string;
  tables: {
    table_number: number;
  } | null;
  order_items?: {
    id: string;
    quantity: number;
    price: number;
    products: {
      name: string;
    } | null;
  }[];
};

const statusConfig: Record<OrderStatus, { label: string; className: string }> = {
  new: {
    label: "🟢 جديد",
    className: "bg-emerald-500 text-black",
  },
  preparing: {
    label: "🟡 جاري التحضير",
    className: "bg-yellow-500 text-black",
  },
  ready: {
    label: "🔵 جاهز",
    className: "bg-blue-500 text-white",
  },
  delivered: {
    label: "⚫ تم التسليم",
    className: "bg-gray-700 text-white",
  },
};

const filters: { label: string; value: "all" | OrderStatus }[] = [
  { label: "الكل", value: "all" },
  { label: "الجديدة", value: "new" },
  { label: "قيد التحضير", value: "preparing" },
  { label: "الجاهزة", value: "ready" },
  { label: "المسلمة", value: "delivered" },
];

export default function OrdersPage() {
  const params = useParams();
  const branchId = params.id as string;

  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState<"all" | OrderStatus>("all");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const firstLoadRef = useRef(true);

  const filteredOrders =
    filter === "all"
      ? orders
      : orders.filter((order) => order.status === filter);

  const newCount = orders.filter((order) => order.status === "new").length;
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
        tables (
          table_number
        ),
        order_items (
          id,
          quantity,
          price,
          products (
            name
          )
        )
      `)
      .eq("branch_id", branchId)
      .order("created_at", { ascending: false });

    setOrders((data ?? []) as unknown as Order[]);
  }

  async function updateStatus(orderId: string, status: OrderStatus) {
    await supabase.from("orders").update({ status }).eq("id", orderId);
    await loadOrders();
  }

  useEffect(() => {
    audioRef.current = new Audio("/sounds/new-order.mp3");

    loadOrders();

    const channel = supabase
      .channel(`orders-realtime-${branchId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "orders",
          filter: `branch_id=eq.${branchId}`,
        },
        () => {
          if (!firstLoadRef.current) {
            audioRef.current?.play().catch(() => {});
          }

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

    const timer = setTimeout(() => {
      firstLoadRef.current = false;
    }, 1500);

    return () => {
      clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [branchId]);

  return (
    <main dir="rtl" className="min-h-screen bg-[#06140f] p-10 text-white">
      <BranchPageHeader
        title="الطلبات"
        description="تابع طلبات العملاء، غيّر حالة الطلب، وشاهد تفاصيل كل طاولة."
        branchId={branchId}
      />

      <section className="mt-8 grid gap-4 md:grid-cols-5">
        <StatCard title="كل الطلبات" value={orders.length} />
        <StatCard title="الجديدة" value={newCount} />
        <StatCard title="قيد التحضير" value={preparingCount} />
        <StatCard title="الجاهزة" value={readyCount} />
        <StatCard title="المسلمة" value={deliveredCount} />
      </section>

      <div className="mb-8 mt-6 flex flex-wrap gap-3">
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

      <div className="mt-8 space-y-4">
        {filteredOrders.map((order) => {
          const status = statusConfig[order.status];

          return (
            <div
              key={order.id}
              className="rounded-3xl border border-white/10 bg-white/5 p-6"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-black">
                    طاولة {order.tables?.table_number || "غير محددة"}
                  </h2>

                  <p className="mt-2 text-sm text-gray-400">
                    رقم الطلب: {order.order_number || "غير محدد"}
                  </p>
                </div>

                <div
                  className={`rounded-full px-4 py-2 text-sm font-black ${status.className}`}
                >
                  {status.label}
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {(order.order_items || []).length > 0 ? (
                  (order.order_items || []).map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-2xl bg-black/20 p-4"
                    >
                      <div>
                        <p className="font-bold">
                          {item.products?.name || "منتج غير معروف"}
                        </p>
                        <p className="text-sm text-gray-400">
                          الكمية: {item.quantity}
                        </p>
                      </div>

                      <p className="font-black text-emerald-400">
                        {item.price * item.quantity} ريال
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl bg-black/20 p-4 text-gray-400">
                    لا توجد منتجات مرتبطة بهذا الطلب
                  </div>
                )}
              </div>

              {order.notes && (
                <div className="mt-4 rounded-2xl bg-black/20 p-4 text-gray-300">
                  ملاحظات: {order.notes}
                </div>
              )}

              <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-5">
                <p className="text-xl font-black">
                  الإجمالي: {order.total} ريال
                </p>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => updateStatus(order.id, "new")}
                    className="rounded-xl border border-white/10 px-4 py-3 text-sm font-bold"
                  >
                    جديد
                  </button>

                  <button
                    onClick={() => updateStatus(order.id, "preparing")}
                    className="rounded-xl bg-yellow-500 px-4 py-3 text-sm font-bold text-black"
                  >
                    جاري التحضير
                  </button>

                  <button
                    onClick={() => updateStatus(order.id, "ready")}
                    className="rounded-xl bg-blue-500 px-4 py-3 text-sm font-bold text-white"
                  >
                    جاهز
                  </button>

                  <button
                    onClick={() => updateStatus(order.id, "delivered")}
                    className="rounded-xl bg-emerald-500 px-4 py-3 text-sm font-bold text-black"
                  >
                    تم التسليم
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {filteredOrders.length === 0 && (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-10 text-center text-gray-400">
            لا توجد طلبات في هذا التصنيف
          </div>
        )}
      </div>
    </main>
  );
}

function FilterButton({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-2xl px-5 py-3 font-bold transition ${
        active
          ? "bg-emerald-500 text-black"
          : "border border-white/10 bg-white/5 hover:bg-white/10"
      }`}
    >
      {children}
    </button>
  );
}

function StatCard({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-5">
      <p className="text-sm text-gray-400">{title}</p>
      <p className="mt-2 text-3xl font-black">{value}</p>
    </div>
  );
}