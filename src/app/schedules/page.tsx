import { redirect } from 'next/navigation';

export default function SchedulesAliasPage() {
  redirect('/calendar?view=list');
}
