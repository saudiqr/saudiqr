"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import BranchPageHeader from "@/components/BranchPageHeader";
import BranchLayout from "@/components/BranchLayout";

type Stats = {
  totalOrders: number;
  totalSales: number;
  newOrders: number;
  preparingOrders: number;
  readyOrders: number;
  deliveredOrders: number;
};

export default function StatsPage() {
  const params = useParams();
  const branchId = params.id as string;

  const [stats, setStats] = useState<Stats>({
    totalOrders: 0,
    totalSales: 0,
    newOrders: 0,
    preparingOrders: 0,
    readyOrders: 0,
    deliveredOrders: 0,
  });

  async function loadStats() {
    const { data } = await supabase
      .from("orders")
      .select("status,total")
      .eq("branch_id", branchId);

    const orders = data || [];

    setStats({
      totalOrders: orders.length,
      totalSales: orders.reduce((sum, order) => sum + Number(order.total || 0), 0),
      newOrders: orders.filter((order) => order.status === "new").length,
      preparingOrders: orders.filter((order) => order.status === "preparing").length,
      readyOrders: orders.filter((order) => order.status === "ready").length,
      deliveredOrders: orders.filter((order) => order.status === "delivered").length,
    });
  }

  useEffect(() => {
    loadStats();

    const channel = supabase
      .channel(`stats-${branchId}`)
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

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <BranchLayout branchId={branchId}>
    <div className="mx-auto max-w-7xl">
      <BranchPageHeader
  title="إحصائيات الفرع"
  description="شاهد إحصائيات الأداء والطلبات داخل الفرع."
  branchId={branchId}
/>

      <div className="mt-10 grid gap-5 md:grid-cols-3">
        <Card title="إجمالي الطلبات" value={stats.totalOrders} />
        <Card title="إجمالي المبيعات" value={`${stats.totalSales} ريال`} />
        <Card title="طلبات جديدة" value={stats.newOrders} />
        <Card title="جاري التحضير" value={stats.preparingOrders} />
        <Card title="جاهز" value={stats.readyOrders} />
        <Card title="تم التسليم" value={stats.deliveredOrders} />
      </div>
        </div>
  </BranchLayout>
);
}

function Card({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="rounded-3xl border border-emerald-500/30 bg-[#06140f] p-6 text-white">
      <p className="text-sm text-gray-400">{title}</p>
      <h2 className="mt-3 text-3xl font-black">{value}</h2>
    </div>
  );
}