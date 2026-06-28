"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Settings = {
  id?: string;
  branch_id: string;

  logo_url: string | null;
  cover_url: string | null;
  primary_color: string;
  phone: string | null;
  whatsapp: string | null;
  instagram: string | null;
  snapchat: string | null;
  description: string | null;

  is_open: boolean;
  is_busy: boolean;

  tax_enabled: boolean;
  tax_percentage: number;

  service_fee_enabled: boolean;
  service_fee: number;

  minimum_order: number;

  open_time: string | null;
  close_time: string | null;

  whatsapp_notifications: boolean;
  whatsapp_number: string | null;
};

const defaultPrimaryColor = "#C68A3D";

export default function BranchSettingsPage() {
  const params = useParams();
  const branchId = params.id as string;

  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  function createDefaultSettings(): Settings {
    return {
      branch_id: branchId,
      logo_url: null,
      cover_url: null,
      primary_color: defaultPrimaryColor,
      phone: "",
      whatsapp: "",
      instagram: "",
      snapchat: "",
      description: "",
      is_open: true,
      is_busy: false,
      tax_enabled: false,
      tax_percentage: 15,
      service_fee_enabled: false,
      service_fee: 0,
      minimum_order: 0,
      open_time: "09:00",
      close_time: "23:00",
      whatsapp_notifications: false,
      whatsapp_number: "",
    };
  }

  async function loadSettings() {
    const { data } = await supabase
      .from("branch_settings")
      .select("*")
      .eq("branch_id", branchId)
      .single();

    if (data) {
      setSettings({
        ...createDefaultSettings(),
        ...data,
        primary_color: data.primary_color || defaultPrimaryColor,
        tax_percentage: Number(data.tax_percentage ?? 15),
        service_fee: Number(data.service_fee ?? 0),
        minimum_order: Number(data.minimum_order ?? 0),
      });
    } else {
      setSettings(createDefaultSettings());
    }
  }

  async function uploadFile(file: File, folder: string) {
    const fileExt = file.name.split(".").pop();
    const fileName = `${branchId}/${folder}-${Date.now()}.${fileExt}`;

    const { error } = await supabase.storage
      .from("branch-assets")
      .upload(fileName, file);

    if (error) throw new Error(error.message);

    const { data } = supabase.storage.from("branch-assets").getPublicUrl(fileName);

    return data.publicUrl;
  }

  async function handleLogoUpload(file: File | null) {
    if (!file || !settings) return;

    try {
      setLoading(true);
      setMessage("");
      const url = await uploadFile(file, "logo");
      setSettings({ ...settings, logo_url: url });
      setMessage("تم رفع الشعار. اضغط حفظ الإعدادات لتثبيت التغيير.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "حدث خطأ أثناء رفع الشعار");
    } finally {
      setLoading(false);
    }
  }

  async function handleCoverUpload(file: File | null) {
    if (!file || !settings) return;

    try {
      setLoading(true);
      setMessage("");
      const url = await uploadFile(file, "cover");
      setSettings({ ...settings, cover_url: url });
      setMessage("تم رفع صورة الغلاف. اضغط حفظ الإعدادات لتثبيت التغيير.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "حدث خطأ أثناء رفع الغلاف");
    } finally {
      setLoading(false);
    }
  }

  async function saveSettings() {
    if (!settings) return;

    setLoading(true);
    setMessage("");

    const payload = {
      branch_id: branchId,
      logo_url: settings.logo_url,
      cover_url: settings.cover_url,
      primary_color: settings.primary_color || defaultPrimaryColor,
      phone: settings.phone || null,
      whatsapp: settings.whatsapp || null,
      instagram: settings.instagram || null,
      snapchat: settings.snapchat || null,
      description: settings.description || null,

      is_open: Boolean(settings.is_open),
      is_busy: Boolean(settings.is_busy),

      tax_enabled: Boolean(settings.tax_enabled),
      tax_percentage: Number(settings.tax_percentage || 0),

      service_fee_enabled: Boolean(settings.service_fee_enabled),
      service_fee: Number(settings.service_fee || 0),

      minimum_order: Number(settings.minimum_order || 0),

      open_time: settings.open_time || null,
      close_time: settings.close_time || null,

      whatsapp_notifications: Boolean(settings.whatsapp_notifications),
      whatsapp_number: settings.whatsapp_number || settings.whatsapp || null,
    };

    const { error } = await supabase
      .from("branch_settings")
      .upsert(payload, { onConflict: "branch_id" });

    setLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("تم حفظ الإعدادات بنجاح");
  }

  useEffect(() => {
    if (!branchId) return;
    loadSettings();
  }, [branchId]);

  if (!settings) {
    return (
      <div dir="rtl" style={pageStyle}>
        <section style={heroStyle}>
          <p style={eyebrowStyle}>إعدادات المنيو</p>
          <h1 style={heroTitleStyle}>إعدادات الفرع</h1>
          <p style={heroTextStyle}>جاري تحميل الإعدادات...</p>
        </section>
      </div>
    );
  }

  return (
    <div dir="rtl" style={pageStyle}>
      <section style={heroStyle}>
        <div>
          <p style={eyebrowStyle}>إدارة بيانات الفرع</p>
          <h1 style={heroTitleStyle}>إعدادات الفرع</h1>
          <p style={heroTextStyle}>
            تحكم في المنيو، بيانات التواصل، حالة استقبال الطلبات، الضريبة، الرسوم، وأوقات العمل من مكان واحد.
          </p>
        </div>
      </section>

      <section style={miniStatsGridStyle}>
        <MiniStat title="حالة الفرع" value={settings.is_open ? "مفتوح" : "مغلق"} />
        <MiniStat title="الانشغال" value={settings.is_busy ? "مشغول" : "طبيعي"} />
        <MiniStat title="الضريبة" value={settings.tax_enabled ? `${settings.tax_percentage}%` : "غير مفعلة"} />
        <MiniStat title="واتساب" value={settings.whatsapp_notifications ? "مفعل" : "غير مفعل"} />
      </section>

      <div style={workspaceStyle}>
        <aside dir="rtl" style={sideColumnStyle}>
          <PreviewCard settings={settings} />

          {message ? (
            <div
              style={{
                ...messageStyle,
                border: message.includes("تم")
                  ? "1px solid rgba(63,163,108,0.44)"
                  : "1px solid rgba(201,79,79,0.44)",
                background: message.includes("تم")
                  ? "rgba(63,163,108,0.14)"
                  : "rgba(201,79,79,0.14)",
                color: message.includes("تم") ? "#B9F6CE" : "#ffb4b4",
              }}
            >
              {message}
            </div>
          ) : null}

          <button
            onClick={saveSettings}
            disabled={loading}
            style={{
              ...saveButtonStyle,
              opacity: loading ? 0.65 : 1,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "جاري الحفظ..." : "حفظ الإعدادات"}
          </button>
        </aside>

        <main dir="rtl" style={mainColumnStyle}>
          <SettingsBlock title="الهوية" subtitle="الشعار، الغلاف، لون المنيو، ووصف المطعم.">
            <div style={compactGridStyle}>
              <FileInput label="شعار المطعم" onChange={(file) => handleLogoUpload(file)} />
              <FileInput label="صورة الغلاف" onChange={(file) => handleCoverUpload(file)} />

              <div>
                <label style={labelStyle}>لون المنيو الأساسي</label>
                <input
                  type="color"
                  value={settings.primary_color}
                  onChange={(event) =>
                    setSettings({ ...settings, primary_color: event.target.value })
                  }
                  style={colorInputStyle}
                />
              </div>

              <textarea
                value={settings.description || ""}
                onChange={(event) =>
                  setSettings({ ...settings, description: event.target.value })
                }
                placeholder="وصف المطعم"
                style={{ ...inputStyle, minHeight: "100px", resize: "vertical" }}
              />
            </div>
          </SettingsBlock>

          <SettingsBlock title="التواصل" subtitle="الأرقام والحسابات التي تظهر للعميل داخل المنيو.">
            <div style={fourColumnStyle}>
              <TextInput
                value={settings.phone || ""}
                onChange={(value) => setSettings({ ...settings, phone: value })}
                placeholder="رقم الجوال"
              />

              <TextInput
                value={settings.whatsapp || ""}
                onChange={(value) => setSettings({ ...settings, whatsapp: value })}
                placeholder="رقم واتساب"
              />

              <TextInput
                value={settings.instagram || ""}
                onChange={(value) => setSettings({ ...settings, instagram: value })}
                placeholder="إنستغرام"
              />

              <TextInput
                value={settings.snapchat || ""}
                onChange={(value) => setSettings({ ...settings, snapchat: value })}
                placeholder="سناب شات"
              />
            </div>
          </SettingsBlock>

          <SettingsBlock title="استقبال الطلبات" subtitle="فتح الفرع، حالة الانشغال، وأوقات العمل.">
            <div style={twoColumnStyle}>
              <ToggleCard
                title="الفرع مفتوح"
                description="عند الإيقاف لن يستقبل الفرع طلبات جديدة."
                checked={settings.is_open}
                onChange={(checked) => setSettings({ ...settings, is_open: checked })}
              />

              <ToggleCard
                title="الفرع مشغول"
                description="يعرض للعميل أن الطلبات قد تتأخر."
                checked={settings.is_busy}
                onChange={(checked) => setSettings({ ...settings, is_busy: checked })}
              />
            </div>

            <div style={twoColumnStyle}>
              <TimeInput
                label="وقت الفتح"
                value={settings.open_time || ""}
                onChange={(value) => setSettings({ ...settings, open_time: value })}
              />

              <TimeInput
                label="وقت الإغلاق"
                value={settings.close_time || ""}
                onChange={(value) => setSettings({ ...settings, close_time: value })}
              />
            </div>
          </SettingsBlock>

          <SettingsBlock title="الضريبة والرسوم" subtitle="المبالغ التي تضاف على الطلب داخل المنيو.">
            <div style={billingGridStyle}>
              <ToggleCard
                title="تفعيل الضريبة"
                description="إظهار الضريبة ضمن تفاصيل الطلب."
                checked={settings.tax_enabled}
                onChange={(checked) => setSettings({ ...settings, tax_enabled: checked })}
              />

              <NumberInput
                label="نسبة الضريبة %"
                value={settings.tax_percentage}
                onChange={(value) => setSettings({ ...settings, tax_percentage: value })}
              />

              <ToggleCard
                title="رسوم الخدمة"
                description="رسوم ثابتة تضاف على الطلب."
                checked={settings.service_fee_enabled}
                onChange={(checked) =>
                  setSettings({ ...settings, service_fee_enabled: checked })
                }
              />

              <NumberInput
                label="رسوم الخدمة"
                value={settings.service_fee}
                onChange={(value) => setSettings({ ...settings, service_fee: value })}
              />

              <NumberInput
                label="الحد الأدنى للطلب"
                value={settings.minimum_order}
                onChange={(value) => setSettings({ ...settings, minimum_order: value })}
              />
            </div>
          </SettingsBlock>

          <SettingsBlock title="إشعارات واتساب" subtitle="تجهيز مسبق للربط لاحقًا مع مزود واتساب رسمي.">
            <div style={twoColumnStyle}>
              <ToggleCard
                title="تفعيل إشعارات واتساب"
                description="لاحقًا يتم ربطها كمزية مدفوعة."
                checked={settings.whatsapp_notifications}
                onChange={(checked) =>
                  setSettings({ ...settings, whatsapp_notifications: checked })
                }
              />

              <TextInput
                value={settings.whatsapp_number || ""}
                onChange={(value) => setSettings({ ...settings, whatsapp_number: value })}
                placeholder="رقم استقبال التنبيهات"
              />
            </div>
          </SettingsBlock>
        </main>
      </div>
    </div>
  );
}

function MiniStat({ title, value }: { title: string; value: string }) {
  return (
    <div style={miniStatStyle}>
      <p style={miniStatTitleStyle}>{title}</p>
      <strong style={miniStatValueStyle}>{value}</strong>
    </div>
  );
}

function SettingsBlock({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section style={cardStyle}>
      <div style={blockHeaderStyle}>
        <h2 style={sectionTitleStyle}>{title}</h2>
        <p style={sectionSubtitleStyle}>{subtitle}</p>
      </div>

      <div style={{ display: "grid", gap: "14px", marginTop: "16px" }}>{children}</div>
    </section>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      style={inputStyle}
    />
  );
}

function NumberInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <input
        type="number"
        min="0"
        step="0.01"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        style={inputStyle}
      />
    </div>
  );
}

function TimeInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <input
        type="time"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        style={inputStyle}
      />
    </div>
  );
}

