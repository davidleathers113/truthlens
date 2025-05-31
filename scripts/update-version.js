#!/usr/bin/env node

/**
 * Version Update Script - 2025 Chrome Extension Best Practices
 * Updates version in manifest.json and package.json with semantic versioning
 */

const fs = require('fs');
const path = require('path');

function updateVersion(newVersion) {
  if (!newVersion) {
    console.error('❌ Version is required. Usage: node update-version.js <version>');
    process.exit(1);
  }

  // Validate semantic versioning format
  const semverRegex = /^(\d+)\.(\d+)\.(\d+)(?:-([a-zA-Z0-9\-\.]+))?(?:\+([a-zA-Z0-9\-\.]+))?$/;
  if (!semverRegex.test(newVersion)) {
    console.error(`❌ Invalid version format: ${newVersion}. Expected semantic versioning (e.g., 1.2.3)`);
    process.exit(1);
  }

  console.log(`🔄 Updating version to ${newVersion}...`);

  // Update package.json
  const packagePath = path.join(__dirname, '..', 'package.json');
  try {
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    const oldVersion = packageJson.version;
    
    packageJson.version = newVersion;
    fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n');
    
    console.log(`✅ Updated package.json: ${oldVersion} → ${newVersion}`);
  } catch (error) {
    console.error('❌ Failed to update package.json:', error.message);
    process.exit(1);
  }

  // Update manifest.json
  const manifestPath = path.join(__dirname, '..', 'public', 'manifest.json');
  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const oldVersion = manifest.version;
    
    // Chrome Web Store requires version format without pre-release identifiers
    const chromeVersion = newVersion.split('-')[0]; // Remove -dev, -beta, etc.
    manifest.version = chromeVersion;
    
    // Update version_name for display purposes (can include pre-release info)
    manifest.version_name = newVersion;
    
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
    
    console.log(`✅ Updated manifest.json: ${oldVersion} → ${chromeVersion} (display: ${newVersion})`);
  } catch (error) {
    console.error('❌ Failed to update manifest.json:', error.message);
    process.exit(1);
  }

  // Update version in build artifacts
  updateBuildVersion(newVersion);
  
  // Generate version info file
  generateVersionInfo(newVersion);

  console.log(`🎉 Version update completed successfully!`);
}

function updateBuildVersion(version) {
  const versionInfoPath = path.join(__dirname, '..', 'src', 'shared', 'constants', 'version.ts');
  
  const versionFileContent = `// Auto-generated version information
// Last updated: ${new Date().toISOString()}

export const VERSION_INFO = {
  version: '${version}',
  buildTime: '${new Date().toISOString()}',
  commit: '${process.env.GITHUB_SHA || 'local'}',
  branch: '${process.env.GITHUB_REF_NAME || 'local'}',
  isProduction: ${process.env.NODE_ENV === 'production'},
  buildNumber: '${process.env.GITHUB_RUN_NUMBER || '0'}'
} as const;

export const { version } = VERSION_INFO;
`;

  try {
    fs.writeFileSync(versionInfoPath, versionFileContent);
    console.log(`✅ Updated version constants file`);
  } catch (error) {
    console.log('⚠️  Could not update version constants:', error.message);
  }
}

function generateVersionInfo(version) {
  const versionInfo = {
    version,
    timestamp: new Date().toISOString(),
    commit: process.env.GITHUB_SHA || 'local',
    branch: process.env.GITHUB_REF_NAME || 'local',
    buildNumber: process.env.GITHUB_RUN_NUMBER || '0',
    environment: process.env.NODE_ENV || 'development'
  };

  const versionInfoPath = path.join(__dirname, '..', 'dist', 'version.json');
  
  try {
    // Ensure dist directory exists
    const distDir = path.dirname(versionInfoPath);
    if (!fs.existsSync(distDir)) {
      fs.mkdirSync(distDir, { recursive: true });
    }
    
    fs.writeFileSync(versionInfoPath, JSON.stringify(versionInfo, null, 2));
    console.log(`✅ Generated version info file`);
  } catch (error) {
    console.log('⚠️  Could not generate version info file:', error.message);
  }
}

// Version validation and suggestions
function validateVersionBump(currentVersion, newVersion) {
  if (!currentVersion) return true;
  
  const parseVersion = (v) => {
    const [, major, minor, patch] = v.match(/^(\d+)\.(\d+)\.(\d+)/) || [];
    return { major: parseInt(major), minor: parseInt(minor), patch: parseInt(patch) };
  };
  
  const current = parseVersion(currentVersion);
  const next = parseVersion(newVersion);
  
  if (!current || !next) return true;
  
  // Check for valid version bump
  const majorBump = next.major > current.major;
  const minorBump = next.major === current.major && next.minor > current.minor;
  const patchBump = next.major === current.major && next.minor === current.minor && next.patch > current.patch;
  
  if (!majorBump && !minorBump && !patchBump) {
    console.log('⚠️  Warning: Version does not appear to be a proper semantic version bump');
    
    // Suggest next versions
    console.log('💡 Suggested versions:');
    console.log(`   Patch: ${current.major}.${current.minor}.${current.patch + 1} (bug fixes)`);
    console.log(`   Minor: ${current.major}.${current.minor + 1}.0 (new features)`);
    console.log(`   Major: ${current.major + 1}.0.0 (breaking changes)`);
  }
  
  return true;
}

// Check current version and validate bump
function getCurrentVersion() {
  try {
    const packagePath = path.join(__dirname, '..', 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    return packageJson.version;
  } catch (error) {
    return null;
  }
}

if (require.main === module) {
  const newVersion = process.argv[2];
  const currentVersion = getCurrentVersion();
  
  if (currentVersion) {
    console.log(`📋 Current version: ${currentVersion}`);
    validateVersionBump(currentVersion, newVersion);
  }
  
  updateVersion(newVersion);
}

module.exports = { updateVersion, getCurrentVersion };