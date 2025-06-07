#!/bin/bash

# Chrome Web Store Icon Conversion Script
# Converts SVG to PNG in required sizes for Chrome extension submission

echo "🎨 Converting TruthLens icons for Chrome Web Store..."

# Check if ImageMagick is available
if command -v magick >/dev/null 2>&1; then
    echo "✅ ImageMagick found (magick command)"
    CONVERTER="magick"
elif command -v convert >/dev/null 2>&1; then
    echo "✅ ImageMagick found (convert command)"
    CONVERTER="convert"
else
    echo "❌ ImageMagick not found. Please install it:"
    echo "   macOS: brew install imagemagick"
    echo "   Ubuntu: sudo apt-get install imagemagick"
    echo "   Or use online converter: https://cloudconvert.com/svg-to-png"
    exit 1
fi

# Convert SVG to PNG in required sizes
sizes=(16 32 48 128)

for size in "${sizes[@]}"; do
    if [ "$CONVERTER" = "magick" ]; then
        magick icon.svg -resize ${size}x${size} icon-${size}.png
    else
        convert icon.svg -resize ${size}x${size} icon-${size}.png
    fi

    if [ -f "icon-${size}.png" ]; then
        echo "✅ Created icon-${size}.png"
    else
        echo "❌ Failed to create icon-${size}.png"
    fi
done

echo "🎉 Icon conversion complete!"
echo "📁 Files created:"
ls -la *.png 2>/dev/null || echo "No PNG files found"

echo ""
echo "📋 Next steps:"
echo "1. Verify icons look good at all sizes"
echo "2. Test icons in Chrome extension"
echo "3. Update manifest.json if needed"
