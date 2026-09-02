param(
  [ValidateSet("listar", "estado", "imprimir")]
  [string]$Accion = "listar",
  [string]$Impresora = "",
  [string]$Archivo = "",
  [string]$Trabajo = "Venus - etiquetas",
  [int]$EsperaMs = 1500
)

# ============================================================
#  VENUS - Puente con la impresora de etiquetas
#
#  El sistema no puede hablarle directo a la impresora: Node no
#  tiene forma de mandarle bytes crudos a una impresora de Windows
#  sin compilar cosas. Este guion es ese puente.
#
#  "Crudo" (RAW) es la parte importante. Una impresora de etiquetas
#  no entiende paginas: entiende su propio lenguaje, TSPL. Si el
#  trabajo se manda normal, el driver lo convierte en un dibujo y la
#  etiqueta sale en blanco o con los comandos escritos como texto.
#  Mandandolo como RAW, el spooler entrega los bytes tal cual.
#
#  TODA la salida es UN renglon de JSON, tambien cuando falla, para
#  que del otro lado no haya que adivinar leyendo mensajes de error.
# ============================================================

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

function Responder($objeto) {
  # -Compress para que quepa en un renglon; Node lo lee de un jalon.
  Write-Output ($objeto | ConvertTo-Json -Compress -Depth 4)
  exit 0
}

function Fallar($codigo, $mensaje) {
  Responder @{ ok = $false; codigo = $codigo; mensaje = $mensaje }
}

function EstadoDe($nombre) {
  $p = Get-Printer -Name $nombre -ErrorAction SilentlyContinue
  if (-not $p) { return $null }

  # DetectedErrorState dice POR QUE esta detenida: 3 poco papel,
  # 4 sin papel, 7 tapa abierta, 8 atascada, 9 apagada o desconectada.
  $detalle = 0
  try {
    $w = Get-CimInstance -ClassName Win32_Printer -Filter ("Name='" + $nombre.Replace("'", "''") + "'") -ErrorAction SilentlyContinue
    if ($w) { $detalle = [int]$w.DetectedErrorState }
  } catch { }

  @{
    nombre     = $p.Name
    # [string] a fuerza: sin el, ConvertTo-Json escupe el numero del
    # enum y del otro lado habria que traducirlo a mano.
    estado     = [string]$p.PrinterStatus
    enCola     = [int]$p.JobCount
    puerto     = [string]$p.PortName
    problema   = $detalle
  }
}

try {
  if ($Accion -eq "listar") {
    # El @() es obligatorio: con una sola impresora, ConvertTo-Json
    # devolveria un objeto suelto en vez de una lista de uno.
    $lista = @(Get-Printer | ForEach-Object { EstadoDe $_.Name })
    Responder @{ ok = $true; impresoras = $lista }
  }

  if ($Accion -eq "estado") {
    if (-not $Impresora) { Fallar 87 "No se dijo que impresora revisar." }
    $e = EstadoDe $Impresora
    if (-not $e) { Fallar 1801 ("Windows no tiene ninguna impresora que se llame '" + $Impresora + "'.") }
    $spooler = "desconocido"
    try { $spooler = [string](Get-Service -Name Spooler).Status } catch { }
    Responder @{ ok = $true; impresora = $e; spooler = $spooler }
  }

  # ---------- imprimir ----------
  if (-not $Impresora) { Fallar 87 "No se dijo a que impresora mandar." }
  if (-not (Test-Path $Archivo)) { Fallar 2 ("No encontre el archivo " + $Archivo) }

  $antes = EstadoDe $Impresora
  if (-not $antes) { Fallar 1801 ("Windows no tiene ninguna impresora que se llame '" + $Impresora + "'.") }

  # Se revisa ANTES de encolar. Si esta apagada o sin papel, el
  # trabajo se quedaria formado y el de la bodega, al no ver salir
  # nada, volveria a picarle: al prenderla saldrian todas juntas.
  if ($antes.estado -ne "Normal") {
    Fallar 3 ("La impresora esta en estado '" + $antes.estado + "'. Revisa que este prendida, con rollo y con la tapa cerrada.")
  }

  Add-Type -Namespace Venus -Name Crudo -MemberDefinition @"
[StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)]
public struct DOCINFO1 { public string pDocName; public string pOutputFile; public string pDatatype; }

