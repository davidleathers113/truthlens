#!/usr/bin/env node

/**
 * Release Notes Generator - 2025 Git Best Practices
 * Generates release notes from git commits using conventional commits
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Conventional commit types and their descriptions
const COMMIT_TYPES = {
  feat: { emoji: '✨', section: 'Features', description: 'New features' },
  fix: { emoji: '🐛', section: 'Bug Fixes', description: 'Bug fixes' },
  docs: { emoji: '📚', section: 'Documentation', description: 'Documentation changes' },
  style: { emoji: '💎', section: 'Styling', description: 'Code style changes' },
  refactor: { emoji: '🔨', section: 'Refactoring', description: 'Code refactoring' },
  perf: { emoji: '🚀', section: 'Performance', description: 'Performance improvements' },
  test: { emoji: '🧪', section: 'Testing', description: 'Test improvements' },
  chore: { emoji: '🔧', section: 'Maintenance', description: 'Maintenance tasks' },
  ci: { emoji: '👷', section: 'CI/CD', description: 'CI/CD improvements' },
  build: { emoji: '📦', section: 'Build', description: 'Build system changes' },
  revert: { emoji: '⏪', section: 'Reverts', description: 'Reverted changes' },
  security: { emoji: '🔒', section: 'Security', description: 'Security improvements' }
};

function parseCommitMessage(message) {
  // Parse conventional commit format: type(scope): description
  const conventionalRegex = /^(\w+)(?:\(([^)]+)\))?: (.+)$/;
  const match = message.match(conventionalRegex);
  
  if (match) {
    const [, type, scope, description] = match;
    return {
      type: type.toLowerCase(),
      scope: scope || null,
      description: description,
      isConventional: true,
      breaking: message.includes('BREAKING CHANGE') || message.includes('!')
    };
  }
  
  // Fallback for non-conventional commits
  return {
    type: 'other',
    scope: null,
    description: message,
    isConventional: false,
    breaking: false
  };
}

function getCommitsSinceLastTag() {
  try {
    // Get the last tag
    const lastTag = execSync('git describe --tags --abbrev=0', { encoding: 'utf8' }).trim();
    console.log(`📋 Generating release notes since tag: ${lastTag}`);
    
    // Get commits since last tag
    const commits = execSync(`git log ${lastTag}..HEAD --pretty=format:"%H|%s|%an|%ae|%ad" --date=short`, { encoding: 'utf8' })
      .split('\n')
      .filter(line => line.trim())
      .map(line => {
        const [hash, subject, author, email, date] = line.split('|');
        const parsed = parseCommitMessage(subject);
        
        return {
          hash: hash.substring(0, 8),
          fullHash: hash,
          subject,
          author,
          email,
          date,
          ...parsed
        };
      });
    
    return { commits, previousTag: lastTag };
    
  } catch (error) {
    console.log('📝 No previous tags found, including all commits');
    
    // Get all commits if no tags exist
    const commits = execSync('git log --pretty=format:"%H|%s|%an|%ae|%ad" --date=short', { encoding: 'utf8' })
      .split('\n')
      .filter(line => line.trim())
      .map(line => {
        const [hash, subject, author, email, date] = line.split('|');
        const parsed = parseCommitMessage(subject);
        
        return {
          hash: hash.substring(0, 8),
          fullHash: hash,
          subject,
          author,
          email,
          date,
          ...parsed
        };
      });
    
    return { commits, previousTag: null };
  }
}

function groupCommitsByType(commits) {
  const grouped = {};
  
  commits.forEach(commit => {
    const type = commit.type;
    if (!grouped[type]) {
      grouped[type] = [];
    }
    grouped[type].push(commit);
  });
  
  return grouped;
}

function generateMarkdownReleaseNotes(commits, previousTag, version) {
  const grouped = groupCommitsByType(commits);
  const breaking = commits.filter(c => c.breaking);
  
  let markdown = '';
  
  // Header
  markdown += `# Release Notes ${version}\n\n`;
  
  if (previousTag) {
    markdown += `**Full Changelog**: [${previousTag}...${version}](https://github.com/truthlens/truthlens/compare/${previousTag}...${version})\n\n`;
  }
  
  // Release summary
  const totalCommits = commits.length;
  const contributors = [...new Set(commits.map(c => c.author))];
  
  markdown += `## 📊 Release Summary\n\n`;
  markdown += `- **${totalCommits}** commits from **${contributors.length}** contributor${contributors.length !== 1 ? 's' : ''}\n`;
  markdown += `- Released on: ${new Date().toLocaleDateString()}\n\n`;
  
  // Breaking changes (if any)
  if (breaking.length > 0) {
    markdown += `## ⚠️ Breaking Changes\n\n`;
    breaking.forEach(commit => {
      markdown += `- **${commit.scope ? `${commit.scope}: ` : ''}${commit.description}** ([${commit.hash}](https://github.com/truthlens/truthlens/commit/${commit.fullHash}))\n`;
    });
    markdown += '\n';
  }
  
  // Group commits by type
  const orderedTypes = ['feat', 'fix', 'perf', 'security', 'docs', 'style', 'refactor', 'test', 'chore', 'ci', 'build'];
  
  orderedTypes.forEach(type => {
    if (grouped[type] && COMMIT_TYPES[type]) {
      const typeInfo = COMMIT_TYPES[type];
      markdown += `## ${typeInfo.emoji} ${typeInfo.section}\n\n`;
      
      grouped[type].forEach(commit => {
        const scope = commit.scope ? `**${commit.scope}**: ` : '';
        markdown += `- ${scope}${commit.description} ([${commit.hash}](https://github.com/truthlens/truthlens/commit/${commit.fullHash}))\n`;
      });
      markdown += '\n';
    }
  });
  
  // Other commits (non-conventional)
  if (grouped.other) {
    markdown += `## 🔄 Other Changes\n\n`;
    grouped.other.forEach(commit => {
      markdown += `- ${commit.description} ([${commit.hash}](https://github.com/truthlens/truthlens/commit/${commit.fullHash}))\n`;
    });
    markdown += '\n';
  }
  
  // Contributors
  if (contributors.length > 0) {
    markdown += `## 👥 Contributors\n\n`;
    markdown += `Thank you to all contributors who made this release possible:\n\n`;
    contributors.forEach(contributor => {
      markdown += `- @${contributor}\n`;
    });
    markdown += '\n';
  }
  
  // Installation instructions
  markdown += `## 📥 Installation\n\n`;
  markdown += `### Chrome Web Store\n`;
  markdown += `1. Visit the [TruthLens Chrome Web Store page](https://chrome.google.com/webstore/detail/truthlens)\n`;
  markdown += `2. Click "Add to Chrome"\n`;
  markdown += `3. Confirm the installation\n\n`;
  
  markdown += `### Manual Installation\n`;
  markdown += `1. Download the extension package from the [releases page](https://github.com/truthlens/truthlens/releases/tag/${version})\n`;
  markdown += `2. Extract the ZIP file\n`;
  markdown += `3. Open Chrome and navigate to \`chrome://extensions/\`\n`;
  markdown += `4. Enable "Developer mode"\n`;
  markdown += `5. Click "Load unpacked" and select the extracted folder\n\n`;
  
  // Support information
  markdown += `## 🆘 Support\n\n`;
  markdown += `- **Issues**: [GitHub Issues](https://github.com/truthlens/truthlens/issues)\n`;
  markdown += `- **Discussions**: [GitHub Discussions](https://github.com/truthlens/truthlens/discussions)\n`;
  markdown += `- **Email**: support@truthlens.ai\n\n`;
  
  return markdown;
}

function generateJSONReleaseNotes(commits, previousTag, version) {
  const grouped = groupCommitsByType(commits);
  const breaking = commits.filter(c => c.breaking);
  
  return {
    version,
    releaseDate: new Date().toISOString(),
    previousTag,
    summary: {
      totalCommits: commits.length,
      contributors: [...new Set(commits.map(c => c.author))],
      breakingChanges: breaking.length
    },
    changes: {
      breaking: breaking.map(c => ({
        type: c.type,
        scope: c.scope,
        description: c.description,
        commit: c.fullHash,
        author: c.author
      })),
      features: (grouped.feat || []).map(c => ({
        scope: c.scope,
        description: c.description,
        commit: c.fullHash,
        author: c.author
      })),
      fixes: (grouped.fix || []).map(c => ({
        scope: c.scope,
        description: c.description,
        commit: c.fullHash,
        author: c.author
      })),
      other: Object.entries(grouped)
        .filter(([type]) => !['feat', 'fix'].includes(type))
        .reduce((acc, [type, commits]) => {
          acc[type] = commits.map(c => ({
            scope: c.scope,
            description: c.description,
            commit: c.fullHash,
            author: c.author
          }));
          return acc;
        }, {})
    },
    commits: commits.map(c => ({
      hash: c.fullHash,
      shortHash: c.hash,
      message: c.subject,
      author: c.author,
      date: c.date,
      type: c.type,
      scope: c.scope,
      breaking: c.breaking
    }))
  };
}

function getCurrentVersion() {
  try {
    const packagePath = path.join(__dirname, '..', 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    return packageJson.version;
  } catch (error) {
    return process.env.BUILD_VERSION || '1.0.0';
  }
}

function generateReleaseNotes() {
  console.log('📝 Generating release notes...\n');
  
  try {
    const version = getCurrentVersion();
    const { commits, previousTag } = getCommitsSinceLastTag();
    
    if (commits.length === 0) {
      console.log('ℹ️  No commits found since last release');
      return;
    }
    
    console.log(`📊 Found ${commits.length} commits to include in release notes`);
    
    // Generate markdown release notes
    const markdownNotes = generateMarkdownReleaseNotes(commits, previousTag, version);
    console.log(markdownNotes);
    
    // Save release notes files
    const notesDir = path.join(__dirname, '..', 'release-notes');
    if (!fs.existsSync(notesDir)) {
      fs.mkdirSync(notesDir, { recursive: true });
    }
    
    // Save markdown version
    const markdownPath = path.join(notesDir, `v${version}.md`);
    fs.writeFileSync(markdownPath, markdownNotes);
    
    // Save JSON version
    const jsonNotes = generateJSONReleaseNotes(commits, previousTag, version);
    const jsonPath = path.join(notesDir, `v${version}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(jsonNotes, null, 2));
    
    console.log(`\n✅ Release notes generated successfully!`);
    console.log(`📄 Markdown: ${markdownPath}`);
    console.log(`📄 JSON: ${jsonPath}`);
    
  } catch (error) {
    console.error('❌ Failed to generate release notes:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  generateReleaseNotes();
}

module.exports = { generateReleaseNotes };