"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import BranchPageHeader from "@/components/BranchPageHeader";
import BranchLayout from "@/components/BranchLayout";

type KitchenStatus = "new" | "preparing" | "ready";

type Order = {
  id: string;
  order_number: string | null;
  status: KitchenStatus;
  total: number;
  notes: string | null;
  created_at: string;
  table_session_id: string | null;
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

const statusConfig: Record<KitchenStatus, { label: string; className: string }> =
  {
    new: {
      label: "🟢 طلب جديد",
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
  };

const filters: { label: string; value: "all" | KitchenStatus }[] = [
  { label: "الكل", value: "all" },
  { label: "الجديدة", value: "new" },
  { label: "قيد التحضير", value: "preparing" },
  { label: "الجاهزة", value: "ready" },
];

export default function KitchenPage() {
  const params = useParams();
  const branchId = params.id as string;

  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState<"all" | KitchenStatus>("all");

  const filteredOrders =
    filter === "all"
      ? orders
      : orders.filter((order) => order.status === filter);

  const newCount = orders.filter((order) => order.status === "new").length;
  const preparingCount = orders.filter(
    (order) => order.status === "preparing"
  ).length;
  const readyCount = orders.filter((order) => order.status === "ready").length;

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
        table_session_id,
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
      .in("status", ["new", "preparing", "ready"])
      .order("created_at", { ascending: true });

    setOrders((data ?? []) as unknown as Order[]);
  }

  async function updateStatus(
    order: Order,
    status: KitchenStatus | "delivered"
  ) {
    const now = new Date().toISOString();

    await supabase.from("orders").update({ status }).eq("id", order.id);

    if (order.table_session_id) {
      if (status === "preparing") {
        await supabase
          .from("table_sessions")
          .update({ ordered_at: now })
          .eq("id", order.table_session_id)
          .is("ordered_at", null);
      }

      if (status === "ready") {
        await supabase
          .from("table_sessions")
          .update({ ready_at: now })
          .eq("id", order.table_session_id)
          .is("ready_at", null);
      }

      if (status === "delivered") {
        await supabase
          .from("table_sessions")
          .update({ delivered_at: now })
          .eq("id", order.table_session_id)
          .is("delivered_at", null);
      }
    }

    await loadOrders();
  }

  useEffect(() => {
    loadOrders();

    const channel = supabase
      .channel(`kitchen-orders-${branchId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `branch_id=eq.${branchId}`,
        },
        () => {
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

    return () => {
      supabase.removeChannel(channel);
    };
  }, [branchId]);

  return (
    <BranchLayout branchId={branchId}>
  <div className="mx-auto max-w-7xl">
            <BranchPageHeader
              title="شاشة المطبخ"
              description="تابع الطلبات الجديدة والجاري تجهيزها داخل المطبخ."
              branchId={branchId}
            />

            <section className="mt-8 grid gap-4 md:grid-cols-4">
              <StatCard title="الطلبات النشطة" value={orders.length} />
              <StatCard title="الجديدة" value={newCount} />
              <StatCard title="قيد التحضير" value={preparingCount} />
              <StatCard title="الجاهزة" value={readyCount} />
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

            {filteredOrders.length === 0 ? (
              <div className="rounded-3xl border border-emerald-500/30 bg-[#06140f] p-10 text-center text-gray-300">
                لا توجد طلبات في هذا التصنيف
              </div>
            ) : (
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {filteredOrders.map((order) => {
                  const status = statusConfig[order.status];

                  return (
                    <div
                      key={order.id}
                      className="rounded-3xl border border-emerald-500/30 bg-[#06140f] p-6 text-white"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h2 className="text-3xl font-black">
                            طاولة {order.tables?.table_number || "غير محددة"}
                          </h2>

                          <p className="mt-2 text-sm text-gray-400">
                            رقم الطلب: {order.order_number || "غير محدد"}
                          </p>
                        </div>

                        <span
                          className={`rounded-full px-4 py-2 text-sm font-black ${status.className}`}
                        >
                          {status.label}
                        </span>
                      </div>

                      <div className="mt-6 space-y-3">
                        {(order.order_items || []).length > 0 ? (
                          (order.order_items || []).map((item) => (
                            <div
                              key={item.id}
                              className="rounded-2xl bg-black/25 p-4"
                            >
                              <p className="text-xl font-black">
                                {item.quantity} ×{" "}
                                {item.products?.name || "منتج غير معروف"}
                              </p>
                            </div>
                          ))
                        ) : (
                          <div className="rounded-2xl bg-black/25 p-4 text-gray-400">
                            لا توجد منتجات مرتبطة بهذا الطلب
                          </div>
                        )}
                      </div>

                      {order.notes && (
                        <div className="mt-5 rounded-2xl bg-yellow-500/20 p-4 text-yellow-200">
                          ملاحظات: {order.notes}
                        </div>
                      )}

                      <div className="mt-6 grid gap-3">
                        {order.status === "new" && (
                          <button
                            onClick={() => updateStatus(order, "preparing")}
                            className="rounded-2xl bg-yellow-500 px-5 py-4 font-black text-black"
                          >
                            بدأ التحضير
                          </button>
                        )}

                        {order.status === "preparing" && (
                          <button
                            onClick={() => updateStatus(order, "ready")}
                            className="rounded-2xl bg-blue-500 px-5 py-4 font-black text-white"
                          >
                            جاهز
                          </button>
                        )}

                        {order.status === "ready" && (
                          <button
                            onClick={() => updateStatus(order, "delivered")}
                            className="rounded-2xl bg-emerald-500 px-5 py-4 font-black text-black"
                          >
                            تم التسليم
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
</BranchLayout>
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
          : "border border-emerald-500/30 bg-[#06140f] text-white hover:bg-[#0b1f19]"
      }`}
    >
      {children}
    </button>
  );
}

function StatCard({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded-3xl border border-emerald-500/30 bg-[#06140f] p-5 text-white">
      <p className="text-sm text-gray-400">{title}</p>
      <p className="mt-2 text-3xl font-black">{value}</p>
    </div>
  );
}