"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import BranchPageHeader from "@/components/BranchPageHeader";
import BranchLayout from "@/components/BranchLayout";

type TableStatus = "available" | "occupied" | "billing" | "cleaning";

type Table = {
  id: string;
  table_number: number;
  status: TableStatus | null;
  current_session_id: string | null;
  occupied_since: string | null;
};

type Branch = {
  id: string;
  slug: string;
};

const statusConfig: Record<
  TableStatus,
  { label: string; badge: string; border: string; dot: string }
> = {
  available: {
    label: "متاحة",
    badge: "bg-emerald-500/20 text-emerald-300",
    border: "border-emerald-500/30",
    dot: "bg-emerald-400",
  },
  occupied: {
    label: "مشغولة",
    badge: "bg-red-500/20 text-red-300",
    border: "border-red-500/30",
    dot: "bg-red-400",
  },
  billing: {
    label: "بانتظار الحساب",
    badge: "bg-yellow-500/20 text-yellow-300",
    border: "border-yellow-500/30",
    dot: "bg-yellow-400",
  },
  cleaning: {
    label: "تحتاج تنظيف",
    badge: "bg-gray-500/20 text-gray-300",
    border: "border-gray-500/30",
    dot: "bg-gray-400",
  },
};

export default function TablesPage() {
  const params = useParams();
  const branchId = params.id as string;

  const [tables, setTables] = useState<Table[]>([]);
  const [branch, setBranch] = useState<Branch | null>(null);
  const [tableNumber, setTableNumber] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const availableCount = tables.filter((t) => (t.status || "available") === "available").length;
  const occupiedCount = tables.filter((t) => t.status === "occupied").length;
  const billingCount = tables.filter((t) => t.status === "billing").length;
  const cleaningCount = tables.filter((t) => t.status === "cleaning").length;

  async function loadData() {
    const { data: branchData } = await supabase
      .from("branches")
      .select("id, slug")
      .eq("id", branchId)
      .single();

    setBranch(branchData);

    const { data, error } = await supabase
      .from("tables")
      .select(`
  id,
  table_number,
  status,
  current_session_id,
  occupied_since
`)
      .eq("branch_id", branchId)
      .order("table_number", { ascending: true });

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setTables((data || []) as Table[]);
  }

  async function addTable() {
    setErrorMessage("");

    if (!tableNumber) {
      setErrorMessage("اكتب رقم الطاولة.");
      return;
    }

    const { error } = await supabase.from("tables").insert({
      branch_id: branchId,
      table_number: Number(tableNumber),
      status: "available",
    });

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setTableNumber("");
    await loadData();
  }

  async function updateTableStatus(tableId: string, status: TableStatus) {
    setErrorMessage("");

    const { error } = await supabase
      .from("tables")
      .update({ status })
      .eq("id", tableId);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    await loadData();
  }

  async function finishCleaning(table: Table) {
  if (!table.current_session_id) return;

  const now = new Date().toISOString();

  await supabase
    .from("table_sessions")
    .update({
      cleaning_finished_at: now,
      closed_at: now,
      status: "closed",
    })
    .eq("id", table.current_session_id);

  await supabase
    .from("tables")
    .update({
      status: "available",
      current_session_id: null,
      occupied_since: null,
      cleaned_at: now,
      last_activity_at: now,
    })
    .eq("id", table.id);

  await loadData();
}

  function getTableMenuUrl(tableNumber: number) {
    if (!branch) return "#";
    return `/menu/${encodeURIComponent(branch.slug)}?table=${tableNumber}`;
  }

  useEffect(() => {
  loadData();

  const tablesChannel = supabase
    .channel(`tables-status-${branchId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "tables",
        filter: `branch_id=eq.${branchId}`,
      },
      () => {
        loadData();
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(tablesChannel);
  };
}, [branchId]);

  return (
    <BranchLayout branchId={branchId}>
      <div className="mx-auto max-w-7xl space-y-8">
        <BranchPageHeader
          title="إدارة الطاولات"
          description="تابع حالة الطاولات، افتح منيو كل طاولة، وأنشئ QR مستقل لكل طاولة."
          branchId={branchId}
        />

        <section className="grid gap-4 md:grid-cols-4">
          <StatCard title="كل الطاولات" value={tables.length} icon="🪑" />
          <StatCard title="متاحة" value={availableCount} icon="🟢" />
          <StatCard title="مشغولة" value={occupiedCount} icon="🔴" />
          <StatCard title="بانتظار الحساب" value={billingCount} icon="🟡" />
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
          <h2 className="mb-4 text-xl font-black">إضافة طاولة جديدة</h2>

          <div className="grid gap-3 md:grid-cols-[1fr_auto]">
            <input
              value={tableNumber}
              onChange={(e) => setTableNumber(e.target.value)}
              placeholder="رقم الطاولة"
              type="number"
              className="rounded-2xl border border-white/10 bg-black/20 p-4 outline-none focus:border-emerald-500"
            />

            <button
              onClick={addTable}
              className="rounded-2xl bg-emerald-500 px-8 py-4 font-black text-black"
            >
              + إضافة طاولة
            </button>
          </div>

          {errorMessage && (
            <div className="mt-4 rounded-2xl bg-red-500/20 p-4 text-red-300">
              {errorMessage}
            </div>
          )}
        </section>

        <section>
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-xl font-black">خريطة الطاولات</h2>
            <p className="text-sm text-gray-400">
              تحتاج تنظيف: {cleaningCount}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {tables.map((table) => {
              const tableUrl = getTableMenuUrl(table.table_number);
              const status = table.status || "available";
              const config = statusConfig[status];
              let occupiedMinutes = 0;

if (table.occupied_since) {
  occupiedMinutes = Math.floor(
    (
      Date.now() -
      new Date(table.occupied_since).getTime()
    ) / 60000
  );
}

              return (
                <div
                  key={table.id}
                  className={`rounded-3xl border bg-white/[0.05] p-5 ${config.border}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`h-3 w-3 rounded-full ${config.dot}`} />
                        <h3 className="text-2xl font-black">
                          طاولة {table.table_number}
                        </h3>
                      </div>

                      <span
                        className={`mt-3 inline-block rounded-full px-3 py-1 text-xs font-black ${config.badge}`}
                      >
                        {table.occupied_since && (
  <p className="mt-2 text-xs text-gray-400">
    ⏱️ مدة الإشغال: {occupiedMinutes} دقيقة
  </p>
)}
                        {config.label}
                      </span>
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-2">
                    <StatusButton
                      label="متاحة"
                      onClick={() => updateTableStatus(table.id, "available")}
                      className="bg-emerald-500/20 text-emerald-300"
                    />

                    <StatusButton
                      label="مشغولة"
                      onClick={() => updateTableStatus(table.id, "occupied")}
                      className="bg-red-500/20 text-red-300"
                    />

                    <StatusButton
                      label="بانتظار الحساب"
                      onClick={() => updateTableStatus(table.id, "billing")}
                      className="bg-yellow-500/20 text-yellow-300"
                    />

                    <StatusButton
                      label="تنظيف"
                      onClick={() => updateTableStatus(table.id, "cleaning")}
                      className="bg-gray-500/20 text-gray-300"
                    />
                  </div>

                  <div className="mt-5 flex flex-col gap-3">
                    {table.status === "cleaning" && (
  <button
    onClick={() => finishCleaning(table)}
    className="rounded-xl bg-emerald-500 px-4 py-3 text-sm font-black text-black"
  >
    ✅ إنهاء التنظيف
  </button>
)}
                    <Link
                      href={tableUrl}
                      className="rounded-xl bg-emerald-500 px-4 py-3 text-center text-sm font-black text-black"
                    >
                      فتح منيو الطاولة
                    </Link>

                    <Link
                      href={`/branch/${branchId}/tables/${table.id}/qr`}
                      className="rounded-xl border border-white/10 px-4 py-3 text-center text-sm font-bold hover:bg-white/10"
                    >
                      QR الطاولة
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </BranchLayout>
  );
}

function StatCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: number;
  icon: string;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-400">{title}</p>
          <p className="mt-2 text-3xl font-black">{value}</p>
        </div>

        <div className="text-3xl">{icon}</div>
      </div>
    </div>
  );
}

function StatusButton({
  label,
  onClick,
  className,
}: {
  label: string;
  onClick: () => void;
  className: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl px-3 py-2 text-xs font-bold ${className}`}
    >
      {label}
    </button>
  );
}