import { redirect } from 'next/navigation';

interface SubSchemesRedirectPageProps {
  params: Promise<{ id: string }>;
}

export default async function SubSchemesRedirectPage({ params }: SubSchemesRedirectPageProps) {
  const { id } = await params;
  redirect(`/solutions/${id}?tab=sub-schemes`);
}
