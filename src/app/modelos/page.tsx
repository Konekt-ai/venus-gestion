import { Suspense } from "react";
import Link from "next/link";
import {
  buscarModelos,
  categoriasEnUso,
  listarUbicaciones,
  nombresDeLineas,
  prefijosEnUso,
} from "@/lib/consultas";
import { usaTianguis } from "@/lib/ajustes";
import { Buscador } from "@/components/Buscador";
import { FiltrosModelos } from "@/components/FiltrosModelos";
import { FotoModelo } from "@/components/FotoModelo";
import { RestaurarModelo } from "@/components/RestaurarModelo";
import {
  BotonEnlace,
  Existencia,
  Insignia,
  PastillaUbicacion,
  TituloPagina,
  Vacio,
} from "@/components/ui";
import {
  IconoBuscar,
  IconoEstrella,
  IconoEtiqueta,
  IconoMas,
  IconoPrenda,
} from "@/components/iconos";
import { exigirEntrada } from "@/lib/acceso";

export const dynamic = "force-dynamic";

type Busqueda = { [k: string]: string | string[] | undefined };
type Params = Promise<Busqueda>;

function uno(v: string | string[] | undefined): string {
  return Array.isArray(v) ? (v[0] ?? "") : (v ?? "");
}

/**
 * Arma la direccion de la lista conservando lo que ya estaba puesto.
 *
 * Los chips y el cambio de vista son enlaces de toda la vida y no otro
 * control de cliente: asi la eleccion viaja en la direccion igual que
 * los demas filtros y se puede mandar por mensaje o dejar en favoritos.
 */
function liga(sp: Busqueda, cambios: Record<string, string>): string {
  const p = new URLSearchParams();
  for (const [clave, valor] of Object.entries(sp)) {
    const v = uno(valor);
    if (v) p.set(clave, v);
  }
  for (const [clave, valor] of Object.entries(cambios)) {
    if (valor) p.set(clave, valor);
    else p.delete(clave);
  }
  const cadena = p.toString();
  return cadena ? `/modelos?${cadena}` : "/modelos";
}

// min-h-11 son los 44px que necesita el dedo; en computadora el chip
// puede encoger porque ahi se apunta con el raton.
const CHIP =
  "inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-sm border px-3 text-sm font-semibold transition-colors sm:min-h-9";
const CHIP_APAGADO =
  "border-[var(--color-linea)] bg-[var(--color-papel)] text-[var(--color-humo)] hover:border-[var(--color-oro)] hover:text-[var(--color-tinta)]";
const CHIP_PRENDIDO = "border-transparent bg-[var(--color-vino)] text-white";

