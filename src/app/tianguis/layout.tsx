import { PestanasTianguis } from "@/components/Navegacion";

/**
 * Todo lo del tianguis cuelga de aqui. En computadora las pestanas van
 * arriba; en el celular se vuelven la barra de abajo (ver BarraMovil).
 */
export default function LayoutTianguis({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-5">
      <PestanasTianguis />
      {children}
    </div>
  );
}
