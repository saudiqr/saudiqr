export default function VerifyPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#06140f] px-6 text-white" dir="rtl">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8">
        <h1 className="text-3xl font-black">رمز التحقق</h1>

        <p className="mt-3 text-gray-400">
          أدخل رمز التحقق المرسل إلى جوالك.
        </p>

        <div className="mt-8 space-y-4">
          <input
            className="w-full rounded-2xl border border-white/10 bg-black/20 px-5 py-4 text-center text-2xl tracking-[10px] outline-none"
            placeholder="123456"
            maxLength={6}
          />

          <button className="w-full rounded-2xl bg-emerald-500 px-5 py-4 font-black text-black">
            تأكيد الدخول
          </button>
        </div>
      </div>
    </main>
  );
}