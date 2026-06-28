"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleResetPassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setLoading(true);
    setMessage("");
    setErrorMsg("");

    const redirectTo = `${window.location.origin}/reset-password`;

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    if (error) {
      setErrorMsg("حدث خطأ أثناء إرسال رابط إعادة التعيين.");
      setLoading(false);
      return;
    }

    setMessage("تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني.");
    setEmail("");
    setLoading(false);
  }

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-[#16110E] px-4 text-[#FFF8F0]"
    >
      <div className="flex min-h-screen items-center justify-center">
        <section className="w-full max-w-md rounded-[28px] border border-[#4A3425] bg-[#241B16] p-8 shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl border border-[#4A3425] bg-[#2A211C] text-2xl font-black text-[#C68A3D]">
              S
            </div>

            <h1 className="text-3xl font-bold text-[#FFF8F0]">
              نسيت كلمة المرور
            </h1>

            <p className="mt-3 text-sm leading-7 text-[#C8B6A4]">
              أدخل بريدك الإلكتروني وسنرسل لك رابط إعادة تعيين كلمة المرور.
            </p>
          </div>

          <form onSubmit={handleResetPassword} className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-[#C8B6A4]">
                البريد الإلكتروني
              </label>

              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@email.com"
                className="w-full rounded-2xl border border-[#4A3425] bg-[#1C1612] px-4 py-3 text-[#FFF8F0] outline-none transition placeholder:text-[#C8B6A4]/45 focus:border-[#C68A3D]"
              />
            </div>

            {errorMsg && (
              <div className="rounded-2xl border border-[#D95C5C]/40 bg-[#D95C5C]/10 p-3 text-sm leading-7 text-[#D95C5C]">
                {errorMsg}
              </div>
            )}

            {message && (
              <div className="rounded-2xl border border-[#65C466]/40 bg-[#65C466]/10 p-3 text-sm leading-7 text-[#65C466]">
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-[#C68A3D] px-5 py-3 font-bold text-[#16110E] transition hover:bg-[#DEA54B] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "جاري الإرسال..." : "إرسال رابط إعادة التعيين"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link
              href="/login"
              className="text-sm font-semibold text-[#C68A3D] transition hover:text-[#DEA54B]"
            >
              العودة لتسجيل الدخول
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
