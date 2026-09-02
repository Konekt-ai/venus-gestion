import Link from "next/link";
import { buscarModelos, modelosPorIds, nombresDeLineas, prefijosEnUso } from "@/lib/consultas";
import { exigirEntrada } from "@/lib/acceso";
import { leerAjustes } from "@/lib/ajustes";
import { BotonImprimir } from "@/components/BotonImprimir";
import { CodigoBarras } from "@/components/CodigoBarras";
import { codigoParaBarras } from "@/lib/barras";
import { EnlaceVolver, Vacio } from "@/components/ui";
import { IconoEtiqueta } from "@/components/iconos";

export const dynamic = "force-dynamic";

type Params = Promise<{ [k: string]: string | string[] | undefined }>;

const TEXTO = (p: unknown) => (typeof p === "string" ? p : "");

/**
 * Etiquetas con codigo de barras para las prendas.
 *
 * El lector de codigos se conecta por USB y funciona como un teclado:
 * al leer una etiqueta escribe el codigo en el buscador y da Enter, y
 * el modelo aparece solo. Asi ya no hay que teclear "VD 194" a mano ni
 * acordarse de los codigos.
 *
 * Salen 24 por hoja carta, del tamano de las etiquetas de rollo que ya
 * se usan para colgar en la prenda.
 */
