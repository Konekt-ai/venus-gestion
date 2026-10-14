import Link from "next/link";
import { redirect } from "next/navigation";
import {
  buscarModelos,
  modelosPorIds,
  nombresDeLineas,
  obtenerModeloPorCodigo,
  prefijosEnUso,
} from "@/lib/consultas";
import { exigirEntrada } from "@/lib/acceso";
import { leerAjustes } from "@/lib/ajustes";
import { BotonImprimir } from "@/components/BotonImprimir";
import { CodigoBarras } from "@/components/CodigoBarras";
import { codigoParaBarras } from "@/lib/barras";
import { pesos } from "@/lib/dinero";
import { hayTablaPrecios, preciosDeModelos } from "@/lib/precios";
import { Aviso, Boton, EnlaceVolver, Vacio } from "@/components/ui";
import { IconoEtiqueta } from "@/components/iconos";
import type { ModeloConUbicacion } from "@/lib/tipos";

export const dynamic = "force-dynamic";

type Params = Promise<{ [k: string]: string | string[] | undefined }>;

const TEXTO = (p: unknown) => (typeof p === "string" ? p : "");

/** Prendas elegidas a mano, cada una con cuantas etiquetas lleva. */
type Pedido = { id: number; cantidad: number }[];

/**
 * Lee ?ids=12x30,45x8.
 *
 * Si un modelo viene dos veces (se escaneo dos veces la misma etiqueta)
 * se junta en un solo renglon sumando las cantidades.
 */
function leerPedido(texto: string): Pedido {
  const juntos = new Map<number, number>();
  for (const par of texto.split(",")) {
    const m = par.match(/^(\d+)x(\d+)$/);
    if (!m) continue;
    const id = Number(m[1]);
    const cantidad = Number(m[2]);
    if (id > 0 && cantidad > 0) juntos.set(id, (juntos.get(id) ?? 0) + cantidad);
  }
  return [...juntos].map(([id, cantidad]) => ({ id, cantidad }));
}

function escribirPedido(pedido: Pedido): string {
  return pedido.map((x) => `${x.id}x${x.cantidad}`).join(",");
}

/** El mismo pedido con otra cantidad para un modelo. Con 0 se quita. */
function conCantidad(pedido: Pedido, id: number, cantidad: number): Pedido {
  const lugar = pedido.findIndex((x) => x.id === id);
  if (lugar === -1) return cantidad > 0 ? [...pedido, { id, cantidad }] : pedido;
  // Se respeta el lugar que ya tenia en la lista.
  return pedido.flatMap((x, i) => (i !== lugar ? [x] : cantidad > 0 ? [{ id, cantidad }] : []));
}

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
 *   - Rollo: una etiqueta por pagina, del tamano exacto del rollo. Es
 *     la de omision porque es la que usa la tienda: imprimen desde el
 *     navegador a la TSC. Si se le manda la hoja carta, el navegador la
 *     encoge o la agranda para que quepa en el rollo y las etiquetas
 *     salen chiquitas, gigantes o partidas a la mitad.
 *   - Hoja carta: 24 por hoja, para recortar, en una impresora normal.
 *     Solo con ?formato=hoja o con su boton.
 */
