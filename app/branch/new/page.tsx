"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { canCreateBranch } from "@/lib/subscriptionAccess";

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
      setErrorMessage("معرف النشاط غير موجود.");
      return;
    }

    if (!name.trim()) {
      setErrorMessage("اكتب اسم الفرع.");
      return;
    }

    setLoading(true);
    setErrorMessage("");

    const access = await canCreateBranch(businessId);

    if (!access.allowed) {
      setLoading(false);
      setErrorMessage(access.reason || "لا يمكن إنشاء فرع جديد حسب الباقة الحالية.");
      return;
    }

    const slug = createSlug(name);

    const { error } = await supabase.from("branches").insert({
      business_id: businessId,
      name: name.trim(),
      city: city.trim() || null,
      phone: phone.trim() || null,
      slug,
      subscription_status: "trial",
    });

    setLoading(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main dir="rtl" style={pageStyle}>
      <section style={heroStyle}>
        <div>
          <p style={eyebrowStyle}>SaudiQR</p>
          <h1 style={heroTitleStyle}>إنشاء فرع جديد</h1>
          <p style={heroTextStyle}>
            أضف بيانات الفرع. سيتم منع الإضافة تلقائياً إذا وصلت لحد الفروع في الباقة.
          </p>
        </div>

        <span style={badgeStyle}>فرع جديد</span>
      </section>

      <section style={contentGridStyle}>
        <article style={cardStyle}>
          <div>
            <h2 style={sectionTitleStyle}>بيانات الفرع</h2>
            <p style={sectionSubtitleStyle}>
              اسم الفرع سيستخدم لإنشاء رابط slug تلقائياً.
            </p>
          </div>

          <form onSubmit={handleSubmit} style={formStyle}>
            <Field label="اسم الفرع">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="فرع التحلية"
                style={inputStyle}
              />
            </Field>

            <Field label="المدينة">
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="جدة"
                style={inputStyle}
              />
            </Field>

            <Field label="رقم الجوال">
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="05xxxxxxxx"
                style={inputStyle}
              />
            </Field>

            {errorMessage ? <div style={errorStyle}>{errorMessage}</div> : null}

            <button disabled={loading} style={buttonStyle}>
              {loading ? "جاري الإنشاء..." : "إنشاء الفرع"}
            </button>
          </form>
        </article>

        <aside style={sideCardStyle}>
          <h2 style={sectionTitleStyle}>تنبيه الباقة</h2>
          <p style={sectionSubtitleStyle}>
            قبل إنشاء الفرع، النظام يتحقق من اشتراك النشاط وحد الفروع المسموح به في الباقة.
          </p>

          <div style={noticeBoxStyle}>
            إذا وصلت للحد الأعلى للفروع، سيظهر تنبيه ولن يتم إنشاء الفرع.
          </div>
        </aside>
      </section>
    </main>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label style={fieldStyle}>
      <span>{label}</span>
      {children}
    </label>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: "100%",
  background: "#06140f",
  color: "#e5e7eb",
  padding: "32px",
  display: "grid",
  gap: "22px",
  boxSizing: "border-box",
};

const heroStyle: React.CSSProperties = {
  background:
    "linear-gradient(135deg, rgba(6,78,59,0.95), rgba(6,20,15,0.98))",
  border: "1px solid rgba(16,185,129,0.42)",
  borderRadius: "30px",
  padding: "28px",
  boxShadow: "0 24px 55px rgba(0,0,0,0.32)",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "18px",
};

const eyebrowStyle: React.CSSProperties = {
  margin: "0 0 10px",
  color: "#6ee7b7",
  fontWeight: 950,
  fontSize: "14px",
};

const heroTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "38px",
  fontWeight: 950,
  color: "#ffffff",
};

const heroTextStyle: React.CSSProperties = {
  margin: "12px 0 0",
  color: "#d1fae5",
  fontWeight: 850,
  fontSize: "16px",
  lineHeight: 1.8,
};

const badgeStyle: React.CSSProperties = {
  border: "1px solid rgba(16,185,129,0.35)",
  background: "rgba(16,185,129,0.12)",
  color: "#6ee7b7",
  borderRadius: "999px",
  padding: "12px 16px",
  fontWeight: 950,
  whiteSpace: "nowrap",
};

const contentGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 340px",
  gap: "18px",
  alignItems: "start",
};

const cardStyle: React.CSSProperties = {
  background:
    "linear-gradient(135deg, rgba(8,47,35,0.98), rgba(6,20,15,0.98))",
  border: "1px solid rgba(16,185,129,0.36)",
  borderRadius: "30px",
  padding: "24px",
  boxShadow: "0 24px 55px rgba(0,0,0,0.30)",
};

const sideCardStyle: React.CSSProperties = {
  ...cardStyle,
  display: "grid",
  gap: "16px",
};

const sectionTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "24px",
  fontWeight: 950,
  color: "#ffffff",
};

const sectionSubtitleStyle: React.CSSProperties = {
  margin: "8px 0 0",
  color: "#a7f3d0",
  fontWeight: 850,
  fontSize: "14px",
  lineHeight: 1.8,
};

const formStyle: React.CSSProperties = {
  display: "grid",
  gap: "16px",
  marginTop: "22px",
};

const fieldStyle: React.CSSProperties = {
  display: "grid",
  gap: "10px",
  color: "#a7f3d0",
  fontWeight: 950,
  fontSize: "14px",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  border: "1px solid rgba(16,185,129,0.32)",
  borderRadius: "18px",
  padding: "16px",
  outline: "none",
  background: "rgba(255,255,255,0.96)",
  color: "#111827",
  fontWeight: 850,
  fontSize: "15px",
  boxSizing: "border-box",
};

const errorStyle: React.CSSProperties = {
  border: "1px solid rgba(239,68,68,0.35)",
  background: "rgba(239,68,68,0.14)",
  color: "#fca5a5",
  borderRadius: "18px",
  padding: "14px",
  fontWeight: 950,
};

const buttonStyle: React.CSSProperties = {
  width: "100%",
  border: "0",
  borderRadius: "18px",
  padding: "16px",
  background: "linear-gradient(135deg, #10b981, #059669)",
  color: "#ffffff",
  fontWeight: 950,
  cursor: "pointer",
  fontSize: "15px",
};

const noticeBoxStyle: React.CSSProperties = {
  border: "1px solid rgba(16,185,129,0.18)",
  background: "rgba(255,255,255,0.055)",
  borderRadius: "18px",
  padding: "16px",
  color: "#d1d5db",
  fontWeight: 850,
  lineHeight: 1.8,
};
