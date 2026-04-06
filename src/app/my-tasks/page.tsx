import { redirect } from 'next/navigation';

export default function MyTasksAliasPage() {
  redirect('/tasks?scope=mine');
}
