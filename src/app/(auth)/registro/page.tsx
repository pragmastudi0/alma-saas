import Link from 'next/link';
import { AuthForm } from '@/components/auth-form';
import { registro } from '../actions';

export default function RegistroPage() {
  return (
    <AuthForm
      action={registro}
      title="Tu consultorio, en orden"
      submitLabel="Crear mi cuenta"
      withNombre
      footer={
        <>
          ¿Ya tenés cuenta?{' '}
          <Link href="/login" className="font-semibold text-[var(--alma-action)]">
            Iniciá sesión
          </Link>
        </>
      }
    />
  );
}
