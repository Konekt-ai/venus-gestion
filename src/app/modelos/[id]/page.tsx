import { notFound } from "next/navigation";
import {
  listarPersonal,
  movimientosDeModelo,
  nombresDeLineas,
  obtenerModelo,
} from "@/lib/consultas";
import { usaTianguis } from "@/lib/ajustes";
import { AccionesMovimiento } from "@/components/AccionesMovimiento";
import { FotoModelo } from "@/components/FotoModelo";
import {
  Aviso,
  BotonEnlace,
  EnlaceVolver,
  Existencia,
  Insignia,
  PastillaUbicacion,
  Tarjeta,
} from "@/components/ui";
import { IconoEditar, IconoEstrella } from "@/components/iconos";
import { NOMBRE_MOVIMIENTO } from "@/lib/tipos";

export const dynamic = "force-dynamic";

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div>
      <dt className="etiqueta !mb-0.5">{etiqueta}</dt>
      <dd className="text-sm font-medium">{valor || "—"}</dd>
    </div>
  );
}

export default async function FichaModelo({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const modelo = obtenerModelo(parseInt(id, 10));

  if (!modelo) notFound();

  const historial = movimientosDeModelo(modelo.id, 40);
  const nombreLinea = modelo.prefijo ? nombresDeLineas().get(modelo.prefijo) : undefined;
  const conTianguis = usaTianguis();
  const personal = listarPersonal();

  // Las notas traen la ficha tecnica del PDF en renglones (Descripcion,
  // Indicaciones, Avios, Proveedor) y, en los codigos que venian repetidos,
  // un renglon "OJO:". Esa advertencia es sobre el codigo mismo, asi que se
  // saca de la ficha y se sube arriba: enterrada entre los avios no la ve
  // nadie.
  const renglonesNotas = modelo.notas
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const esAdvertencia = (l: string) => l.toUpperCase().startsWith("OJO:");
  const advertencias = renglonesNotas.filter(esAdvertencia);
  const ficha = renglonesNotas.filter((l) => !esAdvertencia(l));

  return (
    <div className="space-y-5">
      <EnlaceVolver href="/modelos">Volver a modelos</EnlaceVolver>

      <div className="grid gap-4 sm:grid-cols-[13rem_minmax(0,1fr)] sm:gap-6">
        {/* En el celular la foto va primero, pero con alto contenido: a todo
            lo alto empujaba el codigo y la ubicacion fuera de la pantalla, y
            a esto se entra estando parado frente al rack. */}
        <div className="h-60 max-h-[40vh] w-full overflow-hidden rounded-sm border border-[var(--color-linea)] bg-[var(--color-crema)] sm:aspect-[3/4] sm:h-auto sm:max-h-none">
          <FotoModelo
            foto={modelo.foto || null}
            descripcion={modelo.descripcion}
            tamano="grande"
          />
        </div>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="codigo text-3xl sm:text-4xl">{modelo.codigo}</h1>
            <p className="titulo mt-1 text-lg text-[var(--color-humo)]">{modelo.descripcion}</p>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <PastillaUbicacion
                codigo={modelo.ubicacion_codigo}
                href={modelo.ubicacion_id ? `/ubicaciones/${modelo.ubicacion_id}` : undefined}
              />
              {nombreLinea && (
                <Insignia>
                  {modelo.prefijo} · {nombreLinea}
                </Insignia>
              )}
              {modelo.categoria && <Insignia>{modelo.categoria}</Insignia>}
              {Boolean(modelo.destacado) && (
                <Insignia tono="oro">
                  <IconoEstrella tamano={12} />
                  Mas vendido
                </Insignia>
              )}
            </div>
          </div>

          <div className="no-imprimir flex w-full gap-2 sm:w-auto">
            <BotonEnlace
              href={`/modelos/${modelo.id}/editar`}
              variante="secundario"
              className="w-full !py-3 sm:w-auto sm:!py-2.5"
            >
              <IconoEditar tamano={16} />
              Editar
            </BotonEnlace>
          </div>
        </div>
      </div>

      {advertencias.map((texto, i) => (
        <Aviso key={i} tipo="error">
          {texto}
        </Aviso>
      ))}

      {/* Apiladas, las tres cifras empujaban fuera de pantalla "¿Que paso con
          este modelo?", que es a lo que se entra estando frente al rack. */}
      <div
        className={`grid grid-cols-2 gap-2 sm:gap-3 ${conTianguis ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}
      >
        <Tarjeta className="col-span-2 text-center sm:col-span-1">
          <p className="etiqueta">En bodega</p>
          <div className="mt-1">
            <Existencia cantidad={modelo.existencia} minimo={modelo.minimo} tamano="grande" />
          </div>
        </Tarjeta>
        <Tarjeta className="text-center !p-4 sm:!p-5">
          <p className="etiqueta">En la tienda</p>
          <p className="titulo mt-1 text-3xl tabular-nums">{modelo.en_tienda}</p>
        </Tarjeta>
        {conTianguis && (
          <Tarjeta className="text-center !p-4 sm:!p-5">
            <p className="etiqueta">En el tianguis</p>
            <p className="titulo mt-1 text-3xl tabular-nums">{modelo.en_tianguis}</p>
          </Tarjeta>
        )}
      </div>

      <section className="no-imprimir">
        <h2 className="titulo mb-3 text-xl">¿Que paso con este modelo?</h2>
        <AccionesMovimiento
          modeloId={modelo.id}
          existencia={modelo.existencia}
          enTienda={modelo.en_tienda}
          enTianguis={modelo.en_tianguis}
          usaTianguis={conTianguis}
          personal={personal}
        />
      </section>

      <Tarjeta>
        <h2 className="titulo mb-4 text-xl">Datos de la prenda</h2>
        <dl className="grid grid-cols-2 gap-5 sm:grid-cols-4">
          <Dato etiqueta="Tallas" valor={modelo.tallas} />
          <Dato etiqueta="Colores" valor={modelo.colores} />
          <Dato etiqueta="Tela" valor={modelo.tela} />
          <Dato
            etiqueta="Avisar bajo"
            valor={modelo.minimo > 0 ? `${modelo.minimo} piezas` : "No avisar"}
          />
        </dl>
        {ficha.length > 0 && (
          // Cada renglon del PDF es un dato aparte. De corrido, "CONFECCIONAR
          // EN OVER 4 HILOS ETIQUETA PARADA" se lee como una sola frase y no
          // se distingue donde termina la indicacion y empieza el avio.
          <div className="mt-5 border-l-2 border-[var(--color-oro)] bg-[var(--color-oro-tenue)] px-4 py-3">
            <span className="etiqueta">Ficha de la prenda</span>
            <div className="space-y-2">
              {ficha.map((renglon, i) => {
                const corte = renglon.indexOf(":");
                // Solo cuenta como rotulo lo que viene antes de unos pocos
                // caracteres: si no, una frase con dos puntos a la mitad se
                // partiria en un rotulo larguisimo.
                const conRotulo = corte > 0 && corte <= 20;
                const rotulo = conRotulo ? renglon.slice(0, corte) : "";
                const valor = conRotulo ? renglon.slice(corte + 1).trim() : renglon;

                return (
                  <div key={i} className="sm:flex sm:gap-3">
                    {rotulo && (
                      <span className="block text-[0.6875rem] font-semibold uppercase leading-5 tracking-[0.09em] text-[var(--color-humo)] sm:w-24 sm:shrink-0">
                        {rotulo}
                      </span>
                    )}
                    <span className="block text-sm leading-relaxed">{valor}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Tarjeta>

      <section>
        <h2 className="titulo mb-3 text-xl">Historial</h2>
        {historial.length === 0 ? (
          <Tarjeta>
            <p className="text-sm text-[var(--color-humo)]">
              Todavia no hay movimientos registrados.
            </p>
          </Tarjeta>
        ) : (
          <Tarjeta className="!p-0">
            <ul className="divide-y divide-[var(--color-linea)]">
              {historial.map((mv) => {
                const diferencia = mv.existencia_despues - mv.existencia_antes;
                return (
                  <li key={mv.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">
                        {NOMBRE_MOVIMIENTO[mv.tipo] ?? mv.tipo}
                      </p>
                      <p className="text-xs text-[var(--color-humo)]">
                        {mv.fecha.slice(0, 16)}
                        {mv.persona && ` · ${mv.persona}`}
                        {mv.nota && ` · ${mv.nota}`}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p
                        className={`text-sm font-semibold tabular-nums ${
                          diferencia > 0
                            ? "text-[var(--color-verde)]"
                            : diferencia < 0
                              ? "text-[var(--color-rojo)]"
                              : "text-[var(--color-humo)]"
                        }`}
                      >
                        {diferencia > 0 ? `+${diferencia}` : diferencia}
                      </p>
                      <p className="text-xs text-[var(--color-humo)]">
                        quedaron {mv.existencia_despues}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </Tarjeta>
        )}
      </section>
    </div>
  );
}