function FileInput({
  label,
  onChange,
}: {
  label: string;
  onChange: (file: File | null) => void;
}) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <input
        type="file"
        accept="image/*"
        onChange={(event) => onChange(event.target.files?.[0] || null)}
        style={fileInputStyle}
      />
    </div>
  );
}

function ToggleCard({
  title,
  description,
  checked,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      style={{
        border: checked ? "1px solid rgba(198,138,61,0.58)" : "1px solid #4A3425",
        background: checked ? "rgba(198,138,61,0.14)" : "#2A211C",
        borderRadius: "24px",
        padding: "17px",
        textAlign: "right",
        cursor: "pointer",
        color: "#FFF8F0",
      }}
    >
      <div style={toggleContentStyle}>
        <div>
          <h3 style={toggleTitleStyle}>{title}</h3>
          <p style={toggleDescriptionStyle}>{description}</p>
        </div>

        <span
          style={{
            width: "48px",
            height: "26px",
            borderRadius: "999px",
            padding: "3px",
            background: checked ? "#C68A3D" : "rgba(255,248,240,0.14)",
            boxSizing: "border-box",
            flexShrink: 0,
          }}
        >
          <span
            style={{
              display: "block",
              width: "20px",
              height: "20px",
              borderRadius: "999px",
              background: checked ? "#16110E" : "#C8B6A4",
              transform: checked ? "translateX(-22px)" : "translateX(0)",
              transition: "0.2s",
            }}
          />
        </span>
      </div>
    </button>
  );
}

