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
    # [int] arredonda em PowerShell (0.5009 -> 1), e nao trunca: o piso e obrigatorio,
    # senao metade dos pixels e lida na linha de baixo e o fundo volta em partes.
    $x = $idx % $w; $y = [int][Math]::Floor($idx / $w)
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

function Crop-Square([string]$src, [string]$dst) {
  $img = [System.Drawing.Bitmap]::new($src)
  $w = $img.Width; $h = $img.Height
  $rect = [System.Drawing.Rectangle]::new(0, 0, $w, $h)
  $data = $img.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::ReadOnly, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $stride = $data.Stride
  $bytes = [byte[]]::new($stride * $h)
  [System.Runtime.InteropServices.Marshal]::Copy($data.Scan0, $bytes, 0, $bytes.Length)
  $img.UnlockBits($data)

  # A arte chega num artboard com fundo branco, entao o recorte usa "nao e branco"
  # em vez de alpha: independe do flood-fill e nao sofre com o arredondamento do cast.
  $minX = $w; $maxX = -1; $minY = $h; $maxY = -1
  for ($y = 0; $y -lt $h; $y++) {
    for ($x = 0; $x -lt $w; $x++) {
      $i = $y * $stride + $x * 4
      $b = [int]$bytes[$i]; $g = [int]$bytes[$i + 1]; $r = [int]$bytes[$i + 2]
      $min = [Math]::Min($b, [Math]::Min($g, $r))
      $max = [Math]::Max($b, [Math]::Max($g, $r))
      if (($max - $min) -gt 48 -or $min -lt 90) {
        if ($x -lt $minX) { $minX = $x }
        if ($x -gt $maxX) { $maxX = $x }
        if ($y -lt $minY) { $minY = $y }
        if ($y -gt $maxY) { $maxY = $y }
      }
    }
  }
  if ($maxX -lt $minX -or $maxY -lt $minY) { throw "nada desenhado em $src" }

  $side = [Math]::Max($maxX - $minX + 1, $maxY - $minY + 1)
  $cx = [int][Math]::Floor(($minX + $maxX) / 2)
  $cy = [int][Math]::Floor(($minY + $maxY) / 2)
  $sx = [Math]::Max(0, [Math]::Min($w - $side, $cx - [int][Math]::Floor($side / 2)))
  $sy = [Math]::Max(0, [Math]::Min($h - $side, $cy - [int][Math]::Floor($side / 2)))

  $crop = [System.Drawing.Rectangle]::new($sx, $sy, $side, $side)
  $out = [System.Drawing.Bitmap]::new($side, $side, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($out)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.DrawImage($img, [System.Drawing.Rectangle]::new(0, 0, $side, $side), $crop, [System.Drawing.GraphicsUnit]::Pixel)
  $g.Dispose()
  $out.Save($dst, [System.Drawing.Imaging.ImageFormat]::Png)
  $out.Dispose()
  $img.Dispose()
  Write-Host "recorte: $dst (${side}px, de ${w}x${h} em $sx,$sy)"
}

function New-IconBitmap([System.Drawing.Image]$srcImg, [int]$size, [double]$padRatio, [System.Drawing.Color]$bg = [System.Drawing.Color]::Transparent) {
  $bmp = [System.Drawing.Bitmap]::new($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.Clear($bg)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $pad = [int][Math]::Round($size * $padRatio)
  $g.DrawImage($srcImg, $pad, $pad, $size - 2 * $pad, $size - 2 * $pad)
  $g.Dispose()
  return $bmp
}

function Resize-Square([string]$src, [string]$dst, [int]$size, [double]$padRatio = 0.02) {
  $srcImg = [System.Drawing.Image]::FromFile($src)
  $bmp = New-IconBitmap $srcImg $size $padRatio
  $bmp.Save($dst, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
  $srcImg.Dispose()
  Write-Host "icone: $dst (${size}px)"
}

function Save-Ico([string]$src, [string]$dst, [int[]]$sizes) {
  $srcImg = [System.Drawing.Image]::FromFile($src)
  $images = @()
  $stream = [System.IO.MemoryStream]::new()
  foreach ($size in $sizes) {
    $bmp = New-IconBitmap $srcImg $size 0
    $ms = [System.IO.MemoryStream]::new()
    $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
    $images += , ([pscustomobject]@{ Size = $size; Data = $ms.ToArray() })
    $ms.Dispose()
    $bmp.Dispose()
  }
  $srcImg.Dispose()

  $count = $images.Count
  $writer = [System.IO.BinaryWriter]::new($stream)
  $writer.Write([uint16]0)
  $writer.Write([uint16]1)
  $writer.Write([uint16]$count)
  $offset = 6 + 16 * $count
  foreach ($img in $images) {
    $dim = if ($img.Size -ge 256) { [byte]0 } else { [byte]$img.Size }
    $writer.Write($dim)
    $writer.Write($dim)
    $writer.Write([byte]0)
    $writer.Write([byte]0)
    $writer.Write([uint16]1)
    $writer.Write([uint16]32)
    $writer.Write([uint32]$img.Data.Length)
    $writer.Write([uint32]$offset)
    $offset += $img.Data.Length
  }
  foreach ($img in $images) { $writer.Write($img.Data) }
  $writer.Flush()
  [System.IO.File]::WriteAllBytes($dst, $stream.ToArray())
  $writer.Dispose()
  $stream.Dispose()
  Write-Host "favicon: $dst ($($sizes -join ', ')px)"
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
Remove-Background "$root\public\marca\logo.png" "$root\public\marca\logo-sem-fundo.png"
Crop-Square "$root\public\marca\icone.png" "$root\public\marca\icone-quadrado.png"
Remove-Background "$root\public\marca\icone-quadrado.png" "$root\public\marca\icone-sem-fundo.png"
Resize-Square "$root\public\marca\icone-sem-fundo.png" "$root\public\icone-192.png" 192 0.02
Resize-Square "$root\public\marca\icone-sem-fundo.png" "$root\public\icone-512.png" 512 0.02
Resize-Square "$root\public\marca\icone-sem-fundo.png" "$root\public\apple-touch-icon.png" 180 0.02
Resize-Maskable "$root\public\marca\icone-sem-fundo.png" "$root\public\icone-maskable-512.png" 512
Save-Ico "$root\public\marca\icone-sem-fundo.png" "$root\src\app\favicon.ico" @(16, 32, 48)
Remove-Item "$root\public\marca\icone-quadrado.png" -Force
