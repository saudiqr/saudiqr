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

export default function OrdersPage() {
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
      .order("created_at", { ascending: false });

    setOrders((data ?? []) as unknown as Order[]);
  }

  async function updateStatus(orderId: string, status: string) {
    await supabase.from("orders").update({ status }).eq("id", orderId);
    await loadOrders();
  }

  useEffect(() => {
  loadOrders();

  const channel = supabase
    .channel(`orders-realtime-${branchId}`)
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
    <main dir="rtl" className="min-h-screen bg-[#06140f] p-10 text-white">
      <h1 className="text-4xl font-black">الطلبات</h1>

      <div className="mt-8 space-y-4">
        {orders.map((order) => (
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
                  رقم الطلب: {order.id.slice(0, 8)}
                </p>
              </div>

              <div className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-black text-black">
                {order.status}
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
        ))}

        {orders.length === 0 && (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-10 text-center text-gray-400">
            لا توجد طلبات حتى الآن
          </div>
        )}
      </div>
    </main>
  );
}