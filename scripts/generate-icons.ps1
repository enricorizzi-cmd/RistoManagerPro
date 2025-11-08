Add-Type -AssemblyName System.Drawing

$logoPath = "logo_light.png"
$logo = [System.Drawing.Image]::FromFile((Resolve-Path $logoPath))

# Funzione per salvare immagine ridimensionata
function Resize-Image {
    param($width, $height, $outputPath)
    $bitmap = New-Object System.Drawing.Bitmap($width, $height)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $graphics.DrawImage($logo, 0, 0, $width, $height)
    $bitmap.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $graphics.Dispose()
    $bitmap.Dispose()
}

# Crea tutte le icone necessarie
Write-Host "Creazione icone..."
Resize-Image -width 16 -height 16 -outputPath "public/favicon-16x16.png"
Resize-Image -width 32 -height 32 -outputPath "public/favicon-32x32.png"
Resize-Image -width 180 -height 180 -outputPath "public/apple-touch-icon.png"
Resize-Image -width 192 -height 192 -outputPath "public/icon-192x192.png"
Resize-Image -width 512 -height 512 -outputPath "public/icon-512x512.png"
Resize-Image -width 192 -height 192 -outputPath "public/android-chrome-192x192.png"
Resize-Image -width 512 -height 512 -outputPath "public/android-chrome-512x512.png"

# Crea favicon.ico (32x32)
$icoBitmap = New-Object System.Drawing.Bitmap(32, 32)
$icoGraphics = [System.Drawing.Graphics]::FromImage($icoBitmap)
$icoGraphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$icoGraphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$icoGraphics.DrawImage($logo, 0, 0, 32, 32)
$icoBitmap.Save("public/favicon.ico", [System.Drawing.Imaging.ImageFormat]::Icon)
$icoGraphics.Dispose()
$icoBitmap.Dispose()

$logo.Dispose()
Write-Host "Tutte le icone sono state create con successo!"

