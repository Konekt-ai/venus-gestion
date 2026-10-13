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
 * Hay dos formas de sacarlas:
 *
 *   - Rollo: una etiqueta por pagina, del tamano exacto del rollo que
 *     esta en Ajustes. Es la de omision cuando hay impresora de
 *     etiquetas elegida, porque si se le manda la hoja carta el
 *     navegador la encoge o la agranda para que quepa en el rollo y
 *     las etiquetas salen chiquitas, gigantes o partidas a la mitad.
 *   - Hoja carta: 24 por hoja, para recortar, en una impresora normal.
 */
export default async function EtiquetasModelos({ searchParams }: { searchParams: Params }) {
  await exigirEntrada();
  const sp = await searchParams;
  const prefijo = TEXTO(sp.prefijo);
  const soloConExistencia = TEXTO(sp.con) === "1";
  const copias = Math.min(Math.max(Number(TEXTO(sp.copias)) || 1, 1), 12);

  const ajustes = leerAjustes();
  const hayImpresora = Boolean(ajustes.impresoraEtiquetas);
  const formato: "rollo" | "hoja" =
    TEXTO(sp.formato) === "hoja" || TEXTO(sp.formato) === "rollo"
      ? (TEXTO(sp.formato) as "rollo" | "hoja")
      : hayImpresora
        ? "rollo"
        : "hoja";
  const rollo = formato === "rollo";
  const anchoMm = ajustes.etiquetaAnchoMm;
  const altoMm = ajustes.etiquetaAltoMm;

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
      formato: TEXTO(sp.formato),
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

          <div>
            <p className="etiqueta">En que papel</p>
            <div className="flex flex-wrap gap-2">
              <Link href={enlace({ formato: "rollo", ids: TEXTO(sp.ids) })} className={pastilla(rollo)}>
                Rollo de {anchoMm} x {altoMm} mm
              </Link>
              <Link href={enlace({ formato: "hoja", ids: TEXTO(sp.ids) })} className={pastilla(!rollo)}>
                Hoja carta
              </Link>
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

          {rollo ? (
            <p className="border-l-2 border-[var(--color-linea-fuerte)] bg-[var(--color-crema)] px-3 py-2 text-xs leading-relaxed text-[var(--color-humo)]">
              Van {etiquetas.length.toLocaleString("es-MX")}{" "}
              {etiquetas.length === 1 ? "etiqueta" : "etiquetas"} del rollo de {anchoMm} x{" "}
              {altoMm} mm, una por pagina. Al imprimir elige la impresora de etiquetas, deja la
              escala en <b>Predeterminada</b> y los margenes en <b>Predeterminados</b>. Si salen
              chicas o corridas, el rollo de la impresora en Windows no mide lo mismo que el de
              Ajustes.
            </p>
          ) : (
            <p className="border-l-2 border-[var(--color-linea-fuerte)] bg-[var(--color-crema)] px-3 py-2 text-xs leading-relaxed text-[var(--color-humo)]">
              Van {etiquetas.length.toLocaleString("es-MX")}{" "}
              {etiquetas.length === 1 ? "etiqueta" : "etiquetas"}, o sea{" "}
              {Math.ceil(etiquetas.length / 24).toLocaleString("es-MX")}{" "}
              {Math.ceil(etiquetas.length / 24) === 1 ? "hoja" : "hojas"}. Al imprimir, en las
              opciones de la impresora quita los margenes y los encabezados para que salgan
              derechas.
            </p>
          )}
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
      ) : rollo ? (
        <>
          {/* El tamano de la pagina sale de Ajustes, por eso va aqui y no
              en globals.css. Con @page el navegador ya no escala la hoja
              carta para meterla en el rollo: cada pagina ES una etiqueta.
              Margen 0 tambien quita la fecha y la direccion que el
              navegador imprime arriba y abajo. */}
          <style>{`
            @media print {
              @page { size: ${anchoMm}mm ${altoMm}mm; margin: 0; }
              html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
              main { margin: 0 !important; padding: 0 !important; max-width: none !important; }
            }
          `}</style>
          <div className="flex flex-wrap gap-3 print:block">
            {etiquetas.map((m) => (
              <EtiquetaRollo key={m.llave} modelo={m} anchoMm={anchoMm} altoMm={altoMm} />
            ))}
          </div>
        </>
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

/**
 * Una etiqueta del rollo, medida en milimetros.
 *
 * Todo lo de adentro se calcula como fraccion del alto de la etiqueta:
 * asi, si el rollo cambia de medida en Ajustes, el contenido se
 * reacomoda solo y sigue cabiendo sin encimarse.
 */
function EtiquetaRollo({
  modelo,
  anchoMm,
  altoMm,
}: {
  modelo: { codigo: string; descripcion: string; tallas?: string | null };
  anchoMm: number;
  altoMm: number;
}) {
  const mm = (n: number) => `${Math.round(n * 100) / 100}mm`;
  const orilla = Math.min(1.5, altoMm * 0.06);
  const pie = [modelo.descripcion, modelo.tallas && `T ${modelo.tallas}`]
    .filter(Boolean)
    .join(" · ");

  return (
    <div
      className="etiqueta-rollo flex flex-col items-center justify-center overflow-hidden border border-dashed border-slate-300 bg-white text-center"
      style={{ width: mm(anchoMm), height: mm(altoMm), padding: mm(orilla) }}
    >
      {/* Negro y no dorado: la termica no tiene grises, un color claro
          sale tramado y borroso. */}
      <div className="marca leading-none text-black" style={{ fontSize: mm(altoMm * 0.08) }}>
        Venus
      </div>
      <div
        className="codigo leading-none text-black"
        style={{ fontSize: mm(altoMm * 0.13), marginTop: mm(altoMm * 0.025) }}
      >
        {codigoParaBarras(modelo.codigo)}
      </div>
      {/* Ancho casi completo: entre mas ancha cada barra, mas facil la
          agarra el lector a 203 puntos por pulgada. */}
      <CodigoBarras
        texto={modelo.codigo}
        alto={mm(altoMm * 0.4)}
        className="w-full shrink-0"
      />
      {pie && (
        <div
          className="w-full truncate leading-tight text-black"
          style={{ fontSize: mm(altoMm * 0.085), marginTop: mm(altoMm * 0.025) }}
        >
          {pie}
        </div>
      )}
    </div>
  );
}
