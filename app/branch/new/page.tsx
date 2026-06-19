"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

function createSlug(text: string) {
  return text
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\u0600-\u06FFa-z0-9-]/g, "");
}

export default function NewBranchPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const businessId = searchParams.get("business_id");

  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!businessId) {
      setErrorMessage("معرف النشاط غير موجود");
      return;
    }

    setLoading(true);
    setErrorMessage("");

    const slug = createSlug(name);

    const { error } = await supabase.from("branches").insert({
      business_id: businessId,
      name,
      city,
      phone,
      slug,
      subscription_status: "trial",
    });

    setLoading(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    router.push("/dashboard");
  }

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-[#06140f] px-6 py-10 text-white"
    >
      <div className="mx-auto max-w-xl">
        <h1 className="text-3xl font-black">
          إنشاء فرع جديد
        </h1>

        <form
          onSubmit={handleSubmit}
          className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-6"
        >
          <div className="space-y-5">
            <div>
              <label className="mb-2 block text-sm">
                اسم الفرع
              </label>

              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="فرع التحلية"
                className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-4"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm">
                المدينة
              </label>

              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="جدة"
                className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-4"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm">
                رقم الجوال
              </label>

              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="05xxxxxxxx"
                className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-4"
              />
            </div>
          </div>

          {errorMessage && (
            <div className="mt-4 rounded-2xl bg-red-500/20 p-4">
              {errorMessage}
            </div>
          )}

          <button
            disabled={loading}
            className="mt-6 w-full rounded-2xl bg-emerald-500 py-4 font-black text-black"
          >
            {loading ? "جاري الإنشاء..." : "إنشاء الفرع"}
          </button>
        </form>
      </div>
    </main>
  );
}