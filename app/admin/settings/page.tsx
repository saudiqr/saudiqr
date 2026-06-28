import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";

type PlatformSettings = {
  id: string;
  platform_name: string;
  website_url: string | null;
  support_whatsapp: string | null;
  support_email: string | null;
  vat_percentage: number | null;
  allow_new_registration: boolean;
  allow_trial_subscription: boolean;
  support_message: string | null;
};

async function updateSettingsAction(formData: FormData) {
  "use server";

  const id = String(formData.get("id") || "");

  await supabase
    .from("platform_settings")
    .update({
      platform_name: String(formData.get("platform_name") || ""),
      website_url: String(formData.get("website_url") || ""),
      support_whatsapp: String(formData.get("support_whatsapp") || ""),
      support_email: String(formData.get("support_email") || ""),
      vat_percentage: Number(formData.get("vat_percentage") || 15),
      allow_new_registration:
        formData.get("allow_new_registration") === "on",
      allow_trial_subscription:
        formData.get("allow_trial_subscription") === "on",
      support_message: String(formData.get("support_message") || ""),
    })
    .eq("id", id);

  revalidatePath("/admin/settings");
}

export default async function AdminSettingsPage() {
  const { data } = await supabase
    .from("platform_settings")
    .select("*")
    .limit(1)
    .single();

  const settings = data as PlatformSettings | null;

  return (
    <main dir="rtl" style={pageStyle}>
      <section style={heroStyle}>
        <div>
          <p style={eyebrowStyle}>SaudiQR Admin</p>
          <h1 style={titleStyle}>إعدادات المنصة</h1>
          <p style={subtitleStyle}>
            التحكم بالإعدادات العامة الخاصة بمنصة SaudiQR.
          </p>
        </div>

        <span style={badgeStyle}>Platform Settings</span>
      </section>

      <section style={cardStyle}>
        <form action={updateSettingsAction} style={formStyle}>
          <input type="hidden" name="id" value={settings?.id || ""} />

          <div style={grid2}>
            <Field label="اسم المنصة">
              <input
                name="platform_name"
                defaultValue={settings?.platform_name || ""}
                style={inputStyle}
              />
            </Field>

            <Field label="رابط الموقع">
              <input
                name="website_url"
                defaultValue={settings?.website_url || ""}
                style={inputStyle}
              />
            </Field>

            <Field label="واتساب الدعم">
              <input
                name="support_whatsapp"
                defaultValue={settings?.support_whatsapp || ""}
                style={inputStyle}
              />
            </Field>

            <Field label="بريد الدعم">
              <input
                name="support_email"
                defaultValue={settings?.support_email || ""}
                style={inputStyle}
              />
            </Field>

            <Field label="نسبة الضريبة %">
              <input
                type="number"
                step="0.01"
                name="vat_percentage"
                defaultValue={settings?.vat_percentage || 15}
                style={inputStyle}
              />
            </Field>
          </div>

          <div style={grid2}>
            <label style={toggleStyle}>
              <span>السماح بالتسجيل الجديد</span>
              <input
                type="checkbox"
                name="allow_new_registration"
                defaultChecked={settings?.allow_new_registration}
              />
            </label>

            <label style={toggleStyle}>
              <span>السماح بالاشتراك التجريبي</span>
              <input
                type="checkbox"
                name="allow_trial_subscription"
                defaultChecked={settings?.allow_trial_subscription}
              />
            </label>
          </div>

          <Field label="رسالة الدعم">
            <textarea
              name="support_message"
              defaultValue={settings?.support_message || ""}
              style={textareaStyle}
            />
          </Field>

          <button style={saveButtonStyle}>حفظ الإعدادات</button>
        </form>
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
  color: "#fff",
  padding: "32px",
  display: "grid",
  gap: "22px",
};

const heroStyle: React.CSSProperties = {
  background:
    "linear-gradient(135deg, rgba(6,78,59,.95), rgba(6,20,15,.98))",
  border: "1px solid rgba(16,185,129,.35)",
  borderRadius: "30px",
  padding: "28px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const eyebrowStyle: React.CSSProperties = {
  color: "#6ee7b7",
  fontWeight: 900,
};

const titleStyle: React.CSSProperties = {
  margin: "10px 0",
  fontSize: "38px",
  fontWeight: 950,
};

const subtitleStyle: React.CSSProperties = {
  color: "#d1fae5",
};

const badgeStyle: React.CSSProperties = {
  padding: "12px 16px",
  borderRadius: "999px",
  background: "rgba(16,185,129,.12)",
  color: "#6ee7b7",
  border: "1px solid rgba(16,185,129,.35)",
};

const cardStyle: React.CSSProperties = {
  background:
    "linear-gradient(135deg, rgba(8,47,35,.98), rgba(6,20,15,.98))",
  border: "1px solid rgba(16,185,129,.35)",
  borderRadius: "30px",
  padding: "24px",
};

const formStyle: React.CSSProperties = {
  display: "grid",
  gap: "18px",
};

const grid2: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2,minmax(0,1fr))",
  gap: "16px",
};

const fieldStyle: React.CSSProperties = {
  display: "grid",
  gap: "8px",
  color: "#a7f3d0",
  fontWeight: 900,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "14px",
  borderRadius: "18px",
  border: "1px solid rgba(16,185,129,.3)",
  background: "rgba(255,255,255,.95)",
  color: "#111827",
};

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  minHeight: "120px",
};

const toggleStyle: React.CSSProperties = {
  border: "1px solid rgba(16,185,129,.18)",
  background: "rgba(255,255,255,.05)",
  borderRadius: "18px",
  padding: "16px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const saveButtonStyle: React.CSSProperties = {
  border: 0,
  borderRadius: "18px",
  padding: "16px",
  background: "linear-gradient(135deg,#10b981,#059669)",
  color: "#fff",
  fontWeight: 950,
  cursor: "pointer",
};
