"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import BranchPageHeader from "@/components/BranchPageHeader";
import BranchLayout from "@/components/BranchLayout";


type BillRequestStatus = "pending" | "done";

type BillRequest = {
  id: string;
  status: BillRequestStatus;
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

  const pendingCount = requests.filter(
    (request) => request.status === "pending"
  ).length;

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
      <BranchLayout branchId={branchId}>
        جاري تحميل طلبات الفاتورة...
      </BranchLayout>
    );
  }

  return (
    <BranchLayout branchId={branchId}>
      <div className="mx-auto max-w-7xl">
        <BranchPageHeader
          title="طلبات الفاتورة"
          description="تابع طلبات الفاتورة الواردة من الطاولات وأغلقها بعد المحاسبة."
          branchId={branchId}
        />

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          <StatCard title="طلبات بانتظار المحاسبة" value={pendingCount} />
          <StatCard title="إجمالي المعروض" value={requests.length} />
          <StatCard title="حالة الشاشة" value="مباشر" />
        </section>

        <div className="mt-8">
          {requests.length === 0 ? (
            <div className="rounded-3xl border border-white/10 bg-white/5 p-10 text-center text-gray-400">
              لا توجد طلبات فاتورة حالياً.
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {requests.map((request) => (
                <div
                  key={request.id}
                  className="rounded-3xl border border-white/10 bg-white/5 p-6"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-3xl font-black">
                        💳 طاولة {request.tables?.table_number || "غير محددة"}
                      </h2>

                      <p className="mt-2 text-sm text-gray-400">
                        {new Date(request.created_at).toLocaleString("ar-SA")}
                      </p>
                    </div>

                    <span className="rounded-full bg-yellow-500 px-4 py-2 text-sm font-black text-black">
                      طلب فاتورة
                    </span>
                  </div>

                  <div className="mt-6 rounded-2xl bg-black/25 p-4 text-gray-300">
                    العميل طلب الحساب وينتظر إغلاق الفاتورة.
                  </div>

                  <button
                    onClick={() => completeRequest(request.id)}
                    className="mt-6 w-full rounded-2xl bg-emerald-500 px-5 py-4 font-black text-black"
                  >
                    تمت المحاسبة
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