export default async function EtiquetasModelos({ searchParams }: { searchParams: Params }) {
  await exigirEntrada();
  const sp = await searchParams;

  // Grupo completo: "todos" o el prefijo de una linea. Vacio es ninguno:
  // al entrar no se arma nada hasta que alguien elige que imprimir, en
  // vez de soltar el catalogo entero de golpe. ?prefijo= es como se
  // llamaba antes; se sigue aceptando por si alguien lo tiene guardado.
  const grupo = TEXTO(sp.grupo) || TEXTO(sp.prefijo);
  const prefijo = grupo === "todos" ? "" : grupo;
  const soloConExistencia = TEXTO(sp.con) === "1";
  // Sin elegir cuantas, sale una de cada modelo.
  const copiasElegidas = TEXTO(sp.copias);
  const copias = Math.min(Math.max(Number(copiasElegidas) || 1, 1), 12);

  const ajustes = leerAjustes();
  const rollo = TEXTO(sp.formato) !== "hoja";
  const anchoMm = ajustes.etiquetaAnchoMm;
  const altoMm = ajustes.etiquetaAltoMm;

  // ?ids=12x30,45x8 pide prendas concretas con su propia cantidad. Lo
  // usan la ficha del modelo, el acuse de una entrada y el buscador de
  // codigos de esta misma pagina.
  const pedido = leerPedido(TEXTO(sp.ids));

  /**
   * Lo que va en la direccion de esta pagina, con algunos cambios.
   *
   * Todo viaja junto: elegir un grupo no borra las prendas especificas
   * ni al reves, y cambiar el papel no pierde ninguna de las dos.
   */
  function parametros(cambios: Record<string, string>): [string, string][] {
    const todo: Record<string, string> = {
      ids: escribirPedido(pedido),
      grupo,
      con: soloConExistencia ? "1" : "",
      copias: copiasElegidas,
      formato: TEXTO(sp.formato),
      ...cambios,
    };
    return Object.entries(todo).filter(([, v]) => v !== "");
  }

  function enlace(cambios: Record<string, string> = {}) {
    const s = new URLSearchParams(parametros(cambios)).toString();
    return s ? `/modelos/etiquetas?${s}` : "/modelos/etiquetas";
  }

  const enlacePedido = (p: Pedido) => enlace({ ids: escribirPedido(p) });

  // ?agregar=VD194&cant=3 llega del buscador de codigos. Se suma a lo
  // que ya estaba elegido y se redirige a la direccion limpia, para que
  // recargar la pagina no lo vuelva a sumar. Funciona igual tecleando
  // el codigo que disparandolo con el lector, que escribe y da Enter.
  const agregar = TEXTO(sp.agregar).trim();
  let sinEncontrar = "";
  if (agregar) {
    const m = obtenerModeloPorCodigo(agregar);
    if (m) {
      const cant = Math.min(
        Math.max(Math.floor(Number(TEXTO(sp.cant))) || 1, 1),
        ajustes.etiquetaTope
      );
      const yaTenia = pedido.find((x) => x.id === m.id)?.cantidad ?? 0;
      redirect(
        enlacePedido(conCantidad(pedido, m.id, Math.min(yaTenia + cant, ajustes.etiquetaTope)))
      );
    }
    sinEncontrar = agregar;
  }

  const todos = buscarModelos({ limite: 2000 });
  const lineas = new Map(nombresDeLineas());

  // Aqui el tope sube al de la configuracion: se pidieron prendas
  // concretas, no "todo el catalogo por treinta".
  const porId = new Map(modelosPorIds(pedido.map((x) => x.id)).map((m) => [m.id, m] as const));
  const elegidas = pedido.flatMap(({ id, cantidad }) => {
    const modelo = porId.get(id);
    return modelo ? [{ modelo, cantidad: Math.min(cantidad, ajustes.etiquetaTope) }] : [];
  });
  const hayPedido = elegidas.length > 0;

  let delGrupoModelos: ModeloConUbicacion[] = [];
  if (grupo) {
    let modelos = prefijo ? todos.filter((m) => m.prefijo === prefijo) : todos;
    if (soloConExistencia) modelos = modelos.filter((m) => m.existencia > 0);
    // Las que ya se eligieron a mano no se repiten: ya llevan su cantidad.
    delGrupoModelos = modelos.filter((m) => !porId.has(m.id));
  }

  // La etiqueta lleva el precio impreso, y una prenda sin precio (o en
  // cero) NO se etiqueta: con la etiqueta puesta sale a piso, y una
  // prenda sin precio en piso es una prenda que se puede ir regalada.
  // Se dejan fuera y se avisa cuales, para que les pongan precio primero.
  // Sin la caja instalada no hay precios en ningun lado: ahi no se puede
  // exigir y las etiquetas salen sin precio, como antes.
  const exigePrecio = hayTablaPrecios();
  const precios = preciosDeModelos([
    ...elegidas.map((x) => x.modelo.id),
    ...delGrupoModelos.map((m) => m.id),
  ]);
  const tienePrecio = (id: number) => !exigePrecio || precios.has(id);

  const elegidasSinPrecio = elegidas.filter((x) => !tienePrecio(x.modelo.id)).map((x) => x.modelo);
  const grupoSinPrecio = delGrupoModelos.filter((m) => !tienePrecio(m.id));
  const sinPrecio = [...elegidasSinPrecio, ...grupoSinPrecio];

  type ConLlave = { llave: string; precio: number | null } & ModeloConUbicacion;

  const deLasElegidas: ConLlave[] = elegidas
    .filter((x) => tienePrecio(x.modelo.id))
    .flatMap(({ modelo, cantidad }) =>
      Array.from({ length: cantidad }, (_, i) => ({
        ...modelo,
        precio: precios.get(modelo.id) ?? null,
        llave: `${modelo.id}-${i}`,
      }))
    );

  // Una etiqueta por prenda: si hay 12 piezas del mismo modelo se
  // necesitan 12 etiquetas iguales, no una.
  const delGrupo: ConLlave[] = delGrupoModelos
    .filter((m) => tienePrecio(m.id))
    .flatMap((m) =>
      Array.from({ length: copias }, (_, i) => ({
        ...m,
        precio: precios.get(m.id) ?? null,
        llave: `${m.id}-g${i}`,
      }))
    );

  const etiquetas = [...deLasElegidas, ...delGrupo];

  if (todos.length === 0) {
    return (
      <Vacio
        icono={<IconoEtiqueta tamano={24} />}
        titulo="Todavia no hay modelos que etiquetar"
        descripcion="Da de alta los modelos y aqui salen sus etiquetas."
      />
    );
  }

  /** Picarle a un filtro lo prende; picarle otra vez lo apaga. */
  const alternar = (clave: string, valor: string, activo: boolean) =>
    enlace({ [clave]: activo ? "" : valor });

  const cuadrito =
    "inline-flex h-9 w-9 items-center justify-center rounded-sm border border-[var(--color-linea-fuerte)] bg-[var(--color-marfil)] text-lg font-semibold hover:border-[var(--color-oro)]";

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
          <div className="space-y-2">
            <p className="etiqueta">Prendas especificas</p>
            {/* Un formulario normal, sin codigo en el navegador: al dar
                Enter (o al leer una etiqueta con el lector) la pagina
                vuelve con la prenda agregada. */}
            <form action="/modelos/etiquetas" method="get" className="flex flex-wrap items-center gap-2">
              {parametros({}).map(([k, v]) => (
                <input key={k} type="hidden" name={k} value={v} />
              ))}
              <input
                name="agregar"
                required
                autoComplete="off"
                // Despues de agregar una, el cursor se queda listo para la
                // siguiente: se pueden escanear varias seguidas.
                autoFocus={hayPedido}
                defaultValue={sinEncontrar}
                placeholder="Codigo, ej. VD 194, o escanealo"
                aria-label="Codigo del modelo"
                className="campo min-w-0 flex-1 sm:max-w-xs"
              />
              <label className="flex items-center gap-2 text-sm font-semibold text-[var(--color-humo)]">
                Cuantas etiquetas
                {/* !w-16: .campo trae width 100% y le gana a w-16 sin el "!". */}
                <input
                  name="cant"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={ajustes.etiquetaTope}
                  defaultValue={1}
                  className="campo sin-flechas !w-16 text-center"
                />
              </label>
              <Boton type="submit">Agregar</Boton>
            </form>

            {sinEncontrar && (
              <Aviso tipo="error">No hay ningun modelo con el codigo {sinEncontrar}.</Aviso>
            )}

            {hayPedido && (
              <div className="rounded-sm border border-[var(--color-linea-fuerte)] bg-[var(--color-papel)]">
                <ul className="divide-y divide-[var(--color-linea)]">
                  {elegidas.map(({ modelo, cantidad }) => (
                    <li key={modelo.id} className="flex items-center gap-3 px-3 py-2">
                      <span className="codigo shrink-0">{modelo.codigo}</span>
                      <span className="min-w-0 flex-1 truncate text-sm text-[var(--color-humo)]">
                        {modelo.descripcion}
                      </span>
                      {tienePrecio(modelo.id) ? (
                        exigePrecio && (
                          <span className="shrink-0 text-sm font-semibold tabular-nums">
                            {pesos(precios.get(modelo.id) ?? 0)}
                          </span>
                        )
                      ) : (
                        <Link
                          href={`/modelos/${modelo.id}/editar`}
                          className="shrink-0 text-xs font-semibold text-[var(--color-rojo)] underline underline-offset-2"
                        >
                          Sin precio
                        </Link>
                      )}
                      <div className="flex shrink-0 items-center gap-1">
                        {cantidad > 1 ? (
                          <Link
                            href={enlacePedido(conCantidad(pedido, modelo.id, cantidad - 1))}
                            aria-label="Una menos"
                            className={cuadrito}
                          >
                            -
                          </Link>
                        ) : (
                          <span className={`${cuadrito} opacity-30`} aria-hidden>
                            -
                          </span>
                        )}
                        <span className="w-8 text-center font-semibold">{cantidad}</span>
                        {cantidad < ajustes.etiquetaTope ? (
                          <Link
                            href={enlacePedido(conCantidad(pedido, modelo.id, cantidad + 1))}
                            aria-label="Una mas"
                            className={cuadrito}
                          >
                            +
                          </Link>
                        ) : (
                          <span className={`${cuadrito} opacity-30`} aria-hidden>
                            +
                          </span>
                        )}
                      </div>
                      <Link
                        href={enlacePedido(conCantidad(pedido, modelo.id, 0))}
                        className="shrink-0 text-sm font-semibold text-[var(--color-humo)] underline underline-offset-2 hover:text-[var(--color-tinta)]"
                      >
                        Quitar
                      </Link>
                    </li>
                  ))}
                </ul>
                <div className="border-t border-[var(--color-linea)] px-3 py-2">
                  <Link
                    href={enlacePedido([])}
                    className="text-sm font-semibold text-[var(--color-humo)] underline underline-offset-2 hover:text-[var(--color-tinta)]"
                  >
                    Quitar todas
                  </Link>
                </div>
              </div>
            )}
          </div>

          <div>
            <p className="etiqueta">Grupo completo (opcional)</p>
            <div className="flex flex-wrap gap-2">
              <Link
                href={
                  grupo === "todos"
                    ? enlace({ grupo: "", con: "", copias: "" })
                    : enlace({ grupo: "todos" })
                }
                className={pastilla(grupo === "todos")}
              >
                Todos ({todos.length})
              </Link>
              {prefijosEnUso().map(({ prefijo: p, total }) => (
                <Link
                  key={p}
                  href={
                    grupo === p ? enlace({ grupo: "", con: "", copias: "" }) : enlace({ grupo: p })
                  }
                  className={pastilla(grupo === p)}
                  title={lineas.get(p) ?? undefined}
                >
                  {lineas.get(p) ?? p} ({total})
                </Link>
              ))}
            </div>
          </div>

          {/* Cuantas y existencia solo tienen sentido con un grupo elegido:
              sin el estorban y parece que hacen algo. */}
          {grupo && (
            <>
              <div>
                <p className="etiqueta">Cuantas de cada modelo del grupo</p>
                <div className="flex flex-wrap gap-2">
                  {[1, 2, 4, 6, 12].map((n) => (
                    <Link
                      key={n}
                      href={alternar("copias", String(n), copiasElegidas === String(n))}
                      className={pastilla(copiasElegidas === String(n))}
                    >
                      {n === 1 ? "Una" : `${n} iguales`}
                    </Link>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Link
                  href={alternar("con", "1", soloConExistencia)}
                  className={pastilla(soloConExistencia)}
                >
                  Solo los que tienen existencia
                </Link>
              </div>
            </>
          )}

          <div>
            <p className="etiqueta">En que papel</p>
            <div className="flex flex-wrap gap-2">
              <Link href={enlace({ formato: "" })} className={pastilla(rollo)}>
                Rollo de {anchoMm} x {altoMm} mm
              </Link>
              <Link href={enlace({ formato: "hoja" })} className={pastilla(!rollo)}>
                Hoja carta
              </Link>
            </div>
          </div>

          {sinPrecio.length > 0 && (
            <Aviso tipo="error">
              {sinPrecio.length === 1
                ? "Esta prenda no tiene precio y su etiqueta no se va a imprimir: "
                : `Estas ${sinPrecio.length} prendas no tienen precio y sus etiquetas no se van a imprimir: `}
              {sinPrecio.slice(0, 12).map((m, i) => (
                <span key={m.id}>
                  {i > 0 && ", "}
                  <Link href={`/modelos/${m.id}/editar`} className="font-semibold underline underline-offset-2">
                    {m.codigo}
                  </Link>
                </span>
              ))}
              {sinPrecio.length > 12 && ` y ${sinPrecio.length - 12} mas`}. Ponles precio y vuelve
              a esta pagina.{" "}
              {sinPrecio.length > 12 && (
                <Link href="/modelos?precio=sin" className="font-semibold underline underline-offset-2">
                  Ver todas las que no tienen precio
                </Link>
              )}
            </Aviso>
          )}

          {etiquetas.length > 0 &&
            (rollo ? (
              <p className="border-l-2 border-[var(--color-linea-fuerte)] bg-[var(--color-crema)] px-3 py-2 text-xs leading-relaxed text-[var(--color-humo)]">
                Van {etiquetas.length.toLocaleString("es-MX")}{" "}
                {etiquetas.length === 1 ? "etiqueta" : "etiquetas"} del rollo de {anchoMm} x{" "}
                {altoMm} mm, una por pagina. Al imprimir elige la impresora de etiquetas, deja la
                escala en <b>Predeterminada</b> y los margenes en <b>Predeterminados</b>. Si salen
                chicas o corridas, el papel de la impresora en Windows no mide {anchoMm} x{" "}
                {altoMm} mm.
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
            ))}
        </div>
      </div>

      {etiquetas.length === 0 ? (
        <div className="no-imprimir">
          {sinPrecio.length > 0 ? (
            <Vacio
              icono={<IconoEtiqueta tamano={24} />}
              titulo="Ninguna se puede imprimir todavia"
              descripcion="Las prendas elegidas no tienen precio. Ponselo y vuelve a esta pagina."
            />
          ) : hayPedido || grupo ? (
            <Vacio
              icono={<IconoEtiqueta tamano={24} />}
              titulo="Ningun modelo con ese filtro"
              descripcion="Prueba con otra linea o quita el filtro de existencia."
            />
          ) : (
            <Vacio
              icono={<IconoEtiqueta tamano={24} />}
              titulo="Elige que etiquetas imprimir"
              descripcion="Escribe o escanea el codigo de una prenda arriba, o elige un grupo completo."
            />
          )}
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
              <div
                className={`codigo mt-1 flex w-full max-w-[4.5cm] items-baseline text-base leading-none text-black ${
                  m.precio ? "justify-between" : "justify-center"
                }`}
              >
                <span>{codigoParaBarras(m.codigo)}</span>
                {m.precio ? <span>{pesos(m.precio)}</span> : null}
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
 * asi, si el rollo cambia de medida, el contenido se
 * reacomoda solo y sigue cabiendo sin encimarse.
 */
function EtiquetaRollo({
  modelo,
  anchoMm,
  altoMm,
}: {
  modelo: { codigo: string; descripcion: string; tallas?: string | null; precio: number | null };
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
      {/* El codigo a la izquierda es para la bodega; el precio a la
          derecha, para la clienta. Mismo tamano y en negritas los dos:
          es lo mas grande de la etiqueta. Sin precio, el codigo se queda
          centrado como siempre. */}
      <div
        className={`codigo flex w-full items-baseline leading-none text-black ${
          modelo.precio ? "justify-between" : "justify-center"
        }`}
        style={{
          fontSize: mm(altoMm * 0.13),
          marginTop: mm(altoMm * 0.025),
          paddingInline: mm(anchoMm * 0.02),
        }}
      >
        <span>{codigoParaBarras(modelo.codigo)}</span>
        {modelo.precio ? <span>{pesos(modelo.precio)}</span> : null}
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
