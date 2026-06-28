"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  function isValidEmail(value: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim().toLowerCase());
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setMessage("");

    const cleanEmail = email.trim().toLowerCase();

    if (!isValidEmail(cleanEmail)) {
      setMessage("اكتب بريد إلكتروني صحيح.");
      return;
    }

    if (!password) {
      setMessage("اكتب كلمة المرور.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });

    setLoading(false);

    if (error) {
      setMessage("البريد الإلكتروني أو كلمة المرور غير صحيحة.");
      return;
    }

    router.push("/dashboard");
  }

  return (
    <main
      dir="rtl"
      className="h-screen overflow-hidden text-white"
      style={{
        background:
          "radial-gradient(circle at 12% 15%, rgba(198,138,61,.20), transparent 30%), radial-gradient(circle at 90% 80%, rgba(222,165,75,.12), transparent 28%), linear-gradient(135deg, #120D0A, #1B120E 50%, #120D0A)",
      }}
    >
      <style>
        {`
          * { box-sizing: border-box; }

          .page {
            width: 100%;
            height: 100vh;
            padding: 22px;
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
          }

          .page::before,
          .page::after {
            content: "";
            position: absolute;
            width: 520px;
            height: 520px;
            border: 1px solid rgba(222,165,75,.24);
            border-radius: 50%;
            pointer-events: none;
          }

          .page::before {
            top: -360px;
            right: -120px;
          }

          .page::after {
            bottom: -390px;
            left: -140px;
          }

          .shell {
            width: min(1120px, 100%);
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 22px;
            align-items: stretch;
            position: relative;
            z-index: 2;
          }

          .panel {
            height: 750px;
            border-radius: 34px;
            border: 1px solid rgba(198,138,61,.30);
            background: linear-gradient(180deg, rgba(42,33,28,.92), rgba(28,22,18,.97));
            box-shadow: 0 30px 90px rgba(0,0,0,.45);
            overflow: hidden;
            position: relative;
          }

          .hero {
            padding: 42px;
            display: flex;
            flex-direction: column;
            justify-content: center;
          }

          .form {
            padding: 42px;
            display: flex;
            flex-direction: column;
            justify-content: center;
          }

          .brand {
            display: flex;
            align-items: center;
            gap: 14px;
            margin-bottom: 34px;
          }

          .brand-mark {
            width: 58px;
            height: 58px;
            border-radius: 20px;
            background: linear-gradient(135deg, #C68A3D, #DEA54B);
            color: #1C1612;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 950;
            font-size: 20px;
            box-shadow: 0 18px 34px rgba(198,138,61,.22);
          }

          .brand h2 {
            margin: 0;
            font-size: 24px;
            font-weight: 950;
            color: #FFF8F0;
          }

          .brand p {
            margin: 4px 0 0;
            color: #C8B6A4;
            font-weight: 800;
            font-size: 13px;
          }

          .badge {
            width: fit-content;
            border: 1px solid rgba(198,138,61,.40);
            background: rgba(198,138,61,.09);
            color: #DEA54B;
            border-radius: 999px;
            padding: 10px 16px;
            font-weight: 950;
            font-size: 13px;
          }

          .hero h1 {
            margin: 28px 0 0;
            font-size: 54px;
            line-height: 1.14;
            font-weight: 950;
            letter-spacing: -1px;
            color: #FFF8F0;
          }

          .hero h1 span {
            display: block;
            color: #DEA54B;
          }

          .hero-text {
            margin: 18px 0 0;
            color: #C8B6A4;
            font-size: 16px;
            line-height: 1.95;
            font-weight: 800;
            max-width: 520px;
          }

          .features {
            margin-top: 28px;
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
          }

          .feature {
            min-height: 106px;
            border-radius: 22px;
            border: 1px solid rgba(198,138,61,.20);
            background: rgba(22,17,14,.48);
            padding: 16px;
          }

          .feature-icon {
            width: 38px;
            height: 38px;
            border-radius: 14px;
            background: rgba(198,138,61,.14);
            color: #DEA54B;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 10px;
            font-size: 20px;
          }

          .feature h3 {
            margin: 0;
            color: #FFF8F0;
            font-size: 15px;
            font-weight: 950;
          }

          .feature p {
            margin: 6px 0 0;
            color: #C8B6A4;
            font-size: 12px;
            line-height: 1.6;
            font-weight: 750;
          }

          .form-head {
            text-align: center;
            margin-bottom: 22px;
          }

          .form-icon {
            width: 62px;
            height: 62px;
            border-radius: 22px;
            margin: 0 auto 14px;
            background: linear-gradient(135deg, #C68A3D, #DEA54B);
            color: #1C1612;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 26px;
            box-shadow: 0 18px 34px rgba(198,138,61,.20);
          }

          .form-head h1 {
            margin: 0;
            font-size: 32px;
            font-weight: 950;
            color: #FFF8F0;
          }

          .form-head p {
            margin: 8px 0 0;
            color: #C8B6A4;
            font-weight: 800;
            font-size: 14px;
          }

          .form-grid {
            display: grid;
            gap: 13px;
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
            font-size: 17px;
            pointer-events: none;
          }

          .input {
            width: 100%;
            height: 55px;
            border-radius: 18px;
            border: 1px solid rgba(198,138,61,.25);
            background: rgba(22,17,14,.72);
            color: #FFF8F0;
            padding: 0 48px 0 16px;
            outline: none;
            font-weight: 850;
            transition: .2s;
          }

          .input::placeholder {
            color: rgba(200,182,164,.65);
          }

          .input:focus {
            border-color: rgba(222,165,75,.75);
            box-shadow: 0 0 0 4px rgba(198,138,61,.12);
          }

          .btn {
            width: 100%;
            height: 56px;
            border: 0;
            border-radius: 18px;
            background: linear-gradient(135deg, #C68A3D, #DEA54B);
            color: #1C1612;
            font-weight: 950;
            font-size: 16px;
            cursor: pointer;
            box-shadow: 0 16px 34px rgba(198,138,61,.23);
          }

          .btn:disabled {
            opacity: .6;
            cursor: not-allowed;
          }

          .error {
            border-radius: 18px;
            padding: 12px 14px;
            font-weight: 850;
            font-size: 13px;
            line-height: 1.7;
            margin-bottom: 13px;
            border: 1px solid rgba(217,92,92,.42);
            background: rgba(217,92,92,.10);
            color: #FFD6D6;
          }

          .hint {
            margin-top: 14px;
            color: #C8B6A4;
            font-size: 12px;
            line-height: 1.7;
            text-align: center;
            font-weight: 750;
          }

          .switch {
            margin-top: 16px;
            text-align: center;
            color: #C8B6A4;
            font-weight: 800;
            font-size: 14px;
          }

          .switch a {
            color: #DEA54B;
            font-weight: 950;
            text-decoration: none;
          }

          @media (max-width: 980px) {
            main {
              height: auto !important;
              min-height: 100vh;
              overflow: auto !important;
            }

            .page {
              height: auto;
              min-height: 100vh;
            }

            .shell {
              grid-template-columns: 1fr;
            }

            .panel {
              height: auto;
            }
          }
        `}
      </style>

      <div className="page">
        <section className="shell">
          <div className="panel hero">
            <div className="brand">
              <div className="brand-mark">QR</div>
              <div>
                <h2>SaudiQR</h2>
                <p>للمطاعم والكافيهات</p>
              </div>
            </div>

            <div className="badge">♛ نظام منيو وطلبات للمطاعم</div>

            <h1>
              أهلاً بعودتك
              <span>إلى لوحة التحكم</span>
            </h1>

            <p className="hero-text">
              سجل دخولك بالبريد الإلكتروني وكلمة المرور التي أنشأتها عند التسجيل
              لإدارة الفروع والمنيو والطلبات.
            </p>

            <div className="features">
              <FeatureCard icon="▦" title="منيو QR" text="إدارة المنيو والطاولات" />
              <FeatureCard icon="▣" title="الطلبات" text="متابعة الطلبات مباشرة" />
              <FeatureCard icon="♨" title="المطبخ" text="إدارة تحضير الطلبات" />
              <FeatureCard icon="♛" title="الاشتراك" text="متابعة التجربة والباقات" />
            </div>
          </div>

          <form onSubmit={handleSubmit} className="panel form">
            <div className="form-head">
              <div className="form-icon">☕</div>
              <h1>تسجيل الدخول</h1>
              <p>ادخل بيانات حسابك للوصول للوحة التحكم</p>
            </div>

            {message ? <div className="error">{message}</div> : null}

            <div className="form-grid">
              <InputWrap icon="✉">
                <input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="البريد الإلكتروني"
                  type="email"
                  className="input"
                  dir="ltr"
                />
              </InputWrap>

              <InputWrap icon="🔒">
                <input
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="كلمة المرور"
                  type="password"
                  className="input"
                />
              </InputWrap>

              <button type="submit" disabled={loading} className="btn">
                {loading ? "جاري تسجيل الدخول..." : "دخول لوحة التحكم ↗"}
              </button>
            </div>
<div className="mt-4 text-center">
  <button
    type="button"
    onClick={async () => {
      if (!email.trim()) {
        setMessage("اكتب البريد الإلكتروني أولاً.");
        return;
      }

      const { error } = await supabase.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        {
          redirectTo: `${window.location.origin}/reset-password`,
        }
      );

      if (error) {
        setMessage(error.message);
      } else {
        setMessage("تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني.");
      }
    }}
    className="text-[#DEA54B] hover:underline font-bold"
  >
    نسيت كلمة المرور؟
  </button>
</div>
            <p className="hint">
              الدخول يتم بالبريد الإلكتروني وكلمة المرور التي تم إنشاؤها في صفحة التسجيل.
            </p>

            <div className="switch">
              ليس لديك حساب؟ <Link href="/register">إنشاء حساب جديد</Link>
            </div>
          </form>
        </section>
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
    <div className="feature">
      <div className="feature-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}
