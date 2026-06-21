"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import BranchPageHeader from "@/components/BranchPageHeader";
import BranchLayout from "@/components/BranchLayout";

type CashierStatus = "ready";

type Order = {
  id: string;
  order_number: string | null;
  status: CashierStatus;
  total: number;
  notes: string | null;
  created_at: string;
  table_id: string | null;
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

export default function CashierPage() {
  const params = useParams();
  const branchId = params.id as string;

  const [orders, setOrders] = useState<Order[]>([]);

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
        table_id,
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
      .eq("status", "ready")
      .order("created_at", { ascending: true });

    setOrders((data ?? []) as unknown as Order[]);
  }

  async function markDelivered(order: Order) {
    const now = new Date().toISOString();

    await supabase
      .from("orders")
      .update({
        status: "delivered",
      })
      .eq("id", order.id);

    if (order.table_id) {
      const { data: tableData } = await supabase
        .from("tables")
        .select(`
          current_session_id
        `)
        .eq("id", order.table_id)
        .single();

      if (tableData?.current_session_id) {
        await supabase
          .from("table_sessions")
          .update({
            bill_paid_at: now,
            cleaning_started_at: now,
          })
          .eq("id", tableData.current_session_id);
      }

      await supabase
        .from("tables")
        .update({
          status: "cleaning",
          last_activity_at: now,
        })
        .eq("id", order.table_id);
    }

    await loadOrders();
  }

  useEffect(() => {
    loadOrders();

    const channel = supabase
      .channel(`cashier-orders-${branchId}`)
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
          title="شاشة الكاشير"
          description="تابع الطلبات الجاهزة للتسليم، وأغلق الطلب بعد تسليمه للعميل."
          branchId={branchId}
        />

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          <StatCard title="جاهز للتسليم" value={orders.length} />

          <StatCard
            title="إجمالي المبالغ الجاهزة"
            value={`${orders.reduce((sum, order) => sum + order.total, 0)} ريال`}
          />

          <StatCard title="حالة الشاشة" value="مباشر" />
        </section>

        <div className="mt-8">
          {orders.length === 0 ? (
            <div className="rounded-3xl border border-emerald-500/30 bg-[#06140f] p-10 text-center text-gray-300">
              لا توجد طلبات جاهزة حالياً
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {orders.map((order) => (
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

                    <span className="rounded-full bg-blue-500 px-4 py-2 text-sm font-black text-white">
                      🔵 جاهز
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

                  <div className="mt-6 border-t border-white/10 pt-5">
                    <p className="mb-4 text-xl font-black">
                      الإجمالي: {order.total} ريال
                    </p>

                    <button
                      onClick={() => markDelivered(order)}
                      className="w-full rounded-2xl bg-emerald-500 px-5 py-4 font-black text-black"
                    >
                      تم التسليم وتحويل الطاولة للتنظيف
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </BranchLayout>
  );
}

function StatCard({
  title,
  value,
}: {
  title: string;
  value: number | string;
}) {
  return (
    <div className="rounded-3xl border border-emerald-500/30 bg-[#06140f] p-5 text-white">
      <p className="text-sm text-gray-400">{title}</p>
      <p className="mt-2 text-3xl font-black">{value}</p>
    </div>
  );
}