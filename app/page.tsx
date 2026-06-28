export default function Home() {
  return (
    <main dir="rtl" className="min-h-screen bg-[var(--bg)] text-[var(--cream)]">
      <style>{`
        :root{
          --bg: #20140d;
          --bg-soft: #2c1c12;
          --surface: #321f15;
          --cream: #f3e6d2;
          --taupe: #b9a187;
          --copper: #c9824a;
          --copper-bright: #e2a35f;
          --gold: #dcab5d;
          --sage: #8a9678;
          --line: rgba(243,230,210,0.10);
        }

        .font-display{
          font-family: Tajawal, Almarai, Arial, sans-serif;
        }

        .mashrabiya{
          background-image:
            radial-gradient(circle at 50% 50%, transparent 38%, var(--line) 39%, var(--line) 41%, transparent 42%),
            linear-gradient(var(--line) 1px, transparent 1px),
            linear-gradient(90deg, var(--line) 1px, transparent 1px);
          background-size: 64px 64px, 32px 32px, 32px 32px;
        }

        .copper-grad{
          background: linear-gradient(135deg, var(--gold), var(--copper));
        }

        .copper-text{
          background: linear-gradient(135deg, var(--gold), var(--copper-bright));
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }

        .ring-fade{
          border: 1px solid transparent;
          background:
            linear-gradient(var(--surface), var(--surface)) padding-box,
            linear-gradient(135deg, var(--copper), transparent 60%) border-box;
        }

        .qr-fake{
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          grid-template-rows: repeat(6, 1fr);
          gap: 3px;
        }

        .qr-fake span{
          background: #1c1109;
          border-radius: 2px;
        }

        .qr-fake span.off{
          background: transparent;
        }

        @keyframes steam{
          0%{ transform: translateY(0) scaleX(1); opacity: 0; }
          20%{ opacity: .55; }
          100%{ transform: translateY(-26px) scaleX(1.6); opacity: 0; }
        }

        .steam{
          animation: steam 2.6s ease-in-out infinite;
        }

        .steam.d2{
          animation-delay: .6s;
        }

        .steam.d3{
          animation-delay: 1.2s;
        }

        @keyframes pour{
          0%, 15%{ stroke-dashoffset: 60; opacity: 0; }
          25%{ opacity: 1; }
          70%{ stroke-dashoffset: 0; opacity: 1; }
          100%{ stroke-dashoffset: 0; opacity: 0; }
        }

        .pour-stream{
          stroke-dasharray: 60;
          stroke-dashoffset: 60;
          animation: pour 3.2s ease-in-out infinite;
        }

        @media (prefers-reduced-motion: reduce){
          .steam,
          .pour-stream{
            animation: none !important;
          }
        }

        .card-hover{
          transition: transform .35s ease, border-color .35s ease, box-shadow .35s ease;
        }

        .card-hover:hover{
          transform: translateY(-6px);
          border-color: rgba(220,171,93,0.45);
          box-shadow: 0 20px 50px -20px rgba(0,0,0,.6);
        }

        .focus-ring:focus-visible{
          outline: 2px solid var(--gold);
          outline-offset: 3px;
        }
      `}</style>

      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-3">
          <div className="copper-grad flex h-11 w-11 items-center justify-center rounded-2xl">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path
                d="M5 11c0-3.5 2-6 7-6s7 2.5 7 6"
                stroke="#20140d"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
              <path
                d="M4 11h16l-1.4 7.2a2 2 0 0 1-2 1.8H7.4a2 2 0 0 1-2-1.8L4 11Z"
                stroke="#20140d"
                strokeWidth="1.8"
                strokeLinejoin="round"
              />
              <path
                d="M19 12.5c2 .2 3 1.3 3 2.6s-1.3 2.4-3.2 2.4"
                stroke="#20140d"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </div>

          <div>
            <div className="font-display text-xl font-black tracking-tight">
              SaudiQR
            </div>
            <div className="text-xs text-[var(--copper-bright)]">
              ضيافتك… بشكل رقمي
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="/register"
            className="focus-ring hidden rounded-full border px-5 py-3 text-sm font-bold transition hover:bg-white/5 sm:inline-block"
            style={{ borderColor: "var(--line)" }}
          >
            تسجيل العميل
          </a>

          <a
            href="/login"
            className="focus-ring rounded-full bg-[var(--cream)] px-5 py-3 text-sm font-bold text-[var(--bg)] transition hover:opacity-90"
          >
            دخول العميل
          </a>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl items-center gap-14 px-6 py-16 md:grid-cols-2">
        <div>
          <div
            className="mb-6 inline-flex items-center gap-2 rounded-full border px-5 py-2 text-sm"
            style={{
              borderColor: "var(--line)",
              color: "var(--copper-bright)",
              background: "rgba(201,130,74,0.08)",
            }}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--copper-bright)]" />
            منصة سعودية للمنيو الإلكتروني
          </div>

          <h1 className="font-display text-5xl font-black leading-[1.15] md:text-6xl">
            ضيافة مطعمك
            <br />
            <span className="copper-text">بلمسة دلّة واحدة</span>
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-9 text-[var(--taupe)]">
            امسح، اطّلع، اطلب. أنشئ منيو رقمي لمطعمك خلال دقائق، وعدّل
            المنتجات والأسعار والصور في أي وقت بدون إعادة طباعة ولا انتظار.
          </p>

          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <a
              href="/register"
              className="focus-ring copper-grad rounded-full px-8 py-4 text-center font-display font-black text-[var(--bg)] transition hover:brightness-110"
            >
              ابدأ الآن مجانًا
            </a>

            <a
              href="#demo"
              className="focus-ring rounded-full border px-8 py-4 text-center font-bold transition hover:bg-white/5"
              style={{ borderColor: "var(--line)" }}
            >
              مشاهدة نموذج
            </a>
          </div>

          <div className="mt-10 flex items-center gap-6 text-sm text-[var(--taupe)]">
            <div>
              <span className="font-display text-xl font-black text-[var(--cream)]">
                +2,400
              </span>{" "}
              مطعم ومقهى
            </div>

            <div className="h-8 w-px bg-[var(--line)]" />

            <div>
              <span className="font-display text-xl font-black text-[var(--cream)]">
                دقيقتان
              </span>{" "}
              متوسط الإعداد
            </div>
          </div>
        </div>

        <div id="demo" className="relative">
          <div className="mashrabiya pointer-events-none absolute -inset-6 rounded-[2.5rem] opacity-50" />

          <div className="ring-fade relative rounded-[2rem] p-6 shadow-2xl">
            <div className="absolute -top-10 right-10 hidden sm:block">
              <svg width="64" height="58" viewBox="0 0 64 58" fill="none">
                <path
                  d="M14 24c0-9 6-15 18-15s18 6 18 15"
                  stroke="var(--copper-bright)"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <path
                  d="M10 24h44l-3 24a4 4 0 0 1-4 3.5H17a4 4 0 0 1-4-3.5L10 24Z"
                  stroke="var(--copper-bright)"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
                <path
                  d="M50 27c5 .5 8 3 8 6.5S55 39 49 39"
                  stroke="var(--copper-bright)"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
                <line
                  x1="32"
                  y1="8"
                  x2="32"
                  y2="1"
                  stroke="var(--copper-bright)"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <path
                  className="pour-stream"
                  d="M11 33c-3 6-3 14-1 22"
                  stroke="var(--copper-bright)"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>

              <div className="absolute -top-3 right-6 flex gap-1">
                <svg className="steam" width="3" height="14">
                  <rect width="3" height="14" rx="1.5" fill="var(--copper-bright)" />
                </svg>
                <svg className="steam d2" width="3" height="14">
                  <rect width="3" height="14" rx="1.5" fill="var(--copper-bright)" />
                </svg>
                <svg className="steam d3" width="3" height="14">
                  <rect width="3" height="14" rx="1.5" fill="var(--copper-bright)" />
                </svg>
              </div>
            </div>

            <div className="rounded-[1.5rem] bg-[var(--bg-soft)] p-5">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <div className="font-display text-lg font-black">
                    كافيه الرياض
                  </div>
                  <div className="text-sm text-[var(--taupe)]">منيو رقمي</div>
                </div>

                <div className="qr-fake h-14 w-14 rounded-lg bg-[var(--cream)] p-1.5">
                  <span></span><span className="off"></span><span></span><span></span><span className="off"></span><span></span>
                  <span className="off"></span><span></span><span className="off"></span><span className="off"></span><span></span><span className="off"></span>
                  <span></span><span className="off"></span><span></span><span></span><span className="off"></span><span></span>
                  <span></span><span className="off"></span><span className="off"></span><span></span><span className="off"></span><span></span>
                  <span className="off"></span><span></span><span className="off"></span><span></span><span></span><span className="off"></span>
                  <span></span><span></span><span className="off"></span><span className="off"></span><span></span><span></span>
                </div>
              </div>

              <div className="space-y-3">
                <MenuRow name="قهوة عربية" price="12 ريال" />
                <MenuRow name="لاتيه" price="16 ريال" />
                <MenuRow name="كيك تمر" price="18 ريال" />
                <MenuRow name="موهيتو" price="14 ريال" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-20">
        <h2 className="font-display mb-3 text-center text-4xl font-black">
          لماذا SaudiQR؟
        </h2>

        <p className="mx-auto mb-14 max-w-md text-center text-[var(--taupe)]">
          كل اللي يحتاجه مطعمك عشان يقدّم تجربة رقمية أنيقة، بدون تعقيد.
        </p>

        <div className="grid gap-6 md:grid-cols-3">
          <FeatureCard
            title="QR فوري"
            text="أنشئ رمز QR خلال ثوانٍ واطبعه أو شاركه رقميًا مباشرة على طاولاتك."
            icon="qr"
          />

          <FeatureCard
            title="تحديث مباشر"
            text="غيّر الأسعار والمنتجات في أي وقت، والتغيير ينعكس فورًا على كل الطاولات."
            icon="edit"
          />

          <FeatureCard
            title="متوافق مع الجوال"
            text="تجربة سريعة ومريحة لعملائك على أي جهاز، بدون تطبيقات إضافية."
            icon="phone"
          />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-20">
        <h2 className="font-display mb-14 text-center text-4xl font-black">
          الباقات
        </h2>

        <div className="grid gap-6 md:grid-cols-3">
          <PricingCard
            name="مجاني"
            price="0"
            suffix="ريال"
            description="للمقاهي الصغيرة والبدايات"
            items={["منيو واحد · حتى 20 منتج", "QR ثابت"]}
          />

          <PricingCard
            name="احترافي"
            price="49"
            suffix="ريال/شهر"
            description="للمطاعم والمقاهي النشطة"
            items={[
              "منتجات غير محدودة",
              "تحديث فوري للأسعار والصور",
              "تصميم منيو مخصص",
            ]}
            featured
          />

          <PricingCard
            name="أعمال"
            price="99"
            suffix="ريال/شهر"
            description="لسلاسل الفروع المتعددة"
            items={["عدد فروع غير محدود", "تقارير وتحليلات", "دعم أولوية"]}
          />
        </div>
      </section>

      <footer
        className="border-t py-8 text-center text-sm text-[var(--taupe)]"
        style={{ borderColor: "var(--line)" }}
      >
        © 2026 SaudiQR.sa — جميع الحقوق محفوظة
      </footer>
    </main>
  );
}

