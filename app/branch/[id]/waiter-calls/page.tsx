"use client";

import { useEffect, useRef, useState } from "react";
import { playSound } from "@/lib/playSound";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type WaiterCall = {
  id: string;
  status: string;
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
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [branchId]);

  if (loading) {
    return (
      <main dir="rtl" className="min-h-screen bg-[#06140f] p-10 text-white">
        جاري تحميل طلبات النادل...
      </main>
    );
  }

  return (
    <main dir="rtl" className="min-h-screen bg-[#06140f] p-10 text-white">
      <h1 className="text-4xl font-black">طلبات النادل</h1>

      <p className="mt-4 text-gray-400">
        الطلبات تظهر هنا فور ضغط العميل على زر استدعاء النادل.
      </p>

      <div className="mt-8 space-y-4">
        {calls.length === 0 && (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-gray-400">
            لا توجد طلبات نادل حالياً.
          </div>
        )}

        {calls.map((call) => (
          <div
            key={call.id}
            className="rounded-3xl border border-white/10 bg-white/5 p-6"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black">
                  🛎️ طاولة رقم {call.tables?.table_number || "-"}
                </h2>

                <p className="mt-2 text-sm text-gray-400">
                  {new Date(call.created_at).toLocaleString("ar-SA")}
                </p>
              </div>

              <button
                onClick={() => completeCall(call.id)}
                className="rounded-2xl bg-emerald-500 px-5 py-3 font-black text-black"
              >
                تمت الخدمة
              </button>
              
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}