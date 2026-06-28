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

type Table = {
  id: string;
  table_number: number;
  section_name: string | null;
};

export default function TableQRPage() {
  const params = useParams();
  const branchId = params.id as string;
  const tableId = params.tableId as string;

  const qrCardRef = useRef<HTMLDivElement | null>(null);

  const [branch, setBranch] = useState<Branch | null>(null);
  const [table, setTable] = useState<Table | null>(null);
  const [qrColor, setQrColor] = useState("#16110E");

  useEffect(() => {
    async function loadData() {
      const { data: branchData } = await supabase
        .from("branches")
        .select("id, name, city, slug")
        .eq("id", branchId)
        .single();

      const { data: tableData } = await supabase
        .from("tables")
        .select("id, table_number, section_name")
        .eq("id", tableId)
        .single();

      setBranch(branchData);
      setTable(tableData);
    }

    loadData();
  }, [branchId, tableId]);

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
    link.download = `table-${table?.table_number || "qr"}.${format}`;
    link.click();
  }

  if (!branch || !table) {
    return (
      <main dir="rtl" className="min-h-screen bg-[#16110E] p-10 text-[#FFF8F0]">
        جاري تحميل QR الطاولة...
      </main>
    );
  }

  const tableMenuUrl = `${window.location.origin}/menu/${encodeURIComponent(
    branch.slug
  )}?tableId=${table.id}`;

  return (
    <main dir="rtl" className="min-h-screen bg-[#16110E] p-10 text-[#FFF8F0]">
      <section className="rounded-[30px] border border-[#4A3425] bg-gradient-to-l from-[#241B16] to-[#1C1612] p-6 shadow-[0_22px_70px_rgba(0,0,0,0.28)]">
        <p className="text-base font-black text-[#DEA54B]">QR مرتبط بالطاولة</p>
        <h1 className="mt-2 text-4xl font-black">QR الطاولة</h1>
        <p className="mt-3 text-base font-bold leading-8 text-[#C8B6A4]">
          هذا الرابط يفتح المنيو مربوطًا بهذه الطاولة مباشرة.
        </p>
      </section>

      <div className="mt-8 grid gap-8 lg:grid-cols-[420px_1fr]">
        <div
          ref={qrCardRef}
          className="rounded-[30px] border border-[#D8C2A7] bg-[#FFF8F0] p-8 text-center text-[#16110E] shadow-2xl"
        >
          <h2 className="mb-2 text-2xl font-black">{branch.name}</h2>
          <p className="mb-2 font-bold text-[#6F5645]">{branch.city}</p>

          <p className="mb-1 text-xl font-black">طاولة {table.table_number}</p>

          {table.section_name ? (
            <p className="mb-6 font-bold text-[#6F5645]">{table.section_name}</p>
          ) : (
            <div className="mb-6" />
          )}

          <div className="flex justify-center">
            <QRCodeCanvas
              value={tableMenuUrl}
              size={280}
              fgColor={qrColor}
              bgColor="#FFF8F0"
              level="H"
              includeMargin
            />
          </div>

          <p className="mt-6 break-all text-sm font-bold text-[#6F5645]">
            {tableMenuUrl}
          </p>
        </div>

        <div className="rounded-[30px] border border-[#4A3425] bg-[#241B16] p-6 shadow-[0_22px_70px_rgba(0,0,0,0.28)]">
          <h3 className="text-2xl font-black">تخصيص QR الطاولة</h3>

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
