import { NextResponse } from "next/server";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { getDb } from "@/lib/db";
import { puedeEntrar } from "@/lib/acceso";

export const dynamic = "force-dynamic";

/**
 * Descarga una copia completa de la base de datos.
 *
 * Se usa VACUUM INTO en vez de copiar el archivo directo: con el modo
 * WAL activo, copiar venus.db a mano puede dejar fuera lo escrito mas
 * reciente. VACUUM INTO genera un archivo consistente y compactado.
 */
export async function GET() {
  if (!(await puedeEntrar())) {
    return new Response("Entra al sistema con la contrasena para descargar esto.", {
      status: 401,
    });
  }

  const db = getDb();
  const fecha = new Date().toISOString().slice(0, 10);

  const temporal = path.join(
    os.tmpdir(),
    `venus-respaldo-${Date.now()}-${process.pid}.db`
  );

  try {
    // VACUUM INTO falla si el destino ya existe.
    if (fs.existsSync(temporal)) fs.unlinkSync(temporal);

    db.prepare("VACUUM INTO ?").run(temporal);
    const contenido = fs.readFileSync(temporal);

    return new NextResponse(new Uint8Array(contenido), {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="venus-respaldo-${fecha}.db"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof Error
            ? `No se pudo generar el respaldo: ${e.message}`
            : "No se pudo generar el respaldo.",
      },
      { status: 500 }
    );
  } finally {
    try {
      if (fs.existsSync(temporal)) fs.unlinkSync(temporal);
    } catch {
      // Si no se puede borrar el temporal no vale la pena fallar la descarga.
    }
  }
}
