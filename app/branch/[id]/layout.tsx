import BranchLayout from "@/components/BranchLayout";

export default async function Layout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <BranchLayout branchId={id}>{children}</BranchLayout>;
}