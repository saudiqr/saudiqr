"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import BranchLayout from "@/components/BranchLayout";

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

const defaultPrimaryColor = "#10b981";

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

    const { data } = supabase.storage
      .from("branch-assets")
      .getPublicUrl(fileName);

    return data.publicUrl;
  }

  async function handleLogoUpload(file: File | null) {
    if (!file || !settings) return;

    try {
      setLoading(true);
      setMessage("");
      const url = await uploadFile(file, "logo");
      setSettings({ ...settings, logo_url: url });
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
      <BranchLayout branchId={branchId}>
        <div className="rounded-3xl bg-[#06140f] p-6 text-white">
          جاري تحميل الإعدادات...
        </div>
      </BranchLayout>
    );
  }

  return (
    <BranchLayout branchId={branchId}>
      <div className="space-y-8 text-white">
        <div>
          <h1 className="text-4xl font-black">إعدادات الفرع</h1>
          <p className="mt-2 text-sm text-white/80">
            تحكم في ظهور المنيو، بيانات التواصل، حالة الفرع، الضريبة، رسوم الخدمة، وأوقات العمل.
          </p>
        </div>

        <div className="grid gap-8 xl:grid-cols-[1fr_380px]">
          <div className="space-y-6">
            <SettingsBlock title="الهوية وبيانات المنيو">
              <div className="grid gap-5 md:grid-cols-2">
                <FileInput
                  label="شعار المطعم"
                  onChange={(file) => handleLogoUpload(file)}
                />

                <FileInput
                  label="صورة الغلاف"
                  onChange={(file) => handleCoverUpload(file)}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-gray-300">لون المنيو الأساسي</label>
                <input
                  type="color"
                  value={settings.primary_color}
                  onChange={(e) =>
                    setSettings({ ...settings, primary_color: e.target.value })
                  }
                  className="h-14 w-full rounded-2xl border border-white/10 bg-black/20 p-2"
                />
              </div>

              <textarea
                value={settings.description || ""}
                onChange={(e) =>
                  setSettings({ ...settings, description: e.target.value })
                }
                placeholder="وصف المطعم"
                className="min-h-32 w-full rounded-2xl border border-white/10 bg-black/20 p-4 outline-none placeholder:text-gray-500"
              />
            </SettingsBlock>

            <SettingsBlock title="بيانات التواصل">
              <div className="grid gap-4 md:grid-cols-2">
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
                  onChange={(value) =>
                    setSettings({ ...settings, instagram: value })
                  }
                  placeholder="حساب إنستغرام"
                />

                <TextInput
                  value={settings.snapchat || ""}
                  onChange={(value) =>
                    setSettings({ ...settings, snapchat: value })
                  }
                  placeholder="حساب سناب شات"
                />
              </div>
            </SettingsBlock>

            <SettingsBlock title="حالة استقبال الطلبات">
              <div className="grid gap-4 md:grid-cols-2">
                <ToggleCard
                  title="الفرع مفتوح"
                  description="إذا تم إيقافه لن يتم استقبال طلبات جديدة."
                  checked={settings.is_open}
                  onChange={(checked) =>
                    setSettings({ ...settings, is_open: checked })
                  }
                />

                <ToggleCard
                  title="الفرع مشغول"
                  description="يعرض للعميل أن الطلبات قد تتأخر."
                  checked={settings.is_busy}
                  onChange={(checked) =>
                    setSettings({ ...settings, is_busy: checked })
                  }
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <TimeInput
                  label="وقت الفتح"
                  value={settings.open_time || ""}
                  onChange={(value) =>
                    setSettings({ ...settings, open_time: value })
                  }
                />

                <TimeInput
                  label="وقت الإغلاق"
                  value={settings.close_time || ""}
                  onChange={(value) =>
                    setSettings({ ...settings, close_time: value })
                  }
                />
              </div>
            </SettingsBlock>

            <SettingsBlock title="الضريبة والرسوم">
              <div className="grid gap-4 md:grid-cols-2">
                <ToggleCard
                  title="تفعيل الضريبة"
                  description="استخدمها لو تبغى تظهر الضريبة في الطلب."
                  checked={settings.tax_enabled}
                  onChange={(checked) =>
                    setSettings({ ...settings, tax_enabled: checked })
                  }
                />

                <NumberInput
                  label="نسبة الضريبة %"
                  value={settings.tax_percentage}
                  onChange={(value) =>
                    setSettings({ ...settings, tax_percentage: value })
                  }
                />

                <ToggleCard
                  title="تفعيل رسوم الخدمة"
                  description="رسوم ثابتة تضاف على الطلب."
                  checked={settings.service_fee_enabled}
                  onChange={(checked) =>
                    setSettings({ ...settings, service_fee_enabled: checked })
                  }
                />

                <NumberInput
                  label="رسوم الخدمة بالريال"
                  value={settings.service_fee}
                  onChange={(value) =>
                    setSettings({ ...settings, service_fee: value })
                  }
                />

                <NumberInput
                  label="الحد الأدنى للطلب"
                  value={settings.minimum_order}
                  onChange={(value) =>
                    setSettings({ ...settings, minimum_order: value })
                  }
                />
              </div>
            </SettingsBlock>

            <SettingsBlock title="إشعارات واتساب">
              <div className="grid gap-4 md:grid-cols-2">
                <ToggleCard
                  title="تفعيل إشعارات واتساب"
                  description="لاحقًا نربطها بمزود واتساب رسمي."
                  checked={settings.whatsapp_notifications}
                  onChange={(checked) =>
                    setSettings({
                      ...settings,
                      whatsapp_notifications: checked,
                    })
                  }
                />

                <TextInput
                  value={settings.whatsapp_number || ""}
                  onChange={(value) =>
                    setSettings({ ...settings, whatsapp_number: value })
                  }
                  placeholder="رقم استقبال التنبيهات"
                />
              </div>
            </SettingsBlock>

            {message && (
              <div
                className={`rounded-2xl p-4 font-bold ${
                  message.includes("تم")
                    ? "bg-emerald-500/20 text-emerald-300"
                    : "bg-red-500/20 text-red-300"
                }`}
              >
                {message}
              </div>
            )}

            <button
              onClick={saveSettings}
              disabled={loading}
              className="w-full rounded-2xl bg-emerald-500 px-6 py-4 font-black text-black transition hover:bg-emerald-400 disabled:opacity-60"
            >
              {loading ? "جاري الحفظ..." : "حفظ الإعدادات"}
            </button>
          </div>

          <PreviewCard settings={settings} />
        </div>
      </div>
    </BranchLayout>
  );
}

