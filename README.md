# TruthLens Chrome Extension

🔍 **Real-time content verification for Gen Z** - AI-powered credibility scores for news and social media.

## Overview

TruthLens is a privacy-first Chrome extension that provides instant credibility assessment for online content. Using Chrome's Built-in AI (Gemini Nano) and external fact-checking APIs, it helps users identify misinformation with visual indicators optimized for 8-second attention spans.

## Features

- ✅ **Real-time Analysis**: Instant credibility scores without leaving the page
- 🤖 **AI-Powered**: Local processing with Chrome's Gemini Nano
- 🔒 **Privacy-First**: No data collection, all processing happens locally
- 📱 **Social Media Support**: Works on Twitter, Facebook, TikTok, YouTube, and more
- 🎨 **Visual Indicators**: Color-coded trust scores with emoji indicators
- ⚡ **Fast & Lightweight**: Minimal performance impact
- 💎 **Freemium Model**: Basic features free, premium tier for advanced analysis

## Tech Stack

- **TypeScript** - Type-safe development
- **React 18** - Modern UI components
- **Webpack 5** - Module bundling
- **Chrome Manifest V3** - Latest extension platform
- **Chrome Built-in AI APIs** - Gemini Nano integration
- **SCSS** - Styled components

## Project Structure

```
truthlens/
├── src/
│   ├── background/     # Service worker (background script)
│   ├── content/        # Content scripts for page analysis
│   ├── popup/          # Extension popup UI (React)
│   ├── options/        # Settings page (React)
│   ├── shared/         # Shared types, utils, and constants
│   └── assets/         # Icons and styles
├── public/             # Static files (manifest.json)
├── tests/              # Test suites
├── scripts/            # Build and utility scripts
└── webpack/            # Webpack configurations
```

## Development Setup

### Prerequisites

- Node.js 18+ and npm 9+
- Chrome 138+ (for AI APIs)
- 22GB storage (for Gemini Nano)
- 4GB+ VRAM

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/truthlens.git
cd truthlens

# Install dependencies
npm install

# Start development with hot reload
npm run dev
```

### Chrome AI Setup

1. Enable Chrome AI flags:
   - Navigate to `chrome://flags`
   - Enable `#optimization-guide-on-device-model`
   - Enable `#prompt-api-for-gemini-nano`
   - Restart Chrome

2. Download Gemini Nano:
   - Go to `chrome://components`
   - Find "Optimization Guide On Device Model"
   - Click "Check for update"

### Load Extension

1. Build the extension:
   ```bash
   npm run build
   ```

2. Load in Chrome:
   - Open `chrome://extensions`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist` folder

## Available Scripts

- `npm run dev` - Start development with watch mode
- `npm run build` - Build for production
- `npm run test` - Run test suite
- `npm run lint` - Check code quality
- `npm run format` - Format code

## API Keys

For external fact-checking APIs, create a `.env` file:

```env
MBFC_API_KEY=your_media_bias_fact_check_key
GOOGLE_FACT_CHECK_API_KEY=your_google_api_key
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see LICENSE file for details

## Acknowledgments

- Chrome Built-in AI team for Gemini Nano integration
- Media Bias/Fact Check for credibility data
- The open-source community for amazing tools

---

Built with ❤️ for fighting misinformation
