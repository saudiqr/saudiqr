"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

type BranchPageHeaderProps = {
  title: string;
  description?: string;
  branchId: string;
};

export default function BranchPageHeader({
  title,
  description,
  branchId,
}: BranchPageHeaderProps) {
  const router = useRouter();

  return (
    <div className="mb-8 rounded-3xl border border-white/10 bg-white/5 p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-black">{title}</h1>

          {description && (
            <p className="mt-2 text-sm leading-7 text-gray-400">
              {description}
            </p>
          )}
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-2xl border border-white/10 px-5 py-3 font-bold hover:bg-white/10"
          >
            رجوع
          </button>

          <Link
            href={`/branch/${branchId}`}
            className="rounded-2xl bg-emerald-500 px-5 py-3 font-black text-black"
          >
            لوحة الفرع
          </Link>
        </div>
      </div>
    </div>
  );
}