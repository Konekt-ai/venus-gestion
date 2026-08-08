import Link from "next/link";
import { listarCatalogo, nombresDeLineas, prefijosEnUso, resumen } from "@/lib/consultas";
import { RUTA_BASE_DATOS } from "@/lib/db";
import { ImportadorCSV } from "@/components/ImportadorCSV";
import { DireccionRed } from "@/components/DireccionRed";
import { EditorLineas } from "@/components/EditorLineas";
import { Tarjeta, TituloPagina } from "@/components/ui";

export const dynamic = "force-dynamic";

const ENLACES_EXTRA = [
  { href: "/entradas", texto: "Entradas de mercancia", icono: "📥" },
  { href: "/movimientos", texto: "Historial completo", icono: "🕘" },
  { href: "/ubicaciones/etiquetas", texto: "Imprimir etiquetas de racks", icono: "🏷️" },
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
        {ENLACES_EXTRA.map((e) => (
          <Link
            key={e.href}
            href={e.href}
            className="flex items-center gap-2 rounded-xl border border-[var(--color-borde)] bg-white px-4 py-3 text-sm font-semibold"
          >
            <span aria-hidden="true">{e.icono}</span>
            {e.texto}
          </Link>
        ))}
      </div>

      <Tarjeta className="space-y-3">
        <div>
          <h2 className="text-base font-bold">Respaldo</h2>
          <p className="mt-1 text-sm text-[var(--color-suave)]">
            Todo el inventario vive en un solo archivo. Descargalo de vez en cuando y guardalo en
            una USB o en el correo: con ese archivo se recupera el sistema completo.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <a
            href="/api/respaldo"
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-marca-700)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--color-marca-900)]"
          >
            💾 Descargar respaldo completo
          </a>
          <a
            href="/api/exportar?tipo=inventario"
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-borde)] bg-white px-4 py-2.5 text-sm font-semibold hover:bg-slate-50"
          >
            📄 Inventario en Excel (CSV)
          </a>
          <a
            href="/api/exportar?tipo=movimientos"
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-borde)] bg-white px-4 py-2.5 text-sm font-semibold hover:bg-slate-50"
          >
            📄 Historial en Excel (CSV)
          </a>
        </div>

        <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-[var(--color-suave)]">
          El archivo esta en <code className="font-mono">{RUTA_BASE_DATOS}</code>
        </p>
      </Tarjeta>

      <EditorLineas
        prefijos={prefijosEnUso()}
        nombres={Object.fromEntries(nombresDeLineas())}
      />

      <ImportadorCSV />

      <DireccionRed />

      <Tarjeta>
        <h2 className="text-base font-bold">Como va el inventario</h2>
        <dl className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { t: "Modelos", v: datos.total_modelos },
            { t: "Piezas en bodega", v: datos.total_piezas },
            { t: "Ubicaciones", v: datos.total_ubicaciones },
            { t: "Sin ubicacion", v: datos.sin_ubicacion },
          ].map((x) => (
            <div key={x.t}>
              <dt className="etiqueta !mb-0.5">{x.t}</dt>
              <dd className="text-xl font-bold">{x.v.toLocaleString("es-MX")}</dd>
            </div>
          ))}
        </dl>
      </Tarjeta>

      <Tarjeta>
        <h2 className="text-base font-bold">Valores sugeridos al capturar</h2>
        <p className="mt-1 text-sm text-[var(--color-suave)]">
          Aparecen como sugerencia al dar de alta un modelo. Puedes escribir cualquier otro valor:
          se agrega solo a la lista.
        </p>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          {catalogos.map((c) => (
            <div key={c.titulo}>
              <p className="etiqueta">{c.titulo}</p>
              <div className="flex flex-wrap gap-1">
                {c.valores.map((v) => (
                  <span
                    key={v}
                    className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600"
                  >
                    {v}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Tarjeta>
    </div>
  );
}
