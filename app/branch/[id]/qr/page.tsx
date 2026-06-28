"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { QRCodeCanvas } from "qrcode.react";
import html2canvas from "html2canvas";
import { supabase } from "@/lib/supabase";

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
  const [qrColor, setQrColor] = useState("#16110E");
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
      backgroundColor: "#FFF8F0",
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
      <main dir="rtl" className="min-h-screen bg-[#16110E] p-10 text-[#FFF8F0]">
        جاري تحميل QR...
      </main>
    );
  }

  const menuUrl = `${window.location.origin}/menu/${encodeURIComponent(
    branch.slug
  )}`;

  return (
    <main dir="rtl" className="min-h-screen bg-[#16110E] p-10 text-[#FFF8F0]">
      <section className="rounded-[30px] border border-[#4A3425] bg-gradient-to-l from-[#241B16] to-[#1C1612] p-6 shadow-[0_22px_70px_rgba(0,0,0,0.28)]">
        <p className="text-base font-black text-[#DEA54B]">QR المنيو العام</p>
        <h1 className="mt-2 text-4xl font-black">QR الفرع</h1>
        <p className="mt-3 text-base font-bold leading-8 text-[#C8B6A4]">
          هذا الرابط يفتح المنيو العام للفرع بدون ربطه بطاولة محددة.
        </p>
      </section>

      <div className="mt-8 grid gap-8 lg:grid-cols-[420px_1fr]">
        <div
          ref={qrCardRef}
          className="rounded-[30px] border border-[#D8C2A7] bg-[#FFF8F0] p-8 text-center text-[#16110E] shadow-2xl"
        >
          <h2 className="mb-2 text-2xl font-black">{branch.name}</h2>
          <p className="mb-6 font-bold text-[#6F5645]">{branch.city}</p>

          <div className="relative mx-auto flex h-[280px] w-[280px] items-center justify-center">
            <QRCodeCanvas
              value={menuUrl}
              size={280}
              fgColor={qrColor}
              bgColor="#FFF8F0"
              level="H"
              includeMargin
            />

            {logoUrl && (
              <div className="absolute flex h-20 w-20 items-center justify-center rounded-2xl bg-[#FFF8F0] p-2 shadow">
                <img
                  src={logoUrl}
                  alt="Logo"
                  className="h-full w-full rounded-xl object-contain"
                />
              </div>
            )}
          </div>

          <p className="mt-6 break-all text-sm font-bold text-[#6F5645]">
            {menuUrl}
          </p>
        </div>

        <div className="rounded-[30px] border border-[#4A3425] bg-[#241B16] p-6 shadow-[0_22px_70px_rgba(0,0,0,0.28)]">
          <h3 className="text-2xl font-black">تخصيص QR</h3>

          <div className="mt-6 space-y-5">
            <div>
              <label className="mb-2 block text-sm font-black text-[#C8B6A4]">
                لون QR
              </label>

              <input
                type="color"
                value={qrColor}
                onChange={(e) => setQrColor(e.target.value)}
                className="h-14 w-full rounded-2xl border border-[#4A3425] bg-[#2A211C] p-2"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-black text-[#C8B6A4]">
                شعار المطعم
              </label>

              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleLogoUpload(e.target.files?.[0] || null)}
                className="w-full rounded-2xl border border-[#4A3425] bg-[#2A211C] p-4 text-[#FFF8F0]"
              />
            </div>

            <button
              onClick={() => downloadQR("png")}
              className="w-full rounded-2xl bg-[#C68A3D] px-6 py-4 font-black text-[#16110E] transition hover:bg-[#DEA54B]"
            >
              تحميل PNG
            </button>

            <button
              onClick={() => downloadQR("jpg")}
              className="w-full rounded-2xl border border-[#4A3425] bg-[#2A211C] px-6 py-4 font-black text-[#FFF8F0] transition hover:border-[#C68A3D]"
            >
              تحميل JPG
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
