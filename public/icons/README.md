# TruthLens Icon Set

## Design Concept
The TruthLens icon combines trust, analysis, and verification elements:
- **Shield**: Represents protection and trustworthiness
- **Magnifying Glass**: Symbolizes fact-checking and analysis
- **Checkmark**: Indicates verification and truth
- **Color Dots**: Green/yellow/red credibility indicators
- **Blue Gradient**: Professional, trustworthy color scheme

## Chrome Web Store Requirements
Chrome extensions require PNG icons in these sizes:
- 16x16px - Toolbar icon
- 32x32px - Windows and detailed views
- 48x48px - Extension management page
- 128x128px - Chrome Web Store listing

## Converting SVG to PNG

### Using ImageMagick (recommended):
```bash
# Install ImageMagick if not already installed
brew install imagemagick

# Convert to required sizes
magick icon.svg -resize 16x16 icon-16.png
magick icon.svg -resize 32x32 icon-32.png
magick icon.svg -resize 48x48 icon-48.png
magick icon.svg -resize 128x128 icon-128.png
```

### Using Inkscape:
```bash
# Install Inkscape if not already installed
brew install inkscape

# Convert to required sizes
inkscape icon.svg -w 16 -h 16 -o icon-16.png
inkscape icon.svg -w 32 -h 32 -o icon-32.png
inkscape icon.svg -w 48 -h 48 -o icon-48.png
inkscape icon.svg -w 128 -h 128 -o icon-128.png
```

### Online Conversion:
If command-line tools aren't available, use online SVG to PNG converters like:
- https://cloudconvert.com/svg-to-png
- https://convertio.co/svg-png/

## Design Guidelines Followed
- ✅ Square format for consistent Chrome UI
- ✅ High contrast for visibility
- ✅ Transparent background
- ✅ Scalable design (works at all sizes)
- ✅ Professional, trustworthy appearance
- ✅ Simple enough for 16x16 recognition
- ✅ Brand colors consistent with extension theme

## Brand Colors
- Primary Blue: #3B82F6
- Dark Blue: #1E40AF
- Success Green: #10B981
- Warning Yellow: #F59E0B
- Error Red: #EF4444
- White: #FFFFFF