export default async function EtiquetasModelos({ searchParams }: { searchParams: Params }) {
  await exigirEntrada();
  const sp = await searchParams;
  const prefijo = TEXTO(sp.prefijo);
  const soloConExistencia = TEXTO(sp.con) === "1";
  const copias = Math.min(Math.max(Number(TEXTO(sp.copias)) || 1, 1), 12);

  const ajustes = leerAjustes();

  // ?ids=12x30,45x8 pide prendas concretas con su propia cantidad. Lo
  // usa el boton de la ficha y el acuse de una entrada cuando no hay
  // impresora de rollo configurada.
  const pedido = TEXTO(sp.ids)
    .split(",")
    .map((par) => par.match(/^(\d+)x(\d+)$/))
    .filter((m): m is RegExpMatchArray => m !== null)
    .map((m) => ({ id: Number(m[1]), cantidad: Number(m[2]) }))
    .filter((x) => x.id > 0 && x.cantidad > 0);

  const todos = buscarModelos({ limite: 2000 });
  const lineas = new Map(nombresDeLineas());

  let etiquetas: ({ llave: string } & (typeof todos)[number])[];

  if (pedido.length > 0) {
    // Aqui el tope sube al de la configuracion: se pidieron prendas
    // concretas, no "todo el catalogo por treinta".
    const porId = new Map(modelosPorIds(pedido.map((x) => x.id)).map((m) => [m.id, m]));
    etiquetas = pedido.flatMap(({ id, cantidad }) => {
      const m = porId.get(id);
      if (!m) return [];
      const cuantas = Math.min(cantidad, ajustes.etiquetaTope);
      return Array.from({ length: cuantas }, (_, i) => ({ ...m, llave: `${id}-${i}` }));
    });
  } else {
    let modelos = prefijo ? todos.filter((m) => m.prefijo === prefijo) : todos;
    if (soloConExistencia) modelos = modelos.filter((m) => m.existencia > 0);

    // Una etiqueta por prenda: si hay 12 piezas del mismo modelo se
    // necesitan 12 etiquetas iguales, no una.
    etiquetas = modelos.flatMap((m) =>
      Array.from({ length: copias }, (_, i) => ({ ...m, llave: `${m.id}-${i}` }))
    );
  }

  if (todos.length === 0) {
    return (
      <Vacio
        icono={<IconoEtiqueta tamano={24} />}
        titulo="Todavia no hay modelos que etiquetar"
        descripcion="Da de alta los modelos y aqui salen sus etiquetas."
      />
    );
  }

  function enlace(cambios: Record<string, string>) {
    const base: Record<string, string> = {
      prefijo,
      con: soloConExistencia ? "1" : "",
      copias: String(copias),
      ...cambios,
    };
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(base)) {
      // Una copia de cada uno es lo normal: no ensucia la direccion.
      if (v && !(k === "copias" && v === "1")) p.set(k, v);
    }
    const s = p.toString();
    return s ? `/modelos/etiquetas?${s}` : "/modelos/etiquetas";
  }

  const pastilla = (activa: boolean) =>
    `rounded-sm border px-3 py-3 text-sm font-semibold transition-colors sm:py-1.5 ${
      activa
        ? "border-[var(--color-vino)] bg-[var(--color-vino-palido)] text-[var(--color-vino)]"
        : "border-[var(--color-linea-fuerte)] bg-[var(--color-papel)] text-[var(--color-humo)] hover:border-[var(--color-oro)]"
    }`;

  return (
    <div>
      <div className="no-imprimir mb-5">
        <div className="mb-4">
          <EnlaceVolver href="/modelos">Volver a modelos</EnlaceVolver>
        </div>

        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="titulo text-[1.75rem] sm:text-[2rem]">Etiquetas con codigo de barras</h1>
            <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-humo)]">
              Imprime, recorta y cuelga una en cada prenda. Despues, con el lector de codigos,
              basta apuntarle a la etiqueta para que el modelo salga en pantalla.
            </p>
          </div>
          <BotonImprimir />
        </div>

        <div className="mt-4 space-y-3">
          <div>
            <p className="etiqueta">Que modelos</p>
            <div className="flex flex-wrap gap-2">
              <Link href={enlace({ prefijo: "" })} className={pastilla(!prefijo)}>
                Todos ({todos.length})
              </Link>
              {prefijosEnUso().map(({ prefijo: p, total }) => (
                <Link
                  key={p}
                  href={enlace({ prefijo: p })}
                  className={pastilla(prefijo === p)}
                  title={lineas.get(p) ?? undefined}
                >
                  {lineas.get(p) ?? p} ({total})
                </Link>
              ))}
            </div>
          </div>

          <div>
            <p className="etiqueta">Cuantas de cada modelo</p>
            <div className="flex flex-wrap gap-2">
              {[1, 2, 4, 6, 12].map((n) => (
                <Link key={n} href={enlace({ copias: String(n) })} className={pastilla(copias === n)}>
                  {n === 1 ? "Una" : `${n} iguales`}
                </Link>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href={enlace({ con: soloConExistencia ? "" : "1" })}
              className={pastilla(soloConExistencia)}
            >
              Solo los que tienen existencia
            </Link>
          </div>

          <p className="border-l-2 border-[var(--color-linea-fuerte)] bg-[var(--color-crema)] px-3 py-2 text-xs leading-relaxed text-[var(--color-humo)]">
            Van {etiquetas.length.toLocaleString("es-MX")}{" "}
            {etiquetas.length === 1 ? "etiqueta" : "etiquetas"}, o sea{" "}
            {Math.ceil(etiquetas.length / 24).toLocaleString("es-MX")}{" "}
            {Math.ceil(etiquetas.length / 24) === 1 ? "hoja" : "hojas"}. Al imprimir, en las
            opciones de la impresora quita los margenes y los encabezados para que salgan
            derechas.
          </p>
        </div>
      </div>

      {etiquetas.length === 0 ? (
        <div className="no-imprimir">
          <Vacio
            icono={<IconoEtiqueta tamano={24} />}
            titulo="Ningun modelo con ese filtro"
            descripcion="Prueba con otra linea o quita el filtro de existencia."
          />
        </div>
      ) : (
        /* Dos por renglon en el celular para que se vean, tres al
           imprimir: 3 x 8 son las 24 de una hoja carta. */
        <div className="grid grid-cols-2 gap-0 sm:grid-cols-3 print:grid-cols-3">
          {etiquetas.map((m) => (
            <div
              key={m.llave}
              className="hoja flex h-[3.4cm] flex-col items-center justify-center border border-dashed border-slate-300 px-2 py-1.5 text-center"
            >
              <div className="marca text-[0.6rem] leading-none text-[#8a6d1f]">Venus</div>
              {/* Sin espacio, igual que en la etiqueta de rollo y que en las
                  que el negocio ya tiene pegadas. */}
              <div className="codigo mt-1 text-base leading-none text-black">
                {codigoParaBarras(m.codigo)}
              </div>
              <CodigoBarras texto={m.codigo} alto={34} className="mt-1.5 w-full max-w-[4.5cm]" />
              <div className="mt-1 line-clamp-1 w-full text-[0.6rem] leading-tight text-slate-600">
                {m.descripcion}
              </div>
              {(m.tallas || m.ubicacion_codigo) && (
                <div className="mt-0.5 text-[0.55rem] leading-tight text-slate-500">
                  {m.tallas && `Tallas ${m.tallas}`}
                  {m.tallas && m.ubicacion_codigo && " · "}
                  {m.ubicacion_codigo}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
