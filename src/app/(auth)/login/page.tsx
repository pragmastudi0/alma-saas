import Link from 'next/link';
import { AuthForm } from '@/components/auth-form';
import { login } from '../actions';

export default function LoginPage() {
  return (
    <AuthForm
      action={login}
      title="Hola de nuevo"
      submitLabel="Entrar"
      footer={
        <>
          ¿Primera vez por acá?{' '}
          <Link href="/registro" className="font-semibold text-[var(--alma-action)]">
            Creá tu cuenta
          </Link>
        </>
      }
    />
  );
}
