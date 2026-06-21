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
};

export default function BranchSettingsPage() {
  const params = useParams();
  const branchId = params.id as string;

  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function loadSettings() {
    const { data } = await supabase
      .from("branch_settings")
      .select("*")
      .eq("branch_id", branchId)
      .single();

    if (data) {
      setSettings(data);
    } else {
      setSettings({
        branch_id: branchId,
        logo_url: null,
        cover_url: null,
        primary_color: "#10b981",
        phone: "",
        whatsapp: "",
        instagram: "",
        snapchat: "",
        description: "",
      });
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

    setLoading(true);
    const url = await uploadFile(file, "logo");
    setSettings({ ...settings, logo_url: url });
    setLoading(false);
  }

  async function handleCoverUpload(file: File | null) {
    if (!file || !settings) return;

    setLoading(true);
    const url = await uploadFile(file, "cover");
    setSettings({ ...settings, cover_url: url });
    setLoading(false);
  }

  async function saveSettings() {
    if (!settings) return;

    setLoading(true);
    setMessage("");

    const payload = {
      branch_id: branchId,
      logo_url: settings.logo_url,
      cover_url: settings.cover_url,
      primary_color: settings.primary_color,
      phone: settings.phone,
      whatsapp: settings.whatsapp,
      instagram: settings.instagram,
      snapchat: settings.snapchat,
      description: settings.description,
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
    loadSettings();
  }, []);

  if (!settings) {
    return (
      <BranchLayout branchId={branchId}>
        جاري تحميل الإعدادات...
      </BranchLayout>
    );
  }

  return (
    <main dir="rtl" className="min-h-screen bg-[#06140f] p-10 text-white">
      <h1 className="text-4xl font-black">إعدادات الفرع</h1>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">
        <div className="space-y-5 rounded-3xl border border-white/10 bg-white/5 p-6">
          <div>
            <label className="mb-2 block text-sm text-gray-300">شعار المطعم</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleLogoUpload(e.target.files?.[0] || null)}
              className="w-full rounded-2xl bg-black/20 p-4"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-gray-300">صورة الغلاف</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleCoverUpload(e.target.files?.[0] || null)}
              className="w-full rounded-2xl bg-black/20 p-4"
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
              className="h-14 w-full rounded-2xl bg-black/20"
            />
          </div>

          <input
            value={settings.phone || ""}
            onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
            placeholder="رقم الجوال"
            className="w-full rounded-2xl bg-black/20 p-4"
          />

          <input
            value={settings.whatsapp || ""}
            onChange={(e) =>
              setSettings({ ...settings, whatsapp: e.target.value })
            }
            placeholder="رقم واتساب"
            className="w-full rounded-2xl bg-black/20 p-4"
          />

          <input
            value={settings.instagram || ""}
            onChange={(e) =>
              setSettings({ ...settings, instagram: e.target.value })
            }
            placeholder="حساب إنستغرام"
            className="w-full rounded-2xl bg-black/20 p-4"
          />

          <input
            value={settings.snapchat || ""}
            onChange={(e) =>
              setSettings({ ...settings, snapchat: e.target.value })
            }
            placeholder="حساب سناب شات"
            className="w-full rounded-2xl bg-black/20 p-4"
          />

          <textarea
            value={settings.description || ""}
            onChange={(e) =>
              setSettings({ ...settings, description: e.target.value })
            }
            placeholder="وصف المطعم"
            className="min-h-32 w-full rounded-2xl bg-black/20 p-4"
          />

          {message && (
            <div className="rounded-2xl bg-emerald-500/20 p-4 text-emerald-300">
              {message}
            </div>
          )}

          <button
            onClick={saveSettings}
            disabled={loading}
            className="w-full rounded-2xl bg-emerald-500 px-6 py-4 font-black text-black disabled:opacity-60"
          >
            {loading ? "جاري الحفظ..." : "حفظ الإعدادات"}
          </button>
        </div>

        <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5">
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
            {settings.logo_url && (
              <img
                src={settings.logo_url}
                alt="Logo"
                className="mx-auto -mt-16 h-28 w-28 rounded-3xl border-4 border-[#06140f] bg-white object-contain p-2"
              />
            )}

            <h2 className="mt-4 text-2xl font-black">معاينة المنيو</h2>
            <p className="mt-2 text-gray-400">{settings.description}</p>

            <div
              className="mt-6 rounded-2xl px-5 py-4 font-black text-black"
              style={{ backgroundColor: settings.primary_color }}
            >
              زر بلون المنيو
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}