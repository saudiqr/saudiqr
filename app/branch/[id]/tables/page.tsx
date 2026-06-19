"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Table = {
  id: string;
  table_number: number;
};

type Branch = {
  id: string;
  slug: string;
};

export default function TablesPage() {
  const params = useParams();
  const branchId = params.id as string;

  const [tables, setTables] = useState<Table[]>([]);
  const [branch, setBranch] = useState<Branch | null>(null);
  const [tableNumber, setTableNumber] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  async function loadData() {
    const { data: branchData } = await supabase
      .from("branches")
      .select("id, slug")
      .eq("id", branchId)
      .single();

    setBranch(branchData);

    const { data, error } = await supabase
      .from("tables")
      .select("id, table_number")
      .eq("branch_id", branchId)
      .order("table_number", { ascending: true });

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setTables(data || []);
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
    });

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setTableNumber("");
    await loadData();
  }

  function getTableMenuUrl(tableNumber: number) {
    if (!branch) return "#";

    return `/menu/${encodeURIComponent(branch.slug)}?table=${tableNumber}`;
  }

  useEffect(() => {
    loadData();
  }, []);

  return (
    <main dir="rtl" className="min-h-screen bg-[#06140f] p-10 text-white">
      <h1 className="text-4xl font-black">إدارة الطاولات</h1>

      <div className="mt-8 max-w-md rounded-3xl border border-white/10 bg-white/5 p-6">
        <input
          value={tableNumber}
          onChange={(e) => setTableNumber(e.target.value)}
          placeholder="رقم الطاولة"
          type="number"
          className="w-full rounded-2xl bg-black/20 p-4"
        />

        {errorMessage && (
          <div className="mt-4 rounded-2xl bg-red-500/20 p-4 text-red-300">
            {errorMessage}
          </div>
        )}

        <button
          onClick={addTable}
          className="mt-4 w-full rounded-2xl bg-emerald-500 px-6 py-4 font-black text-black"
        >
          + إضافة طاولة
        </button>
      </div>

      <div className="mt-10 grid gap-4 md:grid-cols-4">
        {tables.map((table) => {
          const tableUrl = getTableMenuUrl(table.table_number);

          return (
            <div
              key={table.id}
              className="rounded-2xl border border-white/10 bg-white/5 p-5"
            >
              <h2 className="text-2xl font-black">
                طاولة {table.table_number}
              </h2>

              <p className="mt-3 break-all text-xs text-gray-400">
                {tableUrl}
              </p>

              <div className="mt-5 flex flex-col gap-3">
                <Link
                  href={tableUrl}
                  className="rounded-xl bg-emerald-500 px-4 py-3 text-center text-sm font-bold text-black"
                >
                  فتح منيو الطاولة
                </Link>

                <Link
                  href={`/branch/${branchId}/tables/${table.id}/qr`}
                  className="rounded-xl border border-white/10 px-4 py-3 text-center text-sm font-bold"
                >
                  QR الطاولة
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}