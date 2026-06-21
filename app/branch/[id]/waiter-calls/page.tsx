"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { playSound } from "@/lib/playSound";
import { supabase } from "@/lib/supabase";
import BranchPageHeader from "@/components/BranchPageHeader";
import BranchLayout from "@/components/BranchLayout";

type WaiterCallStatus = "pending" | "done";

type WaiterCall = {
  id: string;
  status: WaiterCallStatus;
  created_at: string;
  tables: {
    table_number: number;
  } | null;
};

export default function WaiterCallsPage() {
  const params = useParams();
  const branchId = params.id as string;

  const [calls, setCalls] = useState<WaiterCall[]>([]);
  const [loading, setLoading] = useState(true);

  const playedIds = useRef(new Set<string>());

  const pendingCount = calls.filter((call) => call.status === "pending").length;

  async function loadCalls() {
    const { data } = await supabase
      .from("waiter_calls")
      .select(`
        id,
        status,
        created_at,
        tables (
          table_number
        )
      `)
      .eq("branch_id", branchId)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    setCalls((data || []) as unknown as WaiterCall[]);
    setLoading(false);
  }

  async function completeCall(callId: string) {
    await supabase
      .from("waiter_calls")
      .update({ status: "done" })
      .eq("id", callId);

    await loadCalls();
  }

  useEffect(() => {
    loadCalls();

    const channel = supabase
      .channel(`waiter-calls-${branchId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "waiter_calls",
          filter: `branch_id=eq.${branchId}`,
        },
        (payload) => {
          const newCall = payload.new as { id: string };

          if (!playedIds.current.has(newCall.id)) {
            playedIds.current.add(newCall.id);
            playSound("waiter-call");
          }

          loadCalls();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "waiter_calls",
          filter: `branch_id=eq.${branchId}`,
        },
        () => {
          loadCalls();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [branchId]);

  if (loading) {
    return (
<BranchLayout branchId={branchId}>
        جاري تحميل طلبات النادل...
      </BranchLayout>
    );
  }

  return (
    <BranchLayout branchId={branchId}>
    <div className="mx-auto max-w-7xl">
        <BranchPageHeader
          title="طلبات النادل"
          description="تابع طلبات النادل الواردة من الطاولات وأغلقها بعد الخدمة."
          branchId={branchId}
        />

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          <StatCard title="طلبات بانتظار الخدمة" value={pendingCount} />
          <StatCard title="إجمالي المعروض" value={calls.length} />
          <StatCard title="حالة الشاشة" value="مباشر" />
        </section>

        <div className="mt-8">
          {calls.length === 0 ? (
            <div className="rounded-3xl border border-white/10 bg-white/5 p-10 text-center text-gray-400">
              لا توجد طلبات نادل حالياً.
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {calls.map((call) => (
                <div
                  key={call.id}
                  className="rounded-3xl border border-white/10 bg-white/5 p-6"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-3xl font-black">
                        🛎️ طاولة {call.tables?.table_number || "غير محددة"}
                      </h2>

                      <p className="mt-2 text-sm text-gray-400">
                        {new Date(call.created_at).toLocaleString("ar-SA")}
                      </p>
                    </div>

                    <span className="rounded-full bg-blue-500 px-4 py-2 text-sm font-black text-white">
                      طلب نادل
                    </span>
                  </div>

                  <div className="mt-6 rounded-2xl bg-black/25 p-4 text-gray-300">
                    العميل يحتاج مساعدة من الموظف.
                  </div>

                  <button
                    onClick={() => completeCall(call.id)}
                    className="mt-6 w-full rounded-2xl bg-emerald-500 px-5 py-4 font-black text-black"
                  >
                    تمت الخدمة
                  </button>
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
    <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-5">
      <p className="text-sm text-gray-400">{title}</p>
      <p className="mt-2 text-3xl font-black">{value}</p>
    </div>
  );
}