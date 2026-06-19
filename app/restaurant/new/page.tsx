"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function NewRestaurantPage() {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSave() {
    setLoading(true);
    setMessage("");

   const { data, error } = await supabase
  .from("restaurants")
  .insert({
    name,
    slug,
    whatsapp,
    user_id: null,
  })
  .select();

console.log("DATA:", data);
console.log("ERROR:", error);

    if (error) {
      setMessage("صار خطأ: " + error.message);
    } else {
      setMessage("تم حفظ المطعم بنجاح في قاعدة البيانات.");
      setName("");
      setSlug("");
      setWhatsapp("");
    }

    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-[#06140f] px-6 py-10 text-white" dir="rtl">
      <div className="mx-auto max-w-2xl rounded-3xl border border-white/10 bg-white/5 p-8">
        <h1 className="text-3xl font-black">إضافة مطعم جديد</h1>
        <p className="mt-3 text-gray-400">أدخل بيانات المطعم الأساسية.</p>

        <div className="mt-8 space-y-4">
          <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-2xl border border-white/10 bg-black/20 px-5 py-4 outline-none" placeholder="اسم المطعم" />
          <input value={slug} onChange={(e) => setSlug(e.target.value)} className="w-full rounded-2xl border border-white/10 bg-black/20 px-5 py-4 outline-none" placeholder="رابط مخصص مثل: cafe-riyadh" />
          <input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} className="w-full rounded-2xl border border-white/10 bg-black/20 px-5 py-4 outline-none" placeholder="رقم واتساب المطعم" />

          <button onClick={handleSave} disabled={loading} className="w-full rounded-2xl bg-emerald-500 px-5 py-4 font-black text-black">
            {loading ? "جاري الحفظ..." : "حفظ وإنشاء المنيو"}
          </button>

          {message && <p className="text-sm text-emerald-300">{message}</p>}
        </div>
      </div>
    </main>
  );
}