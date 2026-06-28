"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const theme = {
  bg: "#16110E",
  bg2: "#1C1612",
  card: "#241B16",
  card2: "#2A211C",
  border: "#4A3425",
  gold: "#C68A3D",
  goldHover: "#DEA54B",
  text: "#FFF8F0",
  muted: "#C8B6A4",
  success: "#65C466",
  error: "#D95C5C",
};

export default function RegisterPage() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setErrorMessage("");
    setSuccessMessage("");

    const cleanName = fullName.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone.trim();

    if (!cleanName) {
      setErrorMessage("اكتب الاسم الكامل.");
      return;
    }

    if (!cleanEmail) {
      setErrorMessage("اكتب البريد الإلكتروني.");
      return;
    }

    if (password.length < 6) {
      setErrorMessage("كلمة المرور لازم تكون 6 أحرف على الأقل.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("تأكيد كلمة المرور غير مطابق.");
      return;
    }

    setLoading(true);

    const redirectTo =
      typeof window !== "undefined"
        ? `${window.location.origin}/onboarding`
        : undefined;

    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        emailRedirectTo: redirectTo,
        data: {
          full_name: cleanName,
          phone: cleanPhone || null,
        },
      },
    });

    setLoading(false);

    if (error) {
      setErrorMessage(error.message || "تعذر إنشاء الحساب.");
      return;
    }

    if (data.session) {
      router.push("/onboarding");
      return;
    }

    setSuccessMessage("تم إنشاء الحساب. افتح بريدك الإلكتروني واضغط رابط التفعيل.");
  }

  return (
    <main
      dir="rtl"
      className="min-h-screen overflow-hidden px-5 py-4 text-white"
      style={{
        background:
          "radial-gradient(circle at 15% 10%, rgba(198,138,61,.22), transparent 28%), radial-gradient(circle at 90% 80%, rgba(222,165,75,.13), transparent 32%), linear-gradient(135deg, #120D0A, #1C120D 48%, #120D0A)",
      }}
    >
      <style>
        {`
          * { box-sizing: border-box; }

          .gold-line-top {
            position: absolute;
            inset: 0;
            pointer-events: none;
            overflow: hidden;
          }

          .gold-line-top::before,
          .gold-line-top::after {
            content: "";
            position: absolute;
            width: 520px;
            height: 520px;
            border: 1px solid rgba(222,165,75,.32);
            border-radius: 50%;
            transform: rotate(-20deg);
          }

          .gold-line-top::before {
            top: -350px;
            right: -120px;
          }

          .gold-line-top::after {
            bottom: -390px;
            left: -160px;
          }

          .page-shell {
    width: 100%;
    max-width: 1160px;
    min-height: calc(100vh - 32px);
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 18px;
    position: relative;
    z-index: 2;
}

          .brand {
            text-align: center;
          }

          .brand-mark {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 72px;
            height: 72px;
            border-radius: 24px;
            background: linear-gradient(135deg, #C68A3D, #DEA54B);
            color: #1C1612;
            font-size: 28px;
            font-weight: 950;
            box-shadow: 0 18px 38px rgba(198,138,61,.22);
          }

          .brand h1 {
            margin: 10px 0 0;
            font-size: 27px;
            font-weight: 950;
            color: #FFF8F0;
          }

          .brand p {
            margin: 6px 0 0;
            color: #C8B6A4;
            font-weight: 800;
          }

          .register-grid {
            display: grid;
            grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
            gap: 24px;
            align-items: stretch;
          }

          .panel {
            min-height: 560px;
            background: linear-gradient(180deg, rgba(42,33,28,.92), rgba(28,22,18,.96));
            border: 1px solid rgba(198,138,61,.30);
            border-radius: 34px;
            box-shadow: 0 26px 80px rgba(0,0,0,.42);
            position: relative;
            overflow: hidden;
          }

          .marketing-panel {
            padding: 36px;
            display: flex;
            flex-direction: column;
            justify-content: center;
          }

          .form-panel {
            padding: 36px;
            display: flex;
            flex-direction: column;
            justify-content: center;
          }

          .coffee-glow {
            position: absolute;
            width: 280px;
            height: 280px;
            border-radius: 999px;
            background: rgba(198,138,61,.12);
            top: -140px;
            right: -120px;
          }

          .badge {
            width: fit-content;
            border: 1px solid rgba(198,138,61,.40);
            background: rgba(198,138,61,.09);
            color: #DEA54B;
            border-radius: 999px;
            padding: 10px 16px;
            font-weight: 950;
            display: inline-flex;
            align-items: center;
            gap: 8px;
          }

          .hero-title {
            margin: 34px 0 0;
            font-size: clamp(40px, 5vw, 64px);
            line-height: 1.18;
            font-weight: 950;
            color: #FFF8F0;
            letter-spacing: -1px;
          }

          .hero-title span {
            display: block;
            color: #DEA54B;
          }

          .hero-text {
            margin: 20px 0 0;
            color: #C8B6A4;
            font-size: 17px;
            line-height: 2;
            font-weight: 800;
            max-width: 520px;
          }

          .feature-grid {
            margin-top: 30px;
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 14px;
          }

          .feature-card {
            border: 1px solid rgba(198,138,61,.20);
            background: rgba(22,17,14,.50);
            border-radius: 22px;
            padding: 18px;
            min-height: 112px;
          }

          .feature-icon {
            width: 42px;
            height: 42px;
            border-radius: 15px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(198,138,61,.13);
            color: #DEA54B;
            font-size: 22px;
            margin-bottom: 12px;
          }

          .feature-card h3 {
            margin: 0;
            color: #FFF8F0;
            font-size: 16px;
            font-weight: 950;
          }

          .feature-card p {
            margin: 8px 0 0;
            color: #C8B6A4;
            font-size: 13px;
            line-height: 1.7;
            font-weight: 750;
          }

          .form-head {
            text-align: center;
            margin-bottom: 24px;
          }

          .form-icon {
            width: 64px;
            height: 64px;
            border-radius: 22px;
            background: linear-gradient(135deg, #C68A3D, #DEA54B);
            color: #1C1612;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 28px;
            font-weight: 950;
            margin-bottom: 16px;
          }

          .form-head h2 {
            margin: 0;
            font-size: 33px;
            font-weight: 950;
            color: #FFF8F0;
          }

          .form-head p {
            margin: 8px 0 0;
            color: #C8B6A4;
            font-weight: 800;
          }

          .input-wrap {
            position: relative;
          }

          .input-icon {
            position: absolute;
            right: 16px;
            top: 50%;
            transform: translateY(-50%);
            color: #DEA54B;
            font-size: 18px;
            pointer-events: none;
          }

          .sq-input {
            width: 100%;
            height: 56px;
            border-radius: 18px;
            border: 1px solid rgba(198,138,61,.24);
            background: rgba(22,17,14,.70);
            color: #FFF8F0;
            padding: 0 48px 0 16px;
            outline: none;
            font-weight: 850;
            transition: .2s;
          }

          .sq-input::placeholder {
            color: rgba(200,182,164,.68);
          }

          .sq-input:focus {
            border-color: rgba(222,165,75,.75);
            box-shadow: 0 0 0 4px rgba(198,138,61,.12);
          }

          .form-grid {
            display: grid;
            gap: 14px;
          }

          .sq-btn {
            width: 100%;
            height: 58px;
            border: 0;
            border-radius: 18px;
            background: linear-gradient(135deg, #C68A3D, #DEA54B);
            color: #1C1612;
            font-size: 17px;
            font-weight: 950;
            cursor: pointer;
            box-shadow: 0 16px 32px rgba(198,138,61,.24);
            transition: .2s;
          }

          .sq-btn:hover {
            filter: brightness(1.04);
            transform: translateY(-1px);
          }

          .sq-btn:disabled {
            cursor: not-allowed;
            opacity: .58;
            transform: none;
          }

          .alert-error,
          .alert-success {
            border-radius: 18px;
            padding: 13px 15px;
            font-weight: 850;
            font-size: 14px;
            line-height: 1.8;
            margin-bottom: 14px;
          }

          .alert-error {
            border: 1px solid rgba(217,92,92,.42);
            background: rgba(217,92,92,.10);
            color: #FFD6D6;
          }

          .alert-success {
            border: 1px solid rgba(101,196,102,.42);
            background: rgba(101,196,102,.10);
            color: #D7FFD8;
          }

          .login-link {
            margin-top: 20px;
            text-align: center;
            color: #C8B6A4;
            font-weight: 800;
          }

          .login-link a {
            color: #DEA54B;
            text-decoration: none;
            font-weight: 950;
          }

          .footer-points {
            display: flex;
            justify-content: center;
            gap: 24px;
            flex-wrap: wrap;
            color: #C8B6A4;
            font-weight: 850;
            font-size: 13px;
          }

          .footer-points span {
            display: inline-flex;
            align-items: center;
            gap: 8px;
          }

          .footer-points b {
            color: #DEA54B;
          }

          @media (max-width: 1050px) {
            .register-grid {
              grid-template-columns: 1fr;
            }

            .panel {
              min-height: auto;
            }

            .marketing-panel,
            .form-panel {
              padding: 28px;
            }
          }

          @media (max-width: 640px) {
            main {
              padding: 16px !important;
            }

            .feature-grid {
              grid-template-columns: 1fr;
            }

            .hero-title {
              font-size: 38px;
            }
          }
        `}
      </style>

      <div className="gold-line-top" />

      <div className="page-shell">
        <div className="brand">
          <div className="brand-mark">QR</div>
          <h1>SaudiQR</h1>
          <p>للمطاعم والكافيهات</p>
        </div>

        <section className="register-grid">
          <div className="panel marketing-panel">
            <div className="coffee-glow" />

            <div style={{ position: "relative", zIndex: 2 }}>
              <div className="badge">♛ أفضل نظام لإدارة المطاعم والكافيهات</div>

              <h2 className="hero-title">
                ابدأ تجربة مجانية
                <span>لمدة 7 أيام</span>
              </h2>

              <p className="hero-text">
                أنشئ حسابك، فعّل بريدك الإلكتروني، ثم أكمل بيانات المطعم وابدأ
                تجربة المنيو والطلبات والمطبخ والكاشير بدون أي دفع.
              </p>

              <div className="feature-grid">
                <FeatureCard icon="⚡" title="تشغيل سريع" text="إعداد حسابك في دقائق." />
                <FeatureCard icon="▦" title="QR للطاولات" text="كل طاولة لها رابط خاص." />
                <FeatureCard icon="🔗" title="رابط خاص" text="رابط منيو مستقل لكل فرع." />
                <FeatureCard icon="🔒" title="آمن وموثوق" text="حماية بياناتك بشكل كامل." />
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="panel form-panel">
            <div className="form-head">
              <div className="form-icon">👤</div>
              <h2>إنشاء حساب جديد</h2>
              <p>املأ البيانات التالية لإنشاء حسابك</p>
            </div>

            {errorMessage && <div className="alert-error">{errorMessage}</div>}
            {successMessage && <div className="alert-success">{successMessage}</div>}

            <div className="form-grid">
              <InputWrap icon="👤">
                <input
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  className="sq-input"
                  placeholder="الاسم الكامل"
                />
              </InputWrap>

              <InputWrap icon="✉">
                <input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="sq-input"
                  placeholder="البريد الإلكتروني"
                  type="email"
                  dir="ltr"
                />
              </InputWrap>

              <InputWrap icon="☎">
                <input
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  className="sq-input"
                  placeholder="رقم الجوال اختياري"
                  dir="ltr"
                />
              </InputWrap>

              <InputWrap icon="🔒">
                <input
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="sq-input"
                  placeholder="كلمة المرور"
                  type="password"
                />
              </InputWrap>

              <InputWrap icon="🔒">
                <input
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="sq-input"
                  placeholder="تأكيد كلمة المرور"
                  type="password"
                />
              </InputWrap>

              <button type="submit" disabled={loading} className="sq-btn">
                {loading ? "جاري إنشاء الحساب..." : "إنشاء الحساب وبدء التجربة"}
              </button>
            </div>

            <p
              style={{
                marginTop: "15px",
                color: theme.muted,
                fontSize: "13px",
                lineHeight: "1.8",
                textAlign: "center",
                fontWeight: 750,
              }}
            >
              بالتسجيل، سيتم إرسال رابط التفعيل إلى بريدك الإلكتروني.
            </p>

            <div className="login-link">
              لديك حساب بالفعل؟ <Link href="/login">تسجيل الدخول</Link>
            </div>
          </form>
        </section>

        <div className="footer-points">
          <span><b>✓</b> بدون بطاقة دفع</span>
          <span><b>✓</b> تجربة كاملة</span>
          <span><b>✓</b> دعم فني</span>
          <span><b>✓</b> إلغاء في أي وقت</span>
        </div>
      </div>
    </main>
  );
}

function InputWrap({
  icon,
  children,
}: {
  icon: string;
  children: React.ReactNode;
}) {
  return (
    <div className="input-wrap">
      <span className="input-icon">{icon}</span>
      {children}
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  text,
}: {
  icon: string;
  title: string;
  text: string;
}) {
  return (
    <div className="feature-card">
      <div className="feature-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}
