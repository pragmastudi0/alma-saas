import { redirect } from 'next/navigation';
import { waUrl } from '@/content/landing';

export default function RegistroPage() {
  redirect(waUrl());
}
