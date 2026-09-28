# Remove o fundo claro das imagens da marca (flood-fill a partir das bordas,
# para preservar os brancos DENTRO do selo: texto "Pede", anel branco).
# Depois gera os ícones do sistema (192/512/180) a partir do ícone sem fundo.
Add-Type -AssemblyName System.Drawing

function Remove-Background([string]$src, [string]$dst) {
  $img = [System.Drawing.Bitmap]::new($src)
  $w = $img.Width; $h = $img.Height
  $rect = [System.Drawing.Rectangle]::new(0, 0, $w, $h)
  $data = $img.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::ReadWrite, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $stride = $data.Stride
  $bytes = [byte[]]::new($stride * $h)
  [System.Runtime.InteropServices.Marshal]::Copy($data.Scan0, $bytes, 0, $bytes.Length)

  $total = $w * $h
  $visited = [bool[]]::new($total)
  $queue = New-Object System.Collections.Generic.Queue[int]

  # sementes: toda a borda da imagem
  for ($x = 0; $x -lt $w; $x++) { $queue.Enqueue($x); $queue.Enqueue($x + ($h - 1) * $w) }
  for ($y = 0; $y -lt $h; $y++) { $queue.Enqueue($y * $w); $queue.Enqueue(($w - 1) + $y * $w) }

  # Pertence ao fundo (e à sombra ao redor do selo) todo pixel DESSATURADO e
  # CLARO alcançável a partir da borda. As cores da marca (azul, amarelo) são
  # saturadas e param o flood-fill; os brancos do selo ("Pede", anel) ficam
  # ilhados dentro do círculo e por isso sobrevivem.
  while ($queue.Count -gt 0) {
    $idx = $queue.Dequeue()
    if ($visited[$idx]) { continue }
    $visited[$idx] = $true
    $x = $idx % $w; $y = [int]($idx / $w)
    $i = $y * $stride + $x * 4
    $b = [int]$bytes[$i]; $g = [int]$bytes[$i + 1]; $r = [int]$bytes[$i + 2]
    $min = [Math]::Min($b, [Math]::Min($g, $r))
    $max = [Math]::Max($b, [Math]::Max($g, $r))
    if (($max - $min) -gt 48 -or $min -lt 90) { continue }
    $bytes[$i + 3] = 0
    if ($x -gt 0) { $queue.Enqueue($idx - 1) }
    if ($x -lt ($w - 1)) { $queue.Enqueue($idx + 1) }
    if ($y -gt 0) { $queue.Enqueue($idx - $w) }
    if ($y -lt ($h - 1)) { $queue.Enqueue($idx + $w) }
  }

  [System.Runtime.InteropServices.Marshal]::Copy($bytes, 0, $data.Scan0, $bytes.Length)
  $img.UnlockBits($data)
  $img.Save($dst, [System.Drawing.Imaging.ImageFormat]::Png)
  $img.Dispose()
  Write-Host "sem fundo: $dst"
}

function Resize-Square([string]$src, [string]$dst, [int]$size) {
  $srcImg = [System.Drawing.Image]::FromFile($src)
  $bmp = [System.Drawing.Bitmap]::new($size, $size)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.Clear([System.Drawing.Color]::Transparent)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $g.DrawImage($srcImg, 0, 0, $size, $size)
  $g.Dispose()
  $bmp.Save($dst, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
  $srcImg.Dispose()
  Write-Host "icone: $dst (${size}px)"
}

# Maskable: launchers recortam o ícone, então fundo transparente viraria um
# blob. Esta variante vai cheia, sobre a cor da marca, com zona de segurança.
function Resize-Maskable([string]$src, [string]$dst, [int]$size) {
  $srcImg = [System.Drawing.Image]::FromFile($src)
  $bmp = [System.Drawing.Bitmap]::new($size, $size)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.Clear([System.Drawing.Color]::FromArgb(255, 0, 28, 124))
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $pad = [int]($size * 0.08)
  $g.DrawImage($srcImg, $pad, $pad, $size - 2 * $pad, $size - 2 * $pad)
  $g.Dispose()
  $bmp.Save($dst, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
  $srcImg.Dispose()
  Write-Host "maskable: $dst (${size}px)"
}

$root = Split-Path -Parent $PSScriptRoot
Remove-Background "$root\public\marca\logo.png"  "$root\public\marca\logo-sem-fundo.png"
Remove-Background "$root\public\marca\icone.png" "$root\public\marca\icone-sem-fundo.png"
Resize-Square "$root\public\marca\icone-sem-fundo.png" "$root\public\icone-192.png" 192
Resize-Square "$root\public\marca\icone-sem-fundo.png" "$root\public\icone-512.png" 512
Resize-Square "$root\public\marca\icone-sem-fundo.png" "$root\public\apple-touch-icon.png" 180
Resize-Maskable "$root\public\marca\icone-sem-fundo.png" "$root\public\icone-maskable-512.png" 512
