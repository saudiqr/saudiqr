export default function Home() {
  return (
    <main className="min-h-screen bg-[#06140f] text-white" dir="rtl">
      {/* Header */}
      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500 font-black text-black">
            QR
          </div>

          <div>
            <div className="text-xl font-black">SaudiQR</div>
            <div className="text-xs text-emerald-300">saudiqr.sa</div>
          </div>
        </div>

        <button className="rounded-full bg-white px-5 py-3 text-sm font-bold text-black">
          دخول العميل
        </button>
      </header>

      {/* Hero */}
      <section className="mx-auto grid max-w-7xl items-center gap-12 px-6 py-16 md:grid-cols-2">
        <div>
          <div className="mb-6 inline-flex rounded-full border border-emerald-400/30 bg-emerald-400/10 px-5 py-2 text-sm text-emerald-300">
            منصة سعودية للمنيو الإلكتروني
          </div>

          <h1 className="text-5xl font-black leading-tight md:text-7xl">
            منيو رقمي احترافي
            <br />
            لمطعمك خلال دقائق
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-9 text-gray-300">
            أنشئ QR Code لمطعمك، وعدل المنتجات والأسعار والصور في أي وقت
            بدون الحاجة لإعادة طباعة المنيو.
          </p>

          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <button className="rounded-full bg-emerald-500 px-8 py-4 font-black text-black">
              ابدأ الآن
            </button>

            <button className="rounded-full border border-white/20 px-8 py-4 font-bold">
              مشاهدة نموذج
            </button>
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-white/5 p-5">
          <div className="rounded-[1.5rem] bg-[#0b1f17] p-5">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <div className="text-lg font-black">كافيه الرياض</div>
                <div className="text-sm text-gray-400">Digital Menu</div>
              </div>

              <div className="rounded-xl bg-white p-3 text-black">
                QR
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between rounded-2xl bg-white/10 p-4">
                <span>قهوة عربية</span>
                <span className="text-emerald-300">12 ريال</span>
              </div>

              <div className="flex justify-between rounded-2xl bg-white/10 p-4">
                <span>لاتيه</span>
                <span className="text-emerald-300">16 ريال</span>
              </div>

              <div className="flex justify-between rounded-2xl bg-white/10 p-4">
                <span>كيك تمر</span>
                <span className="text-emerald-300">18 ريال</span>
              </div>

              <div className="flex justify-between rounded-2xl bg-white/10 p-4">
                <span>موهيتو</span>
                <span className="text-emerald-300">14 ريال</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-7xl px-6 py-20">
        <h2 className="mb-12 text-center text-4xl font-black">
          لماذا SaudiQR ؟
        </h2>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
            <h3 className="mb-3 text-xl font-black">QR فوري</h3>
            <p className="text-gray-400">
              إنشاء رمز QR خلال ثوانٍ وربطه بمنيو مطعمك.
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
            <h3 className="mb-3 text-xl font-black">تحديث مباشر</h3>
            <p className="text-gray-400">
              غيّر الأسعار والمنتجات في أي وقت.
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
            <h3 className="mb-3 text-xl font-black">متوافق مع الجوال</h3>
            <p className="text-gray-400">
              تجربة سريعة ومريحة لجميع العملاء.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="mx-auto max-w-7xl px-6 py-20">
        <h2 className="mb-12 text-center text-4xl font-black">
          الباقات
        </h2>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
            <h3 className="text-2xl font-black">مجاني</h3>
            <p className="mt-4 text-4xl font-black">0 ريال</p>
          </div>

          <div className="rounded-3xl border-2 border-emerald-500 bg-white/5 p-8">
            <h3 className="text-2xl font-black">احترافي</h3>
            <p className="mt-4 text-4xl font-black">49 ريال</p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
            <h3 className="text-2xl font-black">أعمال</h3>
            <p className="mt-4 text-4xl font-black">99 ريال</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8 text-center text-gray-400">
        © 2026 SaudiQR.sa - جميع الحقوق محفوظة
      </footer>
    </main>
  );
}