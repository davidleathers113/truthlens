# Icon Conversion Instructions for Chrome Web Store

## Current Status
✅ SVG master icon created: `icon.svg`
✅ Conversion script created: `convert-icons.sh`
⏳ PNG files need to be generated

## Required PNG Files for Chrome Web Store
- `icon-16.png` - 16×16 pixels (toolbar icon)
- `icon-32.png` - 32×32 pixels (detailed views)
- `icon-48.png` - 48×48 pixels (extension management)
- `icon-128.png` - 128×128 pixels (Chrome Web Store listing)

## Conversion Options (Choose One)

### Option 1: Install ImageMagick (Recommended)
```bash
# Install ImageMagick
brew install imagemagick

# Run conversion script
./convert-icons.sh
```

### Option 2: Online Conversion (Quick & Easy)
1. Go to https://cloudconvert.com/svg-to-png
2. Upload `icon.svg`
3. Convert to PNG at each required size:
   - 16×16, 32×32, 48×48, 128×128
4. Download and rename files as specified above

### Option 3: Design Tools
- **Figma**: Import SVG, export as PNG at different sizes
- **Canva**: Use their SVG to PNG converter
- **Adobe Illustrator**: Export for screens at multiple sizes

## Verification Checklist
After creating PNG files:
- [ ] All 4 PNG files created (16, 32, 48, 128)
- [ ] Icons look crisp at all sizes
- [ ] Transparent background maintained
- [ ] Colors appear correct
- [ ] Details visible at 16×16 size
- [ ] Files under 1MB each

## Next Steps After Icon Creation
1. Test icons in Chrome extension locally
2. Verify manifest.json references are correct
3. Continue with screenshot creation for store listing
4. Prepare store description and metadata

## Quick Test Command
```bash
# Verify all required files exist
ls -la icon-*.png
```

Expected output:
```
icon-16.png
icon-32.png
icon-48.png
icon-128.png
```
