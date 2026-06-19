"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type BillRequest = {
  id: string;
  status: string;
  created_at: string;
  tables: {
    table_number: number;
  } | null;
};

export default function BillRequestsPage() {
  const params = useParams();
  const branchId = params.id as string;

  const [requests, setRequests] = useState<BillRequest[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadRequests() {
    const { data } = await supabase
      .from("bill_requests")
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

    setRequests((data || []) as unknown as BillRequest[]);
    setLoading(false);
  }

  async function completeRequest(requestId: string) {
    await supabase
      .from("bill_requests")
      .update({ status: "done" })
      .eq("id", requestId);

    await loadRequests();
  }

  useEffect(() => {
    loadRequests();

    const channel = supabase
      .channel(`bill-requests-${branchId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bill_requests",
          filter: `branch_id=eq.${branchId}`,
        },
        () => {
          loadRequests();
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
        جاري تحميل طلبات الفاتورة...
      </main>
    );
  }

  return (
    <main dir="rtl" className="min-h-screen bg-[#06140f] p-10 text-white">
      <h1 className="text-4xl font-black">طلبات الفاتورة</h1>

      <p className="mt-4 text-gray-400">
        الطلبات تظهر هنا فور ضغط العميل على زر طلب الفاتورة.
      </p>

      <div className="mt-8 space-y-4">
        {requests.length === 0 && (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-gray-400">
            لا توجد طلبات فاتورة حالياً.
          </div>
        )}

        {requests.map((request) => (
          <div
            key={request.id}
            className="rounded-3xl border border-white/10 bg-white/5 p-6"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black">
                  💳 طاولة رقم {request.tables?.table_number || "-"}
                </h2>

                <p className="mt-2 text-sm text-gray-400">
                  {new Date(request.created_at).toLocaleString("ar-SA")}
                </p>
              </div>

              <button
                onClick={() => completeRequest(request.id)}
                className="rounded-2xl bg-emerald-500 px-5 py-3 font-black text-black"
              >
                تمت المحاسبة
              </button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}