import { PacienteForm } from '@/components/paciente-form';
import { BackLink } from '@/components/back-link';
import { crearPaciente } from '../actions';

export default function NuevoPacientePage() {
  return (
    <main className="pb-10">
      <header className="mb-5 flex items-center gap-2">
        <BackLink href="/pacientes" />
        <h1 className="text-[22px] font-semibold">Nuevo paciente</h1>
      </header>

      <PacienteForm action={crearPaciente} submitLabel="Guardar paciente" />
    </main>
  );
}
