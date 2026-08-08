import { MODO_DEMO } from "@/lib/db";
import { IconoAlerta } from "@/components/iconos";

/**
 * Franja que aclara que lo que se esta viendo es una demostracion.
 *
 * Es importante que se vea: sin ella, alguien podria capturar inventario
 * de verdad aqui y perderlo cuando el servidor recicle la instancia.
 * No aparece cuando el sistema corre en la bodega.
 */
export function AvisoDemo() {
  if (!MODO_DEMO) return null;

  return (
    <div className="no-imprimir bg-[var(--color-ambar-palido)] px-4 py-2 text-[var(--color-ambar)] sm:px-8">
      <p className="mx-auto flex max-w-6xl items-start gap-2 text-xs leading-relaxed sm:items-center">
        <span className="mt-px shrink-0 sm:mt-0">
          <IconoAlerta tamano={15} />
        </span>
        <span>
          <strong className="font-semibold">Version de demostracion.</strong> Los datos son de
          ejemplo y se reinician solos: puedes probar todo con confianza, pero no captures aqui el
          inventario de verdad.
        </span>
      </p>
    </div>
  );
}