function PreviewCard({ settings }: { settings: Settings }) {
  return (
    <div style={previewStyle}>
      {settings.cover_url ? (
        <img
          src={settings.cover_url}
          alt="Cover"
          style={{ width: "100%", height: "140px", objectFit: "cover" }}
        />
      ) : (
        <div style={previewCoverPlaceholderStyle}>صورة الغلاف</div>
      )}

      <div style={{ padding: "20px", textAlign: "center" }}>
        {settings.logo_url ? (
          <img src={settings.logo_url} alt="Logo" style={previewLogoStyle} />
        ) : (
          <div style={previewLogoPlaceholderStyle}>Logo</div>
        )}

        <h2 style={previewTitleStyle}>معاينة المنيو</h2>

        <p style={previewDescriptionStyle}>
          {settings.description || "وصف المطعم يظهر هنا"}
        </p>

        <div style={previewBadgesGridStyle}>
          <PreviewBadge label={settings.is_open ? "مفتوح" : "مغلق"} active={settings.is_open} />
          <PreviewBadge label={settings.is_busy ? "مشغول" : "طبيعي"} active={!settings.is_busy} />
        </div>

        <div style={previewDetailsStyle}>
          <p style={previewLineStyle}>وقت العمل: {settings.open_time || "--"} إلى {settings.close_time || "--"}</p>
          <p style={previewLineStyle}>الضريبة: {settings.tax_enabled ? `${settings.tax_percentage}%` : "غير مفعلة"}</p>
          <p style={previewLineStyle}>رسوم الخدمة: {settings.service_fee_enabled ? `${settings.service_fee} ريال` : "غير مفعلة"}</p>
          <p style={previewLineStyle}>الحد الأدنى: {settings.minimum_order || 0} ريال</p>
        </div>

        <div
          style={{
            marginTop: "14px",
            borderRadius: "18px",
            padding: "16px",
            fontWeight: 950,
            color: "#16110E",
            backgroundColor: settings.primary_color || defaultPrimaryColor,
          }}
        >
          زر بلون المنيو
        </div>
      </div>
    </div>
  );
}