export default async function PaginaModelos({ searchParams }: { searchParams: Params }) {
  await exigirEntrada();
  const sp = await searchParams;

  const q = uno(sp.q);
  const existencia = uno(sp.existencia);
  const orden = uno(sp.orden) || "codigo";
  const ubicacionParam = uno(sp.ubicacion);
  const sinUbicacion = uno(sp.sinubicacion) === "1";
  const categoria = uno(sp.categoria);
  const soloDestacados = uno(sp.destacado) === "1";
  // Los dados de baja no salen en ningun lado: esta es la unica puerta
  // para encontrarlos y regresarlos al catalogo.
  const archivados = uno(sp.archivados) === "1";

  // Por omision se queda la lista, no la cuadricula. La cuadricula es mas
  // bonita, pero esta pantalla se abre estando de pie frente al rack para
  // saber "¿hay y donde esta?": en un renglon caben la existencia y la
  // ubicacion y entran casi el doble de modelos por pantallazo. Ahora que
  // el renglon trae su fotito, la lista tambien deja reconocer la prenda,
  // que era lo unico que la cuadricula hacia mejor. Quien anda buscando
  // "el midi de olanes" cambia a cuadricula y la eleccion se le queda en
  // la direccion.
  const enCuadricula = uno(sp.vista) === "cuadricula";

  const modelos = buscarModelos({
    q,
    existencia,
    orden,
    sinUbicacion,
    categoria,
    soloDestacados,
    archivados,
    prefijo: uno(sp.prefijo),
    ubicacionId: ubicacionParam ? parseInt(ubicacionParam, 10) : null,
  });

  const ubicaciones = listarUbicaciones();
  const nombresLinea = nombresDeLineas();
  // El filtro de lineas muestra "VN — Vestidos de Nelly" cuando ya se
  // le puso nombre al prefijo en Ajustes.
  const prefijos = prefijosEnUso().map((p) => ({
    ...p,
    nombre: nombresLinea.get(p.prefijo) ?? "",
  }));
  const categorias = categoriasEnUso();
  const conTianguis = usaTianguis();
  const totalPiezas = modelos.reduce((s, m) => s + m.existencia, 0);

  return (
    <div className="space-y-4">
      <TituloPagina
        titulo={archivados ? "Modelos dados de baja" : "Modelos"}
        descripcion={
          archivados
            ? "Estos ya no salen en las busquedas. Se pueden regresar al catalogo cuando haga falta; su historial nunca se borro."
            : q
              ? `Resultados para "${q}"`
              : "Todo lo que hay registrado en la bodega"
        }
        accion={
          archivados ? (
            <BotonEnlace
              href="/modelos"
              variante="secundario"
              className="no-imprimir w-full !py-3 sm:w-auto sm:!py-2.5"
            >
              Volver al catalogo
            </BotonEnlace>
          ) : (
            <BotonEnlace
              href="/modelos/nuevo"
              className="no-imprimir w-full !py-3 sm:w-auto sm:!py-2.5"
            >
              <IconoMas tamano={17} />
              Nuevo modelo
            </BotonEnlace>
          )
        }
      />

      {/* En la lista de bajas no hay nada que filtrar ni ordenar: son
          pocos y lo unico que se hace ahi es regresar alguno. */}
      {!archivados && (
        <>
          <Suspense fallback={<div className="h-[52px] rounded-sm bg-[var(--color-papel)]" />}>
            <Buscador valorInicial={q} enVivo />
          </Suspense>

          <Suspense fallback={null}>
            <FiltrosModelos ubicaciones={ubicaciones} prefijos={prefijos} />
          </Suspense>
        </>
      )}

      {!archivados && (
      <>
      {/* El tipo de prenda va como tira de chips y no como otro select:
          son dieciseis y con el dedo se elige mas rapido de una tira que
          abriendo una lista, ademas de que asi se ve de una cuantos hay
          de cada tipo. */}
      <div className="desliza-h no-imprimir -mx-4 flex gap-2 px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
        <Link
          href={liga(sp, { destacado: soloDestacados ? "" : "1" })}
          aria-current={soloDestacados ? "true" : undefined}
          className={`${CHIP} ${soloDestacados ? CHIP_PRENDIDO : CHIP_APAGADO}`}
        >
          <IconoEstrella tamano={14} />
          Mas vendidos
        </Link>

        <span
          className="w-px shrink-0 self-stretch bg-[var(--color-linea)]"
          aria-hidden="true"
        />

        <Link
          href={liga(sp, { categoria: "" })}
          aria-current={categoria ? undefined : "true"}
          className={`${CHIP} ${categoria ? CHIP_APAGADO : CHIP_PRENDIDO}`}
        >
          Todo tipo
        </Link>
        {categorias.map((c) => (
          <Link
            key={c.categoria}
            href={liga(sp, { categoria: c.categoria })}
            aria-current={categoria === c.categoria ? "true" : undefined}
            className={`${CHIP} ${categoria === c.categoria ? CHIP_PRENDIDO : CHIP_APAGADO}`}
          >
            {c.categoria}
            <span className="text-xs font-semibold tabular-nums opacity-70">{c.total}</span>
          </Link>
        ))}
      </div>
      </>
      )}

      {archivados ? (
        modelos.length === 0 ? (
          <Vacio
            icono={<IconoPrenda tamano={24} />}
            titulo="No hay ningun modelo dado de baja"
            descripcion="Cuando des de baja un modelo aparecera aqui, por si hay que regresarlo."
            accion={<BotonEnlace href="/modelos">Volver al catalogo</BotonEnlace>}
          />
        ) : (
          <div className="overflow-hidden rounded-sm border border-[var(--color-linea)] bg-[var(--color-papel)]">
            <ul className="divide-y divide-[var(--color-linea)]">
              {modelos.map((m) => (
                <li key={m.id} className="flex items-center gap-3 px-4 py-3">
                  <FotoModelo foto={m.foto || null} descripcion={m.descripcion} tamano="mini" />
                  <span className="min-w-0 flex-1">
                    <span className="codigo block">{m.codigo}</span>
                    <span className="block truncate text-sm text-[var(--color-humo)]">
                      {m.descripcion}
                    </span>
                  </span>
                  <RestaurarModelo modeloId={m.id} codigo={m.codigo} />
                </li>
              ))}
            </ul>
          </div>
        )
      ) : modelos.length === 0 ? (
        <Vacio
          icono={<IconoBuscar tamano={24} />}
          titulo={q ? `No encontre nada con "${q}"` : "No hay modelos con esos filtros"}
          descripcion={
            q
              ? "Prueba escribiendo solo el numero (por ejemplo 194 en vez de VD 194), o parte de la descripcion."
              : "Quita algun filtro para ver mas resultados."
          }
          accion={
            q ? (
              <BotonEnlace href={`/modelos/nuevo?codigo=${encodeURIComponent(q)}`}>
                Dar de alta {q.toUpperCase()}
              </BotonEnlace>
            ) : undefined
          }
        />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-[var(--color-humo)]">
              <strong className="font-semibold text-[var(--color-tinta)]">{modelos.length}</strong>{" "}
              {modelos.length === 1 ? "modelo" : "modelos"} ·{" "}
              <strong className="font-semibold text-[var(--color-tinta)]">
                {totalPiezas.toLocaleString("es-MX")}
              </strong>{" "}
              piezas en bodega
            </p>

            <div className="no-imprimir inline-flex overflow-hidden rounded-sm border border-[var(--color-linea-fuerte)]">
              <Link
                href={liga(sp, { vista: "" })}
                aria-current={enCuadricula ? undefined : "page"}
                className={`inline-flex min-h-11 items-center px-3.5 text-sm font-semibold transition-colors sm:min-h-9 ${
                  enCuadricula
                    ? "bg-[var(--color-papel)] text-[var(--color-humo)]"
                    : "bg-[var(--color-vino)] text-white"
                }`}
              >
                Lista
              </Link>
              <Link
                href={liga(sp, { vista: "cuadricula" })}
                aria-current={enCuadricula ? "page" : undefined}
                className={`inline-flex min-h-11 items-center border-l border-[var(--color-linea-fuerte)] px-3.5 text-sm font-semibold transition-colors sm:min-h-9 ${
                  enCuadricula
                    ? "bg-[var(--color-vino)] text-white"
                    : "bg-[var(--color-papel)] text-[var(--color-humo)]"
                }`}
              >
                Cuadricula
              </Link>
            </div>
          </div>

          {enCuadricula ? (
            /* La cuadricula es el aparador: se busca con el ojo, como se
               busca la ropa de verdad. Dos columnas en el celular porque
               con tres la foto queda tan chica que ya no se distingue un
               olan de un plisado. */
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4 xl:grid-cols-5">
              {modelos.map((m) => (
                <li key={m.id}>
                  <Link
                    href={`/modelos/${m.id}`}
                    className="block h-full overflow-hidden rounded-sm border border-[var(--color-linea)] bg-[var(--color-papel)] transition-colors hover:border-[var(--color-oro)]"
                  >
                    <div className="relative aspect-[3/4] w-full bg-[var(--color-crema)]">
                      <FotoModelo
                        foto={m.foto || null}
                        descripcion={m.descripcion}
                        tamano="tarjeta"
                      />
                      {Boolean(m.destacado) && (
                        <span
                          title="De los mas vendidos"
                          className="absolute left-1.5 top-1.5 inline-flex h-7 w-7 items-center justify-center rounded-sm bg-[var(--color-oro-palido)] text-[#7a6220]"
                        >
                          <IconoEstrella tamano={14} />
                        </span>
                      )}
                    </div>
                    <div className="p-2.5">
                      <div className="codigo text-sm">{m.codigo}</div>
                      <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-[var(--color-humo)]">
                        {m.descripcion}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <Existencia cantidad={m.existencia} minimo={m.minimo} />
                        <PastillaUbicacion codigo={m.ubicacion_codigo} />
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <>
              {/* Tabla en computadora. Un celular acostado ya entra en md: y ahi
                  las columnas no caben, asi que la tabla se desliza dentro
                  de su propio marco en vez de recortarse en silencio. */}
              <div className="desliza-h hidden rounded-sm border border-[var(--color-linea)] bg-[var(--color-papel)] md:block">
                <table className="w-full min-w-[42rem] text-left text-sm">
                  <thead className="border-b border-[var(--color-linea)] bg-[var(--color-crema)] text-[0.7rem] uppercase tracking-[0.08em] text-[var(--color-humo)]">
                    <tr>
                      <th className="w-16 px-3 py-3 font-semibold">
                        <span className="sr-only">Foto</span>
                      </th>
                      <th className="px-4 py-3 font-semibold">Codigo</th>
                      <th className="px-4 py-3 font-semibold">Descripcion</th>
                      <th className="px-4 py-3 font-semibold">Tallas</th>
                      <th className="px-4 py-3 font-semibold">Tela</th>
                      <th className="px-4 py-3 font-semibold">Ubicacion</th>
                      <th className="px-4 py-3 text-right font-semibold">Bodega</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-linea)]">
                    {modelos.map((m) => (
                      <tr key={m.id} className="transition-colors hover:bg-[var(--color-oro-tenue)]">
                        <td className="px-3 py-2">
                          <Link href={`/modelos/${m.id}`} className="block">
                            <FotoModelo
                              foto={m.foto || null}
                              descripcion={m.descripcion}
                              tamano="mini"
                            />
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          <Link href={`/modelos/${m.id}`} className="codigo hover:underline">
                            {m.codigo}
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          <Link href={`/modelos/${m.id}`} className="block hover:underline">
                            {m.descripcion}
                          </Link>
                          {(m.en_tienda > 0 || (conTianguis && m.en_tianguis > 0)) && (
                            <span className="mt-1 flex gap-1">
                              {m.en_tienda > 0 && (
                                <Insignia tono="vino">{m.en_tienda} en tienda</Insignia>
                              )}
                              {conTianguis && m.en_tianguis > 0 && (
                                <Insignia tono="vino">{m.en_tianguis} en tianguis</Insignia>
                              )}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-[var(--color-humo)]">{m.tallas || "—"}</td>
                        <td className="px-4 py-3 text-[var(--color-humo)]">{m.tela || "—"}</td>
                        <td className="px-4 py-3">
                          <PastillaUbicacion
                            codigo={m.ubicacion_codigo}
                            href={m.ubicacion_id ? `/ubicaciones/${m.ubicacion_id}` : undefined}
                          />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Existencia cantidad={m.existencia} minimo={m.minimo} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Tarjetas en celular */}
              <ul className="space-y-2 md:hidden">
                {modelos.map((m) => (
                  <li key={m.id}>
                    <Link
                      href={`/modelos/${m.id}`}
                      className="flex gap-3 rounded-sm border border-[var(--color-linea)] bg-[var(--color-papel)] p-3"
                    >
                      <FotoModelo
                        foto={m.foto || null}
                        descripcion={m.descripcion}
                        tamano="mini"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="codigo text-base">{m.codigo}</div>
                            <div className="mt-0.5 text-sm text-[var(--color-humo)]">
                              {m.descripcion}
                            </div>
                          </div>
                          <Existencia cantidad={m.existencia} minimo={m.minimo} />
                        </div>
                        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                          <PastillaUbicacion codigo={m.ubicacion_codigo} />
                          {m.tallas && <Insignia>{m.tallas}</Insignia>}
                          {m.en_tienda > 0 && (
                            <Insignia tono="vino">{m.en_tienda} en tienda</Insignia>
                          )}
                          {conTianguis && m.en_tianguis > 0 && (
                            <Insignia tono="vino">{m.en_tianguis} en tianguis</Insignia>
                          )}
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}

      {/* Discreto a proposito: solo se busca cuando se dio de baja algo
          por error, pero sin esta puerta no habria como recuperarlo. */}
      {!archivados && (
        <p className="no-imprimir flex flex-wrap items-center justify-center gap-x-5 pt-2 text-center">
          <Link
            href="/modelos/etiquetas"
            className="inline-flex min-h-11 items-center gap-1.5 px-2 text-sm font-semibold text-[var(--color-humo)] hover:text-[var(--color-tinta)] hover:underline"
          >
            <IconoEtiqueta tamano={15} />
            Imprimir etiquetas con codigo de barras
          </Link>
          <Link
            href="/modelos?archivados=1"
            className="inline-flex min-h-11 items-center px-2 text-sm font-semibold text-[var(--color-humo)] hover:text-[var(--color-tinta)] hover:underline"
          >
            Ver modelos dados de baja
          </Link>
        </p>
      )}
    </div>
  );
}
