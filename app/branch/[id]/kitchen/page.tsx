"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Order = {
  id: string;
  status: string;
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

export default function KitchenPage() {
  const params = useParams();
  const branchId = params.id as string;

  const [orders, setOrders] = useState<Order[]>([]);

  async function loadOrders() {
    const { data } = await supabase
      .from("orders")
      .select(`
        id,
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
      .in("status", ["new", "preparing", "ready"])
      .order("created_at", { ascending: true });

    setOrders((data ?? []) as unknown as Order[]);
  }

  async function updateStatus(orderId: string, status: string) {
    await supabase.from("orders").update({ status }).eq("id", orderId);
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
  }, []);

  function statusLabel(status: string) {
    if (status === "new") return "طلب جديد";
    if (status === "preparing") return "جاري التحضير";
    if (status === "ready") return "جاهز";
    return status;
  }

  return (
    <main dir="rtl" className="min-h-screen bg-[#06140f] p-6 text-white">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black">شاشة المطبخ</h1>
          <p className="mt-2 text-gray-400">
            الطلبات الجديدة والجارية تظهر هنا مباشرة.
          </p>
        </div>

        <div className="rounded-2xl bg-emerald-500 px-5 py-3 font-black text-black">
          الطلبات النشطة: {orders.length}
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-10 text-center text-gray-400">
          لا توجد طلبات حالياً
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {orders.map((order) => (
            <div
              key={order.id}
              className="rounded-3xl border border-white/10 bg-white/5 p-6"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-3xl font-black">
                    طاولة {order.tables?.table_number || "غير محددة"}
                  </h2>

                  <p className="mt-2 text-sm text-gray-400">
                    طلب #{order.id.slice(0, 8)}
                  </p>
                </div>

                <span className="rounded-full bg-white px-4 py-2 text-sm font-black text-black">
                  {statusLabel(order.status)}
                </span>
              </div>

              <div className="mt-6 space-y-3">
                {(order.order_items || []).map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl bg-black/25 p-4"
                  >
                    <p className="text-xl font-black">
                      {item.quantity} × {item.products?.name || "منتج غير معروف"}
                    </p>
                  </div>
                ))}
              </div>

              {order.notes && (
                <div className="mt-5 rounded-2xl bg-yellow-500/20 p-4 text-yellow-200">
                  ملاحظات: {order.notes}
                </div>
              )}

              <div className="mt-6 grid gap-3">
                {order.status === "new" && (
                  <button
                    onClick={() => updateStatus(order.id, "preparing")}
                    className="rounded-2xl bg-yellow-500 px-5 py-4 font-black text-black"
                  >
                    بدأ التحضير
                  </button>
                )}

                {order.status === "preparing" && (
                  <button
                    onClick={() => updateStatus(order.id, "ready")}
                    className="rounded-2xl bg-blue-500 px-5 py-4 font-black text-white"
                  >
                    جاهز
                  </button>
                )}

                {order.status === "ready" && (
                  <button
                    onClick={() => updateStatus(order.id, "delivered")}
                    className="rounded-2xl bg-emerald-500 px-5 py-4 font-black text-black"
                  >
                    تم التسليم
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}