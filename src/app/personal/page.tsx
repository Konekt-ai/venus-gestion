import { listarPersonal } from "@/lib/consultas";
import { GestorPersonal } from "@/components/GestorPersonal";
import { Tarjeta, TituloPagina } from "@/components/ui";

export const dynamic = "force-dynamic";

export default function PaginaPersonal() {
  // Con las bajas incluidas: el gestor las separa y las deja reactivar.
  const personal = listarPersonal(false);

  return (
    <div className="space-y-5">
      <TituloPagina
        titulo="Personal"
        descripcion="Quienes trabajan en el negocio. Sus nombres son los que firman los movimientos."
      />

      <GestorPersonal personal={personal} />

      {/* Va abajo a proposito: quien entra aqui viene a dar de alta a
          alguien, no a leer. La explicacion queda para la primera vez y
          para cuando el cliente se pregunte de que sirve la lista. */}
      <Tarjeta className="space-y-2">
        <h2 className="titulo text-lg">Para que sirve esta lista</h2>
        <p className="text-sm leading-relaxed text-[var(--color-humo)]">
          Cada vez que sale o entra mercancia queda firmado <strong>quien la saco</strong> y{" "}
          <strong>quien la recibio</strong>. Teniendo aqui a la gente, en la bodega solo se escoge
          el nombre de una lista en vez de escribirlo con el dedo: se captura mas rapido y el
          nombre queda siempre escrito igual, no una vez Mary y otra Maria.
        </p>
        <p className="text-sm leading-relaxed text-[var(--color-humo)]">
          Mas adelante, cuando este el sistema de la caja, esta misma lista va a servir para saber{" "}
          <strong>que vendedora hizo cada venta</strong>. Por eso conviene dar de alta tambien a
          las de mostrador, aunque hoy no bajen a la bodega.
        </p>
      </Tarjeta>
    </div>
  );
}
