import { ImageResponse } from "next/og";
import { marcaDataUri } from "@/lib/marcaSvg";

/**
 * Los iconos en PNG que pide Android para considerar el sistema
 * instalable en la pantalla de inicio.
 *
 *   /icono/192   cuadrado normal
 *   /icono/512   cuadrado normal, grande
 *   /icono/512m  version recortable ("maskable")
 *
 * Se generan al compilar desde el mismo dibujo de la marca.
 */
export const dynamic = "force-static";

export function generateStaticParams() {
  return [{ tamano: "192" }, { tamano: "512" }, { tamano: "512m" }];
}

export async function GET(
  _peticion: Request,
  { params }: { params: Promise<{ tamano: string }> }
) {
  const { tamano } = await params;
  const lado = tamano === "192" ? 192 : 512;
  const recortable = tamano === "512m";

  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img width={lado} height={lado} src={marcaDataUri(recortable)} alt="" />
      </div>
    ),
    { width: lado, height: lado }
  );
}
