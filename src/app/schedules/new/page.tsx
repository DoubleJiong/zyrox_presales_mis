import { redirect } from 'next/navigation';

export default function NewScheduleAliasPage() {
  redirect('/calendar?composer=schedule');
}
