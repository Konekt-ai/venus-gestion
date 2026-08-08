import { ImageResponse } from "next/og";
import { marcaDataUri } from "@/lib/marcaSvg";

/**
 * Icono para cuando alguien agrega el sistema a la pantalla de inicio de
 * un iPhone. Sin esto, iOS usa una captura de la pagina como icono.
 *
 * Se genera al compilar a partir del mismo dibujo del resto de la marca,
 * asi no hace falta guardar ninguna imagen en el repositorio.
 */
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img width={size.width} height={size.height} src={marcaDataUri()} alt="" />
      </div>
    ),
    { ...size }
  );
}
