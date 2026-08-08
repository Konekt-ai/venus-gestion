import Link from "next/link";
import { listarCatalogo, nombresDeLineas, prefijosEnUso, resumen } from "@/lib/consultas";
import { RUTA_BASE_DATOS } from "@/lib/db";
import { DESARROLLADOR, NOMBRE_SISTEMA } from "@/lib/marca";
import { ImportadorCSV } from "@/components/ImportadorCSV";
import { DireccionRed } from "@/components/DireccionRed";
import { EditorLineas } from "@/components/EditorLineas";
import { Tarjeta, TituloPagina } from "@/components/ui";
import {
  IconoDescargar,
  IconoDocumento,
  IconoEntrada,
  IconoEtiqueta,
  IconoHistorial,
} from "@/components/iconos";

export const dynamic = "force-dynamic";

const ENLACES_EXTRA = [
  { href: "/entradas", texto: "Entradas de mercancia", Icono: IconoEntrada },
  { href: "/movimientos", texto: "Historial completo", Icono: IconoHistorial },
  { href: "/ubicaciones/etiquetas", texto: "Etiquetas de racks", Icono: IconoEtiqueta },
];

export default function Configuracion() {
  const datos = resumen();

  const catalogos = [
    { titulo: "Tallas", valores: listarCatalogo("talla") },
    { titulo: "Telas", valores: listarCatalogo("tela") },
    { titulo: "Colores", valores: listarCatalogo("color") },
    { titulo: "Tipos de prenda", valores: listarCatalogo("categoria") },
  ];

  return (
    <div className="space-y-5">
      <TituloPagina titulo="Ajustes" descripcion="Respaldos, importacion y datos del sistema." />

      {/* En celular la barra de abajo no lleva todo; aqui esta el resto. */}
      <div className="grid gap-2 sm:grid-cols-3 md:hidden">
        {ENLACES_EXTRA.map(({ href, texto, Icono }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-2.5 rounded-sm border border-[var(--color-linea)] bg-[var(--color-papel)] px-4 py-3 text-sm font-semibold"
          >
            <span className="text-[var(--color-oro)]">
              <Icono tamano={18} />
            </span>
            {texto}
          </Link>
        ))}
      </div>

      <Tarjeta className="space-y-4">
        <div>
          <h2 className="titulo text-lg">Respaldo</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-humo)]">
            Todo el inventario vive en un solo archivo. Descargalo de vez en cuando y guardalo en
            una USB o en el correo: con ese archivo se recupera el sistema completo.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <a
            href="/api/respaldo"
            className="inline-flex items-center gap-2 rounded-sm bg-[var(--color-tinta)] px-4 py-2.5 text-sm font-semibold text-[var(--color-oro-claro)] transition-colors hover:bg-[var(--color-carbon)]"
          >
            <IconoDescargar tamano={16} />
            Descargar respaldo completo
          </a>
          <a
            href="/api/exportar?tipo=inventario"
            className="inline-flex items-center gap-2 rounded-sm border border-[var(--color-linea-fuerte)] bg-[var(--color-papel)] px-4 py-2.5 text-sm font-semibold transition-colors hover:border-[var(--color-oro)]"
          >
            <IconoDocumento tamano={16} />
            Inventario en Excel
          </a>
          <a
            href="/api/exportar?tipo=movimientos"
            className="inline-flex items-center gap-2 rounded-sm border border-[var(--color-linea-fuerte)] bg-[var(--color-papel)] px-4 py-2.5 text-sm font-semibold transition-colors hover:border-[var(--color-oro)]"
          >
            <IconoDocumento tamano={16} />
            Historial en Excel
          </a>
        </div>

        <p className="border-l-2 border-[var(--color-linea-fuerte)] bg-[var(--color-crema)] px-3 py-2 text-xs text-[var(--color-humo)]">
          El archivo esta en{" "}
          <code className="font-mono text-[var(--color-tinta)]">{RUTA_BASE_DATOS}</code>
        </p>
      </Tarjeta>

      <EditorLineas
        prefijos={prefijosEnUso()}
        nombres={Object.fromEntries(nombresDeLineas())}
      />

      <ImportadorCSV />

      <DireccionRed />

      <Tarjeta>
        <h2 className="titulo text-lg">Como va el inventario</h2>
        <dl className="mt-4 grid grid-cols-2 gap-5 sm:grid-cols-4">
          {[
            { t: "Modelos", v: datos.total_modelos },
            { t: "Piezas en bodega", v: datos.total_piezas },
            { t: "Ubicaciones", v: datos.total_ubicaciones },
            { t: "Sin ubicacion", v: datos.sin_ubicacion },
          ].map((x) => (
            <div key={x.t}>
              <dt className="etiqueta !mb-1">{x.t}</dt>
              <dd className="titulo text-2xl tabular-nums">{x.v.toLocaleString("es-MX")}</dd>
            </div>
          ))}
        </dl>
      </Tarjeta>

      <Tarjeta>
        <h2 className="titulo text-lg">Valores sugeridos al capturar</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-humo)]">
          Aparecen como sugerencia al dar de alta un modelo. Puedes escribir cualquier otro valor:
          se agrega solo a la lista.
        </p>
        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          {catalogos.map((c) => (
            <div key={c.titulo}>
              <p className="etiqueta">{c.titulo}</p>
              <div className="flex flex-wrap gap-1">
                {c.valores.map((v) => (
                  <span
                    key={v}
                    className="rounded-sm bg-[var(--color-crema)] px-2 py-0.5 text-xs font-semibold text-[var(--color-humo)]"
                  >
                    {v}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Tarjeta>

      <footer className="border-t border-[var(--color-linea)] pt-5 pb-2 text-center">
        <p className="marca text-lg text-[var(--color-oro)]">{NOMBRE_SISTEMA}</p>
        <p className="mt-1 text-xs text-[var(--color-humo)]">
          Sistema de bodega · Software desarrollado por{" "}
          <span className="font-semibold text-[var(--color-tinta)]">{DESARROLLADOR}</span>
        </p>
        <p className="mt-1 text-[0.7rem] text-[var(--color-humo)]">
          © {new Date().getFullYear()} {DESARROLLADOR}. Todos los derechos reservados.
        </p>
      </footer>
    </div>
  );
}
