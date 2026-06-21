"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import BranchPageHeader from "@/components/BranchPageHeader";
import BranchLayout from "@/components/BranchLayout";

type Category = {
  id: string;
  name: string;
  sort_order: number | null;
};

export default function CategoriesPage() {
  const params = useParams();
  const branchId = params.id as string;

  const [name, setName] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function fetchCategories() {
    const { data, error } = await supabase
      .from("categories")
      .select("id, name, sort_order")
      .eq("branch_id", branchId)
      .order("created_at", { ascending: true });

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setCategories(data || []);
  }

  async function addCategory() {
    setErrorMessage("");

    if (!name.trim()) {
      setErrorMessage("اكتب اسم القسم.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.from("categories").insert({
      branch_id: branchId,
      name: name.trim(),
      sort_order: categories.length + 1,
    });

    setLoading(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setName("");
    fetchCategories();
  }

  useEffect(() => {
    fetchCategories();
  }, []);

  return (
     <BranchLayout branchId={branchId}>
      <BranchPageHeader
  title="إدارة الأقسام"
  description="أضف الأقسام ورتبها لتظهر بشكل منظم داخل المنيو."
  branchId={branchId}
/>

      <div className="mt-8 max-w-md">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="اسم القسم"
          className="w-full rounded-2xl border border-white/10 bg-black/20 px-5 py-4"
        />

        <button
          onClick={addCategory}
          disabled={loading}
          className="mt-4 rounded-2xl bg-emerald-500 px-6 py-4 font-black text-black disabled:opacity-60"
        >
          {loading ? "جاري الإضافة..." : "+ إضافة قسم"}
        </button>

        {errorMessage && (
          <div className="mt-4 rounded-2xl bg-red-500/20 p-4 text-red-300">
            {errorMessage}
          </div>
        )}
      </div>

      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {categories.map((category) => (
          <div
            key={category.id}
            className="rounded-2xl border border-white/10 bg-white/5 p-5"
          >
            <h2 className="text-xl font-black">{category.name}</h2>
          </div>
        ))}
      </div>
    </BranchLayout>
  );
}