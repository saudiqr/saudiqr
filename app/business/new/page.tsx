"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

function createSlug(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\u0600-\u06FFa-z0-9-]/g, "");
}

export default function NewBusinessPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleCreateBusiness(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMessage("");

    if (!name.trim()) {
      setErrorMessage("اكتب اسم النشاط التجاري.");
      return;
    }

    setLoading(true);

const { data: appUser, error: appUserError } = await supabase
  .from("users")
  .select("id")
  .limit(1)
  .single();

if (appUserError || !appUser) {
  setLoading(false);
  setErrorMessage("لا يوجد مستخدم في جدول users. سجل رقم جوال أولاً.");
  return;
}

const { error } = await supabase.from("businesses").insert({
  user_id: appUser.id,
  name: name.trim(),
  logo_url: null,
});

    setLoading(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-[#06140f] px-6 py-10 text-white" dir="rtl">
      <section className="mx-auto max-w-xl">
        <h1 className="text-3xl font-black">إنشاء نشاط تجاري جديد</h1>
        <p className="mt-3 text-gray-400">
          ابدأ بإضافة اسم النشاط، وبعدها تضيف الفروع.
        </p>

        <form
          onSubmit={handleCreateBusiness}
          className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-6"
        >
          <label className="text-sm font-bold">اسم النشاط التجاري</label>

          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="مثال: كوفي علي"
            className="mt-3 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-4 text-white outline-none focus:border-emerald-500"
          />

          {errorMessage && (
            <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
              {errorMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-6 w-full rounded-2xl bg-emerald-500 px-6 py-4 font-black text-black disabled:opacity-60"
          >
            {loading ? "جاري الإنشاء..." : "إنشاء النشاط"}
          </button>
        </form>
      </section>
    </main>
  );
}