function SettingsBlock({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-5 rounded-3xl border border-white/10 bg-[#06140f] p-6 shadow-2xl">
      <h2 className="text-xl font-black">{title}</h2>
      {children}
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
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-2xl border border-white/10 bg-black/20 p-4 outline-none placeholder:text-gray-500"
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
      <label className="mb-2 block text-sm text-gray-300">{label}</label>
      <input
        type="number"
        min="0"
        step="0.01"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full rounded-2xl border border-white/10 bg-black/20 p-4 outline-none"
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
      <label className="mb-2 block text-sm text-gray-300">{label}</label>
      <input
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl border border-white/10 bg-black/20 p-4 outline-none"
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
      <label className="mb-2 block text-sm text-gray-300">{label}</label>
      <input
        type="file"
        accept="image/*"
        onChange={(e) => onChange(e.target.files?.[0] || null)}
        className="w-full rounded-2xl border border-white/10 bg-black/20 p-4 file:ml-4 file:rounded-xl file:border-0 file:bg-emerald-500 file:px-4 file:py-2 file:font-black file:text-black"
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
      className={`rounded-3xl border p-5 text-right transition ${
        checked
          ? "border-emerald-500 bg-emerald-500/15"
          : "border-white/10 bg-black/20"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-black">{title}</h3>
          <p className="mt-2 text-sm leading-6 text-gray-400">{description}</p>
        </div>

        <span
          className={`mt-1 h-6 w-11 rounded-full p-1 transition ${
            checked ? "bg-emerald-500" : "bg-white/20"
          }`}
        >
          <span
            className={`block h-4 w-4 rounded-full bg-white transition ${
              checked ? "translate-x-[-20px]" : "translate-x-0"
            }`}
          />
        </span>
      </div>
    </button>
  );
}

function PreviewCard({ settings }: { settings: Settings }) {
  return (
    <aside className="h-fit overflow-hidden rounded-3xl border border-white/10 bg-[#06140f] shadow-2xl">
      {settings.cover_url ? (
        <img
          src={settings.cover_url}
          alt="Cover"
          className="h-48 w-full object-cover"
        />
      ) : (
        <div className="flex h-48 items-center justify-center bg-black/20 text-gray-400">
          صورة الغلاف
        </div>
      )}

      <div className="p-6 text-center">
        {settings.logo_url ? (
          <img
            src={settings.logo_url}
            alt="Logo"
            className="mx-auto -mt-16 h-28 w-28 rounded-3xl border-4 border-[#06140f] bg-white object-contain p-2"
          />
        ) : (
          <div className="mx-auto -mt-16 flex h-28 w-28 items-center justify-center rounded-3xl border-4 border-[#06140f] bg-white text-sm font-black text-gray-500">
            Logo
          </div>
        )}

        <h2 className="mt-4 text-2xl font-black">معاينة المنيو</h2>
        <p className="mt-2 text-sm leading-6 text-gray-400">
          {settings.description || "وصف المطعم يظهر هنا"}
        </p>

        <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
          <PreviewBadge
            label={settings.is_open ? "مفتوح" : "مغلق"}
            active={settings.is_open}
          />
          <PreviewBadge
            label={settings.is_busy ? "مشغول" : "غير مشغول"}
            active={!settings.is_busy}
          />
        </div>

        <div className="mt-5 rounded-2xl bg-black/20 p-4 text-right text-sm text-gray-300">
          <p>وقت العمل: {settings.open_time || "--"} إلى {settings.close_time || "--"}</p>
          <p className="mt-2">الضريبة: {settings.tax_enabled ? `${settings.tax_percentage}%` : "غير مفعلة"}</p>
          <p className="mt-2">رسوم الخدمة: {settings.service_fee_enabled ? `${settings.service_fee} ريال` : "غير مفعلة"}</p>
          <p className="mt-2">الحد الأدنى: {settings.minimum_order || 0} ريال</p>
        </div>

        <div
          className="mt-6 rounded-2xl px-5 py-4 font-black text-black"
          style={{ backgroundColor: settings.primary_color || defaultPrimaryColor }}
        >
          زر بلون المنيو
        </div>
      </div>
    </aside>
  );
}

function PreviewBadge({ label, active }: { label: string; active: boolean }) {
  return (
    <div
      className={`rounded-2xl px-3 py-3 font-black ${
        active ? "bg-emerald-500/20 text-emerald-300" : "bg-red-500/20 text-red-300"
      }`}
    >
      {label}
    </div>
  );
}
