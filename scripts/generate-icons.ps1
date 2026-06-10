# ============================================================
# Génère les icônes PWA (PNG) : champignon stylisé sur fond
# vert forêt. Sorties dans public/.
# Usage : powershell -File scripts/generate-icons.ps1
# ============================================================

Add-Type -AssemblyName System.Drawing

$publicDir = Join-Path $PSScriptRoot "..\public"

function New-Icon {
    param([int]$Size, [double]$MotifScale, [string]$OutName)

    $bmp = New-Object System.Drawing.Bitmap($Size, $Size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias

    $bg     = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 26, 34, 21))   # #1a2215
    $cap    = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 224, 88, 47))  # #e0582f
    $spots  = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 253, 243, 227)) # #fdf3e3
    $stem   = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 243, 233, 210)) # #f3e9d2

    # Fond plein (full-bleed : iOS et maskable arrondissent eux-mêmes)
    $g.FillRectangle($bg, 0, 0, $Size, $Size)

    # Motif dessiné en espace 512, centré et mis à l'échelle
    $f = ($Size / 512.0) * $MotifScale
    $g.TranslateTransform($Size / 2.0, $Size / 2.0)
    $g.ScaleTransform($f, $f)
    $g.TranslateTransform(-256.0, -256.0)

    # Chapeau : demi-ellipse à fond plat
    $g.FillPie($cap, 76, 80, 360, 360, 180, 180)
    $g.FillRectangle($cap, 96, 248, 320, 18)

    # Pied : rectangle + base évasée
    $g.FillRectangle($stem, 206, 260, 100, 120)
    $g.FillEllipse($stem, 186, 340, 140, 72)

    # Points blancs du chapeau
    $g.FillEllipse($spots, 140, 140, 52, 40)
    $g.FillEllipse($spots, 240, 100, 46, 38)
    $g.FillEllipse($spots, 318, 162, 44, 34)
    $g.FillEllipse($spots, 182, 208, 34, 24)

    $g.Dispose()
    $out = Join-Path $publicDir $OutName
    $bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Output "OK $OutName ($Size x $Size)"
}

New-Icon -Size 192 -MotifScale 0.72 -OutName "pwa-192x192.png"
New-Icon -Size 512 -MotifScale 0.72 -OutName "pwa-512x512.png"
New-Icon -Size 512 -MotifScale 0.55 -OutName "pwa-maskable-512x512.png"
New-Icon -Size 180 -MotifScale 0.72 -OutName "apple-touch-icon.png"
