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
};

export default function TableQRPage() {
  const params = useParams();
  const branchId = params.id as string;
  const tableId = params.tableId as string;

  const qrCardRef = useRef<HTMLDivElement | null>(null);

  const [branch, setBranch] = useState<Branch | null>(null);
  const [table, setTable] = useState<Table | null>(null);
  const [qrColor, setQrColor] = useState("#000000");

  useEffect(() => {
    async function loadData() {
      const { data: branchData } = await supabase
        .from("branches")
        .select("id, name, city, slug")
        .eq("id", branchId)
        .single();

      const { data: tableData } = await supabase
        .from("tables")
        .select("id, table_number")
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
    link.download = `table-${table?.table_number || "qr"}.${format}`;
    link.click();
  }

  if (!branch || !table) {
    return (
      <main dir="rtl" className="min-h-screen bg-[#06140f] p-10 text-white">
        جاري تحميل QR الطاولة...
      </main>
    );
  }

  const tableMenuUrl = `${window.location.origin}/menu/${encodeURIComponent(
    branch.slug
  )}?table=${table.table_number}`;

  return (
    <main dir="rtl" className="min-h-screen bg-[#06140f] p-10 text-white">
      <h1 className="text-4xl font-black">QR الطاولة</h1>

      <div className="mt-8 grid gap-8 lg:grid-cols-[420px_1fr]">
        <div
          ref={qrCardRef}
          className="rounded-3xl bg-white p-8 text-center text-black"
        >
          <h2 className="mb-2 text-2xl font-black">{branch.name}</h2>
          <p className="mb-2 text-gray-600">{branch.city}</p>
          <p className="mb-6 text-xl font-black">
            طاولة {table.table_number}
          </p>

          <div className="flex justify-center">
            <QRCodeCanvas
              value={tableMenuUrl}
              size={280}
              fgColor={qrColor}
              bgColor="#ffffff"
              level="H"
              includeMargin
            />
          </div>

          <p className="mt-6 break-all text-sm">{tableMenuUrl}</p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <h3 className="text-2xl font-black">تخصيص QR الطاولة</h3>

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