[DllImport("winspool.drv", CharSet=CharSet.Unicode, SetLastError=true)]
public static extern bool OpenPrinter(string src, out IntPtr hPrinter, IntPtr pd);
[DllImport("winspool.drv", SetLastError=true)]
public static extern bool ClosePrinter(IntPtr hPrinter);
[DllImport("winspool.drv", CharSet=CharSet.Unicode, SetLastError=true)]
public static extern int StartDocPrinter(IntPtr hPrinter, int level, ref DOCINFO1 di);
[DllImport("winspool.drv", SetLastError=true)]
public static extern bool EndDocPrinter(IntPtr hPrinter);
[DllImport("winspool.drv", SetLastError=true)]
public static extern bool StartPagePrinter(IntPtr hPrinter);
[DllImport("winspool.drv", SetLastError=true)]
public static extern bool EndPagePrinter(IntPtr hPrinter);
[DllImport("winspool.drv", SetLastError=true)]
public static extern bool WritePrinter(IntPtr hPrinter, IntPtr pBytes, int dwCount, out int dwWritten);
"@

  $bytes = [System.IO.File]::ReadAllBytes($Archivo)
  $h = [IntPtr]::Zero
  $memoria = [IntPtr]::Zero
  $escritos = 0

  try {
    if (-not [Venus.Crudo]::OpenPrinter($Impresora, [ref]$h, [IntPtr]::Zero)) {
      Fallar ([Runtime.InteropServices.Marshal]::GetLastWin32Error()) "Windows no dejo abrir la impresora."
    }

    $doc = New-Object Venus.Crudo+DOCINFO1
    $doc.pDocName = $Trabajo
    $doc.pOutputFile = $null
    # RAW es todo el punto de este guion.
    $doc.pDatatype = "RAW"

    if ([Venus.Crudo]::StartDocPrinter($h, 1, [ref]$doc) -eq 0) {
      Fallar ([Runtime.InteropServices.Marshal]::GetLastWin32Error()) "Windows no dejo abrir el trabajo de impresion."
    }
    [void][Venus.Crudo]::StartPagePrinter($h)

    $memoria = [Runtime.InteropServices.Marshal]::AllocHGlobal($bytes.Length)
    [Runtime.InteropServices.Marshal]::Copy($bytes, 0, $memoria, $bytes.Length)
    if (-not [Venus.Crudo]::WritePrinter($h, $memoria, $bytes.Length, [ref]$escritos)) {
      Fallar ([Runtime.InteropServices.Marshal]::GetLastWin32Error()) "Windows no dejo mandar las etiquetas."
    }

    [void][Venus.Crudo]::EndPagePrinter($h)
    [void][Venus.Crudo]::EndDocPrinter($h)
  }
  finally {
    if ($memoria -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::FreeHGlobal($memoria) }
    if ($h -ne [IntPtr]::Zero) { [void][Venus.Crudo]::ClosePrinter($h) }
  }

  # Segundo chequeo, y no es de mas: con la impresora apagada las
  # cuatro llamadas de arriba devuelven exito igual. Lo unico que
  # delata que no salio nada es que el trabajo siga formado.
  Start-Sleep -Milliseconds $EsperaMs
  $despues = EstadoDe $Impresora

  Responder @{
    ok           = $true
    bytes        = $escritos
    estadoAntes  = $antes.estado
    estadoDespues = $despues.estado
    enCola       = $despues.enCola
    problema     = $despues.problema
  }
}
catch {
  Fallar 1 $_.Exception.Message
}