function MenuRow({ name, price }: { name: string; price: string }) {
  return (
    <div
      className="flex items-center justify-between rounded-2xl px-4 py-3.5"
      style={{ background: "rgba(243,230,210,0.06)" }}
    >
      <span>{name}</span>
      <span className="font-display font-bold text-[var(--gold)]">{price}</span>
    </div>
  );
}

function FeatureCard({
  title,
  text,
  icon,
}: {
  title: string;
  text: string;
  icon: "qr" | "edit" | "phone";
}) {
  return (
    <div
      className="card-hover rounded-3xl border p-8"
      style={{ borderColor: "var(--line)", background: "var(--surface)" }}
    >
      <div
        className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl"
        style={{ background: "rgba(220,171,93,0.12)" }}
      >
        {icon === "qr" && (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="3" width="7" height="7" rx="1.5" stroke="var(--gold)" strokeWidth="1.8" />
            <rect x="14" y="3" width="7" height="7" rx="1.5" stroke="var(--gold)" strokeWidth="1.8" />
            <rect x="3" y="14" width="7" height="7" rx="1.5" stroke="var(--gold)" strokeWidth="1.8" />
            <path d="M14 14h3v3h-3zM18 18h3v3h-3z" stroke="var(--gold)" strokeWidth="1.8" />
          </svg>
        )}

        {icon === "edit" && (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M4 20l1-4 11-11 3 3-11 11-4 1Z" stroke="var(--gold)" strokeWidth="1.8" strokeLinejoin="round" />
          </svg>
        )}

        {icon === "phone" && (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <rect x="7" y="2" width="10" height="20" rx="2" stroke="var(--gold)" strokeWidth="1.8" />
            <line x1="11" y1="18" x2="13" y2="18" stroke="var(--gold)" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        )}
      </div>

      <h3 className="font-display mb-2 text-xl font-black">{title}</h3>
      <p className="text-[var(--taupe)]">{text}</p>
    </div>
  );
}

function PricingCard({
  name,
  price,
  suffix,
  description,
  items,
  featured,
}: {
  name: string;
  price: string;
  suffix: string;
  description: string;
  items: string[];
  featured?: boolean;
}) {
  return (
    <div
      className={`card-hover relative rounded-3xl p-8 ${
        featured ? "" : "border"
      }`}
      style={
        featured
          ? {
              border: "2px solid var(--copper)",
              background:
                "linear-gradient(180deg, rgba(220,171,93,0.08), var(--surface))",
            }
          : { borderColor: "var(--line)", background: "var(--surface)" }
      }
    >
      {featured && (
        <div className="copper-grad absolute -top-3 right-8 rounded-full px-3 py-1 text-xs font-bold text-[var(--bg)]">
          الأكثر طلبًا
        </div>
      )}

      <h3 className="font-display text-2xl font-black">{name}</h3>

      <p className="font-display mt-4 text-4xl font-black">
        {price}{" "}
        <span className="text-lg font-bold text-[var(--taupe)]">{suffix}</span>
      </p>

      <p className="mt-2 text-sm text-[var(--taupe)]">{description}</p>

      <ul className="mt-6 space-y-2 text-sm text-[var(--taupe)]">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
