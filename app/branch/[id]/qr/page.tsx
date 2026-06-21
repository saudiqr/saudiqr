"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { QRCodeCanvas } from "qrcode.react";
import html2canvas from "html2canvas";
import { supabase } from "@/lib/supabase";
import BranchLayout from "@/components/BranchLayout";

type Branch = {
  id: string;
  name: string;
  city: string | null;
  slug: string;
};

export default function QRPage() {
  const params = useParams();
  const branchId = params.id as string;

  const qrCardRef = useRef<HTMLDivElement | null>(null);

  const [branch, setBranch] = useState<Branch | null>(null);
  const [qrColor, setQrColor] = useState("#000000");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    async function loadBranch() {
      const { data } = await supabase
        .from("branches")
        .select("id, name, city, slug")
        .eq("id", branchId)
        .single();

      setBranch(data);
    }

    loadBranch();
  }, [branchId]);

  function handleLogoUpload(file: File | null) {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("ارفع صورة فقط");
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setLogoUrl(previewUrl);
  }

  async function downloadQR(format: "png" | "jpg") {
    if (!qrCardRef.current) return;

    const canvas = await html2canvas(qrCardRef.current, {
  backgroundColor: "#ffffff",
  scale: 4,
  useCORS: true,
});

    const image =
      format === "png"
        ? canvas.toDataURL("image/png")
        : canvas.toDataURL("image/jpeg", 1);

    const link = document.createElement("a");
    link.href = image;
    link.download = `${branch?.name || "qr"}.${format}`;
    link.click();
  }

  if (!branch) {
    return (
      <BranchLayout branchId={branchId}>
        جاري تحميل QR...
      </BranchLayout>
    );
  }

  const menuUrl = `${window.location.origin}/menu/${encodeURIComponent(
    branch.slug
  )}`;

  return (
    <main dir="rtl" className="min-h-screen bg-[#06140f] p-10 text-white">
      <h1 className="text-4xl font-black">QR الفرع</h1>

      <div className="mt-8 grid gap-8 lg:grid-cols-[420px_1fr]">
        <div
          ref={qrCardRef}
          className="rounded-3xl bg-white p-8 text-center text-black"
        >
          <h2 className="mb-2 text-2xl font-black">{branch.name}</h2>
          <p className="mb-6 text-gray-600">{branch.city}</p>

          <div className="relative mx-auto flex h-[280px] w-[280px] items-center justify-center">
            <QRCodeCanvas
              value={menuUrl}
              size={280}
              fgColor={qrColor}
              bgColor="#ffffff"
              level="H"
              includeMargin
            />

            {logoUrl && (
              <div className="absolute flex h-20 w-20 items-center justify-center rounded-2xl bg-white p-2 shadow">
                <img
                  src={logoUrl}
                  alt="Logo"
                  className="h-full w-full rounded-xl object-contain"
                />
              </div>
            )}
          </div>

          <p className="mt-6 break-all text-sm">{menuUrl}</p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <h3 className="text-2xl font-black">تخصيص QR</h3>

          <div className="mt-6 space-y-5">
            <div>
              <label className="mb-2 block text-sm text-gray-300">
                لون QR
              </label>

              <input
                type="color"
                value={qrColor}
                onChange={(e) => setQrColor(e.target.value)}
                className="h-14 w-full rounded-2xl bg-black/20"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-gray-300">
                شعار المطعم
              </label>

              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleLogoUpload(e.target.files?.[0] || null)}
                className="w-full rounded-2xl bg-black/20 p-4"
              />
            </div>

            <button
              onClick={() => downloadQR("png")}
              className="w-full rounded-2xl bg-emerald-500 px-6 py-4 font-black text-black"
            >
              تحميل PNG
            </button>

            <button
              onClick={() => downloadQR("jpg")}
              className="w-full rounded-2xl bg-white px-6 py-4 font-black text-black"
            >
              تحميل JPG
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}