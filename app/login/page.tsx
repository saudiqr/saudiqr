"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleLogin() {
    setLoading(true);
    setMessage("");

    const cleanPhone = phone.trim();

    const { error } = await supabase.from("users").insert({
      phone: cleanPhone,
    });

    if (error) {
      setMessage("صار خطأ: " + error.message);
    } else {
      setMessage("تم حفظ رقم الجوال بنجاح في قاعدة البيانات.");
    }

    setLoading(false);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#06140f] px-6 text-white" dir="rtl">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8">
        <h1 className="text-3xl font-black">الدخول برقم الجوال</h1>
        <p className="mt-3 text-gray-400">
          أدخل رقم جوالك لتجربة الاتصال بقاعدة البيانات.
        </p>

        <div className="mt-8 space-y-4">
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-black/20 px-5 py-4 outline-none"
            placeholder="05xxxxxxxx"
            type="tel"
          />

          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full rounded-2xl bg-emerald-500 px-5 py-4 font-black text-black"
          >
            {loading ? "جاري الحفظ..." : "إرسال رمز التحقق"}
          </button>

          {message && <p className="text-sm text-emerald-300">{message}</p>}
        </div>
      </div>
    </main>
  );
}