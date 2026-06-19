export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-[#06140f] text-white" dir="rtl">
      <header className="border-b border-white/10 px-6 py-5">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div>
            <h1 className="text-2xl font-black">لوحة تحكم SaudiQR</h1>
            <p className="text-sm text-gray-400">إدارة المطاعم والمنيو والـ QR</p>
          </div>

          <button className="rounded-full bg-white px-5 py-3 text-sm font-bold text-black">
            تسجيل خروج
          </button>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-8 flex items-center justify-between">
          <h2 className="text-3xl font-black">مطاعمي</h2>

          <button className="rounded-2xl bg-emerald-500 px-6 py-4 font-black text-black">
            + إضافة مطعم
          </button>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <h3 className="text-xl font-black">كافيه الرياض</h3>
            <p className="mt-2 text-gray-400">4 منتجات • QR جاهز</p>

            <div className="mt-6 flex gap-3">
              <button className="rounded-xl bg-emerald-500 px-4 py-3 text-sm font-bold text-black">
                إدارة المنيو
              </button>
              <button className="rounded-xl border border-white/10 px-4 py-3 text-sm font-bold">
                عرض QR
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}