function PreviewBadge({ label, active }: { label: string; active: boolean }) {
  return (
    <div
      style={{
        borderRadius: "16px",
        padding: "11px 10px",
        fontWeight: 950,
        background: active ? "rgba(63,163,108,0.16)" : "rgba(201,79,79,0.14)",
        color: active ? "#B9F6CE" : "#ffb4b4",
        border: active ? "1px solid rgba(63,163,108,0.30)" : "1px solid rgba(201,79,79,0.30)",
      }}
    >
      {label}
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  width: "100%",
  minHeight: "100vh",
  color: "#FFF8F0",
  display: "grid",
  gap: "16px",
};

const heroStyle: React.CSSProperties = {
  background: "linear-gradient(135deg, #241B16, #1C1612)",
  border: "1px solid #4A3425",
  borderRadius: "30px",
  padding: "22px",
  boxShadow: "0 22px 70px rgba(0,0,0,0.28)",
};

const eyebrowStyle: React.CSSProperties = {
  margin: "0 0 8px",
  color: "#DEA54B",
  fontWeight: 950,
  fontSize: "18px",
};

const heroTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "40px",
  fontWeight: 950,
  color: "#FFF8F0",
};

const heroTextStyle: React.CSSProperties = {
  margin: "10px 0 0",
  color: "#C8B6A4",
  fontWeight: 800,
  fontSize: "18px",
  lineHeight: 1.8,
};

const miniStatsGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: "12px",
};

const miniStatStyle: React.CSSProperties = {
  background: "#241B16",
  border: "1px solid #4A3425",
  borderRadius: "26px",
  padding: "17px",
  boxShadow: "0 16px 48px rgba(0,0,0,0.22)",
};

const miniStatTitleStyle: React.CSSProperties = {
  margin: 0,
  color: "#C8B6A4",
  fontWeight: 950,
  fontSize: "18px",
};

const miniStatValueStyle: React.CSSProperties = {
  display: "block",
  marginTop: "8px",
  color: "#FFF8F0",
  fontSize: "26px",
  fontWeight: 950,
};

const workspaceStyle: React.CSSProperties = {
  direction: "ltr",
  display: "grid",
  gridTemplateColumns: "360px minmax(0, 1fr)",
  gap: "16px",
  alignItems: "start",
};

const sideColumnStyle: React.CSSProperties = {
  display: "grid",
  gap: "14px",
  position: "sticky",
  top: "16px",
};

const mainColumnStyle: React.CSSProperties = {
  display: "grid",
  gap: "14px",
};

const cardStyle: React.CSSProperties = {
  background: "#241B16",
  border: "1px solid #4A3425",
  borderRadius: "28px",
  padding: "20px",
  boxShadow: "0 18px 55px rgba(0,0,0,0.24)",
};

const blockHeaderStyle: React.CSSProperties = {
  borderBottom: "1px solid rgba(74,52,37,0.85)",
  paddingBottom: "12px",
};

const sectionTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "26px",
  fontWeight: 950,
  color: "#FFF8F0",
};

const sectionSubtitleStyle: React.CSSProperties = {
  margin: "6px 0 0",
  color: "#C8B6A4",
  fontWeight: 800,
  fontSize: "18px",
  lineHeight: 1.7,
};

const compactGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "12px",
};

const twoColumnStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "12px",
};

const fourColumnStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: "12px",
};

const billingGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1.15fr 0.85fr 1.15fr 0.85fr 0.85fr",
  gap: "12px",
  alignItems: "stretch",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: "7px",
  color: "#C8B6A4",
  fontWeight: 900,
  fontSize: "18px",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  border: "1px solid #4A3425",
  borderRadius: "18px",
  padding: "16px",
  outline: "none",
  background: "#2A211C",
  color: "#FFF8F0",
  fontWeight: 850,
  fontSize: "18px",
  boxSizing: "border-box",
};

const fileInputStyle: React.CSSProperties = {
  ...inputStyle,
  cursor: "pointer",
};

const colorInputStyle: React.CSSProperties = {
  width: "100%",
  height: "56px",
  border: "1px solid #4A3425",
  borderRadius: "18px",
  padding: "6px",
  outline: "none",
  background: "#2A211C",
  boxSizing: "border-box",
  cursor: "pointer",
};

const toggleContentStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: "12px",
};

const toggleTitleStyle: React.CSSProperties = {
  margin: 0,
  color: "#FFF8F0",
  fontWeight: 950,
  fontSize: "18px",
};

const toggleDescriptionStyle: React.CSSProperties = {
  margin: "7px 0 0",
  color: "#C8B6A4",
  fontWeight: 800,
  fontSize: "18px",
  lineHeight: 1.65,
};

const previewStyle: React.CSSProperties = {
  overflow: "hidden",
  borderRadius: "28px",
  background: "#241B16",
  border: "1px solid #4A3425",
  boxShadow: "0 18px 55px rgba(0,0,0,0.24)",
};

const previewCoverPlaceholderStyle: React.CSSProperties = {
  height: "140px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#2A211C",
  color: "#C8B6A4",
  fontWeight: 950,
};

const previewLogoStyle: React.CSSProperties = {
  width: "94px",
  height: "94px",
  objectFit: "contain",
  borderRadius: "26px",
  border: "4px solid #16110E",
  background: "#2A211C",
  padding: "8px",
  margin: "-62px auto 0",
  display: "block",
};

const previewLogoPlaceholderStyle: React.CSSProperties = {
  width: "94px",
  height: "94px",
  borderRadius: "26px",
  border: "4px solid #16110E",
  background: "#2A211C",
  color: "#C8B6A4",
  fontWeight: 950,
  margin: "-62px auto 0",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const previewTitleStyle: React.CSSProperties = {
  margin: "14px 0 0",
  color: "#FFF8F0",
  fontSize: "26px",
  fontWeight: 950,
};

const previewDescriptionStyle: React.CSSProperties = {
  margin: "8px 0 0",
  color: "#C8B6A4",
  fontWeight: 800,
  lineHeight: 1.7,
  fontSize: "18px",
};

const previewBadgesGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, 1fr)",
  gap: "9px",
  marginTop: "14px",
};

const previewDetailsStyle: React.CSSProperties = {
  marginTop: "14px",
  borderRadius: "18px",
  background: "#2A211C",
  border: "1px solid #4A3425",
  padding: "13px",
  textAlign: "right",
};

const previewLineStyle: React.CSSProperties = {
  margin: "7px 0",
  color: "#C8B6A4",
  fontWeight: 850,
  fontSize: "18px",
};

const messageStyle: React.CSSProperties = {
  borderRadius: "20px",
  padding: "16px",
  fontWeight: 950,
};

const saveButtonStyle: React.CSSProperties = {
  border: "0",
  borderRadius: "22px",
  padding: "17px 22px",
  background: "linear-gradient(135deg, #C68A3D, #DEA54B)",
  color: "#16110E",
  fontWeight: 950,
  fontSize: "18px",
  boxShadow: "0 16px 30px rgba(198,138,61,0.20)",
};
