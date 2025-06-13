#!/usr/bin/env node

/**
 * Lexicon Update Pipeline
 * Manages discovery, review, and integration of new terms, slang, and emojis
 * Ensures TruthLens stays current with evolving internet language
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import { createHash } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface LexiconTerm {
  id: string;
  term: string;
  type: 'slang' | 'emoji' | 'hashtag' | 'abbreviation' | 'meme';
  definition: string;
  examples: string[];
  sentiment?: number; // -2 to +2
  category?: string;
  origin?: string;
  firstSeen: Date;
  lastUpdated: Date;
  status: 'pending' | 'approved' | 'rejected' | 'deprecated';
  approvedBy?: string;
  rejectionReason?: string;
  confidence: number; // 0-1
  sources: string[];
  relatedTerms?: string[];
  locale?: string;
  nsfw?: boolean;
  contexts?: string[]; // Where this term is commonly used
}

interface LexiconVersion {
  version: string;
  releaseDate: Date;
  terms: Map<string, LexiconTerm>;
  addedTerms: string[];
  removedTerms: string[];
  modifiedTerms: string[];
  changelog: string;
}

interface DiscoverySource {
  name: string;
  type: 'api' | 'scraper' | 'manual' | 'crowdsourced';
  url?: string;
  rateLimit?: number; // requests per minute
  lastChecked?: Date;
  enabled: boolean;
}

interface ReviewQueue {
  pending: LexiconTerm[];
  reviewed: LexiconTerm[];
  stats: {
    totalReviewed: number;
    approved: number;
    rejected: number;
    avgReviewTime: number; // in hours
  };
}

class LexiconUpdater {
  private currentVersion: LexiconVersion;
  private reviewQueue: ReviewQueue;
  private readonly dataDir: string;
  private readonly sources: Map<string, DiscoverySource>;

  constructor(dataDir: string = './lexicon-data') {
    this.dataDir = dataDir;
    this.ensureDirectoryStructure();
    this.currentVersion = this.loadCurrentVersion();
    this.reviewQueue = this.loadReviewQueue();
    this.sources = this.initializeSources();
  }

  /**
   * Initialize discovery sources
   */
  private initializeSources(): Map<string, DiscoverySource> {
    return new Map([
      ['urban-dictionary', {
        name: 'Urban Dictionary',
        type: 'api',
        url: 'https://api.urbandictionary.com/v0/define',
        rateLimit: 10,
        enabled: true
      }],
      ['twitter-trends', {
        name: 'Twitter Trends',
        type: 'api',
        url: 'https://api.twitter.com/2/trends',
        rateLimit: 15,
        enabled: false // Requires API key
      }],
      ['reddit-slang', {
        name: 'Reddit Popular',
        type: 'scraper',
        url: 'https://www.reddit.com/r/slang',
        rateLimit: 5,
        enabled: true
      }],
      ['emoji-tracker', {
        name: 'Emoji Tracker',
        type: 'api',
        url: 'https://emojitracker.com/api/v1/realtime',
        rateLimit: 30,
        enabled: true
      }],
      ['manual-submission', {
        name: 'Manual Submissions',
        type: 'manual',
        enabled: true
      }]
    ]);
  }

  /**
   * Main discovery process
   */
  async discoverNewTerms(): Promise<LexiconTerm[]> {
    console.log(chalk.blue.bold('\n🔍 Discovering new terms...\n'));
    const discoveredTerms: LexiconTerm[] = [];

    for (const [, source] of this.sources) {
      if (!source.enabled) continue;

      console.log(chalk.gray(`Checking ${source.name}...`));

      try {
        const terms = await this.discoverFromSource(source);
        const newTerms = terms.filter(term => !this.isKnownTerm(term));

        if (newTerms.length > 0) {
          console.log(chalk.green(`  ✓ Found ${newTerms.length} new terms`));
          discoveredTerms.push(...newTerms);
        } else {
          console.log(chalk.gray(`  - No new terms found`));
        }

        // Update last checked
        source.lastChecked = new Date();
      } catch (error) {
        console.log(chalk.red(`  ✗ Error: ${error instanceof Error ? error.message : String(error)}`));
      }

      // Rate limiting
      if (source.rateLimit) {
        await this.sleep(60000 / source.rateLimit);
      }
    }

    console.log(chalk.blue(`\nTotal new terms discovered: ${discoveredTerms.length}`));
    return discoveredTerms;
  }

  /**
   * Discover terms from a specific source
   */
  private async discoverFromSource(source: DiscoverySource): Promise<LexiconTerm[]> {
    switch (source.name) {
      case 'Urban Dictionary':
        return this.discoverFromUrbanDictionary();
      case 'Reddit Popular':
        return this.discoverFromReddit();
      case 'Emoji Tracker':
        return this.discoverTrendingEmojis();
      case 'Manual Submissions':
        return this.loadManualSubmissions();
      default:
        return [];
    }
  }

  /**
   * Discover terms from Urban Dictionary
   */
  private async discoverFromUrbanDictionary(): Promise<LexiconTerm[]> {
    // Simulated implementation - would need real API integration
    const mockTerms = [
      {
        term: 'bussin',
        definition: 'Really good, usually describing food',
        examples: ['This pizza is bussin!', 'That new restaurant is straight bussin']
      },
      {
        term: 'no cap',
        definition: 'No lie, for real',
        examples: ['That movie was amazing, no cap', 'No cap, I saw it myself']
      }
    ];

    return mockTerms.map(data => this.createTerm({
      term: data.term,
      type: 'slang',
      definition: data.definition,
      examples: data.examples,
      source: 'Urban Dictionary',
      confidence: 0.7
    }));
  }

  /**
   * Discover trending emojis
   */
  private async discoverTrendingEmojis(): Promise<LexiconTerm[]> {
    // Simulated - would track emoji usage patterns
    const trendingEmojis = [
      { emoji: '💀', meaning: 'dying of laughter', sentiment: 1.5 },
      { emoji: '🧢', meaning: 'cap/lie', sentiment: -0.5 },
      { emoji: '✨', meaning: 'sparkle/emphasis', sentiment: 0.8 }
    ];

    return trendingEmojis.map(data => this.createTerm({
      term: data.emoji,
      type: 'emoji',
      definition: data.meaning,
      examples: [`That's hilarious ${data.emoji}`, `You're ${data.emoji} (lying)`],
      source: 'Emoji Tracker',
      sentiment: data.sentiment,
      confidence: 0.8
    }));
  }

  /**
   * Discover from Reddit
   */
  private async discoverFromReddit(): Promise<LexiconTerm[]> {
    // Simulated - would scrape Reddit
    return [];
  }

  /**
   * Load manual submissions
   */
  private loadManualSubmissions(): LexiconTerm[] {
    const submissionsPath = path.join(this.dataDir, 'submissions.json');
    if (!fs.existsSync(submissionsPath)) return [];

    const submissions = JSON.parse(fs.readFileSync(submissionsPath, 'utf-8'));
    return submissions.map((sub: any) => this.createTerm({
      ...sub,
      source: 'Manual Submission',
      confidence: 0.5 // Lower confidence for unverified submissions
    }));
  }

  /**
   * Create a standardized term object
   */
  private createTerm(data: Partial<LexiconTerm> & { term: string; source: string }): LexiconTerm {
    const id = this.generateTermId(data.term);
    return {
      id,
      term: data.term,
      type: data.type || 'slang',
      definition: data.definition || '',
      examples: data.examples || [],
      sentiment: data.sentiment,
      category: data.category,
      origin: data.origin,
      firstSeen: new Date(),
      lastUpdated: new Date(),
      status: 'pending',
      confidence: data.confidence || 0.5,
      sources: [data.source],
      locale: data.locale || 'en',
      nsfw: data.nsfw || false,
      contexts: data.contexts || []
    };
  }

  /**
   * Review interface for human approval
   */
  async reviewTerms(): Promise<void> {
    console.log(chalk.blue.bold('\n📋 Term Review Interface\n'));

    const pending = this.reviewQueue.pending;
    if (pending.length === 0) {
      console.log(chalk.gray('No terms pending review\n'));
      return;
    }

    console.log(chalk.yellow(`${pending.length} terms pending review\n`));

    // In a real implementation, this would be a web interface
    // For now, we'll simulate the review process
    for (const term of pending) {
      console.log(chalk.bold(`\nTerm: ${term.term}`));
      console.log(`Type: ${term.type}`);
      console.log(`Definition: ${term.definition}`);
      console.log(`Examples:`);
      term.examples.forEach(ex => console.log(`  - ${ex}`));
      console.log(`Confidence: ${(term.confidence * 100).toFixed(0)}%`);
      console.log(`Sources: ${term.sources.join(', ')}`);

      if (term.sentiment !== undefined) {
        console.log(`Sentiment: ${term.sentiment > 0 ? '+' : ''}${term.sentiment}`);
      }

      if (term.nsfw) {
        console.log(chalk.red('⚠️  NSFW content'));
      }

      // Simulated decision
      const decision = this.simulateReviewDecision(term);

      if (decision.approved) {
        term.status = 'approved';
        term.approvedBy = 'automated-review'; // Would be actual reviewer
        console.log(chalk.green('✓ Approved'));
      } else {
        term.status = 'rejected';
        term.rejectionReason = decision.reason;
        console.log(chalk.red(`✗ Rejected: ${decision.reason}`));
      }

      this.reviewQueue.reviewed.push(term);
    }

    // Clear pending queue
    this.reviewQueue.pending = [];
    this.saveReviewQueue();
  }

  /**
   * Simulate review decision (in production, this would be human review)
   */
  private simulateReviewDecision(term: LexiconTerm): { approved: boolean; reason?: string } {
    // Auto-reject NSFW content for now
    if (term.nsfw) {
      return { approved: false, reason: 'NSFW content' };
    }

    // Auto-reject low confidence
    if (term.confidence < 0.3) {
      return { approved: false, reason: 'Low confidence score' };
    }

    // Auto-approve high confidence from trusted sources
    if (term.confidence > 0.7 && term.sources.includes('Urban Dictionary')) {
      return { approved: true };
    }

    // Random decision for demo
    return Math.random() > 0.3
      ? { approved: true }
      : { approved: false, reason: 'Does not meet quality standards' };
  }

  /**
   * Integrate approved terms into the lexicon
   */
  async integrateApprovedTerms(): Promise<void> {
    console.log(chalk.blue.bold('\n🔄 Integrating approved terms...\n'));

    // Reload data to ensure we have the latest changes
    this.currentVersion = this.loadCurrentVersion();
    this.reviewQueue = this.loadReviewQueue();

    const approved = this.reviewQueue.reviewed.filter(t => t.status === 'approved');
    if (approved.length === 0) {
      console.log(chalk.gray('No approved terms to integrate\n'));
      return;
    }

    const newVersion = this.createNewVersion();

    for (const term of approved) {
      // Check if this term already exists by matching the term text
      let existingTermId: string | null = null;
      for (const [id, existingTerm] of this.currentVersion.terms) {
        if (existingTerm.term === term.term) {
          existingTermId = id;
          break;
        }
      }

      if (existingTermId) {
        console.log(chalk.yellow(`⚠️  Updating existing term: ${term.term}`));
        newVersion.modifiedTerms.push(existingTermId);
        // Update the term but keep the original ID
        const updatedTerm = { ...term, id: existingTermId };
        newVersion.terms.set(existingTermId, updatedTerm);
      } else {
        console.log(chalk.green(`✓ Adding new term: ${term.term}`));
        newVersion.addedTerms.push(term.id);
        newVersion.terms.set(term.id, term);
      }
    }

    // Generate changelog
    newVersion.changelog = this.generateChangelog(newVersion);

    // Save new version
    this.saveVersion(newVersion);
    this.currentVersion = newVersion;

    // Clear the review queue after integration
    this.reviewQueue.reviewed = [];
    this.saveReviewQueue();

    // Export to formats used by utilities
    await this.exportToUtilities();

    console.log(chalk.green.bold(`\n✅ Integration complete! Version ${newVersion.version} created.`));
  }

  /**
   * Export lexicon to formats used by utilities
   */
  private async exportToUtilities(): Promise<void> {
    console.log(chalk.gray('\nExporting to utility formats...'));

    // Export emojis for emojiProcessor
    await this.exportEmojiSentiments();

    // Export clickbait terms
    await this.exportClickbaitTerms();

    // Export slang for engagement parser
    await this.exportSlangAbbreviations();

    console.log(chalk.green('✓ Exports complete'));
  }

  /**
   * Export emoji sentiments
   */
  private async exportEmojiSentiments(): Promise<void> {
    const emojis = Array.from(this.currentVersion.terms.values())
      .filter(t => t.type === 'emoji' && t.sentiment !== undefined);

    const sentimentMap: Record<string, { score: number; desc: string; category?: string }> = {};

    for (const emoji of emojis) {
      sentimentMap[emoji.term] = {
        score: emoji.sentiment!,
        desc: emoji.definition,
        category: emoji.category
      };
    }

    const outputPath = path.join(
      __dirname,
      '../src/shared/utils/data/emoji-sentiments-generated.json'
    );

    await fs.promises.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.promises.writeFile(
      outputPath,
      JSON.stringify(sentimentMap, null, 2),
      'utf-8'
    );
  }

  /**
   * Export clickbait terms
   */
  private async exportClickbaitTerms(): Promise<void> {
    const clickbaitTerms = Array.from(this.currentVersion.terms.values())
      .filter(t => t.category === 'clickbait' || t.contexts?.includes('clickbait'));

    const phrases = clickbaitTerms.map(t => t.term);

    const outputPath = path.join(
      __dirname,
      '../src/shared/utils/data/clickbait-phrases-generated.json'
    );

    await fs.promises.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.promises.writeFile(
      outputPath,
      JSON.stringify({ phrases, lastUpdated: new Date() }, null, 2),
      'utf-8'
    );
  }

  /**
   * Export slang abbreviations
   */
  private async exportSlangAbbreviations(): Promise<void> {
    const abbreviations = Array.from(this.currentVersion.terms.values())
      .filter(t => t.type === 'abbreviation' || t.type === 'slang');

    const slangMap: Record<string, string> = {};

    for (const term of abbreviations) {
      slangMap[term.term.toLowerCase()] = term.definition;
    }

    const outputPath = path.join(
      __dirname,
      '../src/shared/utils/data/slang-abbreviations-generated.json'
    );

    await fs.promises.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.promises.writeFile(
      outputPath,
      JSON.stringify(slangMap, null, 2),
      'utf-8'
    );
  }

  /**
   * Create a new version
   */
  private createNewVersion(): LexiconVersion {
    const [major, minor, patch] = this.currentVersion.version.split('.').map(Number);
    const newVersion = `${major}.${minor}.${patch + 1}`;

    return {
      version: newVersion,
      releaseDate: new Date(),
      terms: new Map(this.currentVersion.terms),
      addedTerms: [],
      removedTerms: [],
      modifiedTerms: [],
      changelog: ''
    };
  }

  /**
   * Generate changelog
   */
  private generateChangelog(version: LexiconVersion): string {
    const lines: string[] = [
      `# Lexicon Version ${version.version}`,
      `Released: ${version.releaseDate.toISOString()}`,
      '',
      '## Changes',
      ''
    ];

    if (version.addedTerms.length > 0) {
      lines.push(`### Added (${version.addedTerms.length} terms)`);
      version.addedTerms.forEach(id => {
        const term = version.terms.get(id);
        if (term) {
          lines.push(`- ${term.term}: ${term.definition}`);
        }
      });
      lines.push('');
    }

    if (version.modifiedTerms.length > 0) {
      lines.push(`### Modified (${version.modifiedTerms.length} terms)`);
      version.modifiedTerms.forEach(id => {
        const term = version.terms.get(id);
        if (term) {
          lines.push(`- ${term.term}: Updated definition/sentiment`);
        }
      });
      lines.push('');
    }

    if (version.removedTerms.length > 0) {
      lines.push(`### Removed (${version.removedTerms.length} terms)`);
      version.removedTerms.forEach(id => {
        lines.push(`- Term ID: ${id}`);
      });
    }

    return lines.join('\n');
  }

  /**
   * Generate stats report
   */
  generateStatsReport(): void {
    console.log(chalk.blue.bold('\n📊 Lexicon Statistics\n'));

    const terms = Array.from(this.currentVersion.terms.values());
    const byType = this.groupBy(terms, 'type');
    const byStatus = this.groupBy(terms, 'status');

    console.log(`Current Version: ${this.currentVersion.version}`);
    console.log(`Total Terms: ${terms.length}`);

    if (terms.length > 0) {
      console.log();
      console.log('By Type:');
      Object.entries(byType).forEach(([type, items]) => {
        console.log(`  ${type}: ${items.length}`);
      });

      console.log();
      console.log('By Status:');
      Object.entries(byStatus).forEach(([status, items]) => {
        console.log(`  ${status}: ${items.length}`);
      });

      // Sentiment distribution
      const withSentiment = terms.filter(t => t.sentiment !== undefined);
      if (withSentiment.length > 0) {
        console.log();
        const avgSentiment = withSentiment.reduce((sum, t) => sum + t.sentiment!, 0) / withSentiment.length;
        console.log('Sentiment Analysis:');
        console.log(`  Average: ${avgSentiment.toFixed(2)}`);
        console.log(`  Positive: ${withSentiment.filter(t => t.sentiment! > 0).length}`);
        console.log(`  Negative: ${withSentiment.filter(t => t.sentiment! < 0).length}`);
        console.log(`  Neutral: ${withSentiment.filter(t => t.sentiment === 0).length}`);
      }
    }
  }

  /**
   * Utility functions
   */

  private generateTermId(term: string): string {
    return createHash('sha256').update(term.toLowerCase()).digest('hex').substring(0, 8);
  }

  private isKnownTerm(term: LexiconTerm): boolean {
    return this.currentVersion.terms.has(term.id) ||
           Array.from(this.currentVersion.terms.values()).some(t =>
             t.term.toLowerCase() === term.term.toLowerCase()
           );
  }

  private groupBy<T>(items: T[], key: keyof T): Record<string, T[]> {
    return items.reduce((groups, item) => {
      const group = String(item[key]);
      groups[group] = groups[group] || [];
      groups[group].push(item);
      return groups;
    }, {} as Record<string, T[]>);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Persistence methods
   */

  private ensureDirectoryStructure(): void {
    const dirs = [
      this.dataDir,
      path.join(this.dataDir, 'versions'),
      path.join(this.dataDir, 'queue'),
      path.join(this.dataDir, 'exports')
    ];

    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  private loadCurrentVersion(): LexiconVersion {
    // Check for version file in data directory
    const versionFile = path.join(this.dataDir, 'current-version.json');

    if (fs.existsSync(versionFile)) {
      const data = JSON.parse(fs.readFileSync(versionFile, 'utf-8'));
      // Convert terms object back to Map
      data.terms = new Map(Object.entries(data.terms || {}));
      data.releaseDate = new Date(data.releaseDate);
      // Ensure all arrays exist
      data.addedTerms = data.addedTerms || [];
      data.removedTerms = data.removedTerms || [];
      data.modifiedTerms = data.modifiedTerms || [];
      return data;
    }

    // Initialize with empty version
    return {
      version: '1.0.0',
      releaseDate: new Date(),
      terms: new Map(),
      addedTerms: [],
      removedTerms: [],
      modifiedTerms: [],
      changelog: 'Initial version'
    };
  }

  private saveVersion(version: LexiconVersion): void {
    const versionData = {
      ...version,
      terms: Object.fromEntries(version.terms)
    };

    // Save as current version
    fs.writeFileSync(
      path.join(this.dataDir, 'current-version.json'),
      JSON.stringify(versionData, null, 2)
    );

    // Archive version
    fs.writeFileSync(
      path.join(this.dataDir, 'versions', `v${version.version}.json`),
      JSON.stringify(versionData, null, 2)
    );
  }

  private loadReviewQueue(): ReviewQueue {
    const queueFile = path.join(this.dataDir, 'queue', 'review-queue.json');

    if (fs.existsSync(queueFile)) {
      return JSON.parse(fs.readFileSync(queueFile, 'utf-8'));
    }

    return {
      pending: [],
      reviewed: [],
      stats: {
        totalReviewed: 0,
        approved: 0,
        rejected: 0,
        avgReviewTime: 0
      }
    };
  }

  private saveReviewQueue(): void {
    fs.writeFileSync(
      path.join(this.dataDir, 'queue', 'review-queue.json'),
      JSON.stringify(this.reviewQueue, null, 2)
    );
  }

  /**
   * Add discovered terms to review queue
   */
  async addToReviewQueue(terms: LexiconTerm[]): Promise<void> {
    this.reviewQueue.pending.push(...terms);
    this.saveReviewQueue();
    console.log(chalk.green(`\n✓ Added ${terms.length} terms to review queue`));
  }

  /**
   * Manual term submission
   */
  async submitTerm(termData: Partial<LexiconTerm> & { term: string }): Promise<void> {
    const term = this.createTerm({
      ...termData,
      source: 'Manual Submission'
    });

    await this.addToReviewQueue([term]);
    console.log(chalk.green(`\n✓ Term "${term.term}" submitted for review`));
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  const updater = new LexiconUpdater();

  try {
    switch (command) {
      case 'discover':
        const newTerms = await updater.discoverNewTerms();
        if (newTerms.length > 0) {
          await updater.addToReviewQueue(newTerms);
        }
        break;

      case 'review':
        await updater.reviewTerms();
        break;

      case 'integrate':
        await updater.integrateApprovedTerms();
        break;

      case 'stats':
        updater.generateStatsReport();
        break;

      case 'submit':
        // Example: npm run lexicon-updater submit "bussin" "Really good"
        if (args.length >= 3) {
          await updater.submitTerm({
            term: args[1],
            definition: args[2],
            type: 'slang'
          });
        } else {
          console.log(chalk.red('Usage: submit <term> <definition>'));
        }
        break;

      case 'pipeline':
        // Run full pipeline
        console.log(chalk.blue.bold('🔄 Running full lexicon update pipeline...\n'));
        const discovered = await updater.discoverNewTerms();
        if (discovered.length > 0) {
          await updater.addToReviewQueue(discovered);
          await updater.reviewTerms();
          await updater.integrateApprovedTerms();
        }
        updater.generateStatsReport();
        break;

      case 'help':
      default:
        printHelp();
    }
  } catch (error) {
    console.error(chalk.red('Error:'), error);
    process.exit(1);
  }
}

function printHelp() {
  console.log(chalk.blue.bold('\nLexicon Update Pipeline\n'));
  console.log('Usage: npm run lexicon-updater [command] [options]\n');
  console.log('Commands:');
  console.log('  discover     Discover new terms from sources');
  console.log('  review       Review pending terms');
  console.log('  integrate    Integrate approved terms');
  console.log('  stats        Show lexicon statistics');
  console.log('  submit       Submit a term manually');
  console.log('  pipeline     Run full update pipeline');
  console.log('  help         Show this help message\n');
  console.log('Examples:');
  console.log('  npm run lexicon-updater discover');
  console.log('  npm run lexicon-updater review');
  console.log('  npm run lexicon-updater submit "no cap" "not lying"');
  console.log('  npm run lexicon-updater pipeline\n');
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { LexiconUpdater, LexiconTerm, LexiconVersion };
