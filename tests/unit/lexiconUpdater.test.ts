/**
 * Unit tests for Lexicon Update Pipeline
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { LexiconUpdater, LexiconTerm } from '../../scripts/lexicon-updater';

describe('Lexicon Updater', () => {
  let tempDir: string;
  let updater: LexiconUpdater;

  beforeEach(() => {
    // Create temp directory
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lexicon-test-'));
    updater = new LexiconUpdater(tempDir);
  });

  afterEach(() => {
    // Clean up temp directory
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('Term Creation', () => {
    it('should create a valid term object', async () => {
      await updater.submitTerm({
        term: 'bussin',
        definition: 'Really good, usually describing food',
        type: 'slang'
      });

      const queuePath = path.join(tempDir, 'queue', 'review-queue.json');
      const queue = JSON.parse(fs.readFileSync(queuePath, 'utf-8'));

      expect(queue.pending).toHaveLength(1);
      const term = queue.pending[0];

      expect(term.term).toBe('bussin');
      expect(term.definition).toBe('Really good, usually describing food');
      expect(term.type).toBe('slang');
      expect(term.status).toBe('pending');
      expect(term.sources).toContain('Manual Submission');
      expect(term.id).toBeDefined();
      expect(term.firstSeen).toBeDefined();
    });

    it('should generate consistent IDs for same term', async () => {
      await updater.submitTerm({ term: 'test' });
      await updater.submitTerm({ term: 'test' });

      const queuePath = path.join(tempDir, 'queue', 'review-queue.json');
      const queue = JSON.parse(fs.readFileSync(queuePath, 'utf-8'));

      expect(queue.pending[0].id).toBe(queue.pending[1].id);
    });

    it('should handle emoji terms', async () => {
      await updater.submitTerm({
        term: '💀',
        definition: 'dying of laughter',
        type: 'emoji',
        sentiment: 1.5
      });

      const queuePath = path.join(tempDir, 'queue', 'review-queue.json');
      const queue = JSON.parse(fs.readFileSync(queuePath, 'utf-8'));
      const term = queue.pending[0];

      expect(term.type).toBe('emoji');
      expect(term.sentiment).toBe(1.5);
    });
  });

  describe('Review Process', () => {
    it('should handle term approval', async () => {
      // Submit a high-confidence term
      await updater.submitTerm({
        term: 'valid-term',
        definition: 'A valid term',
        confidence: 0.8
      });

      // Mock the review process
      const queuePath = path.join(tempDir, 'queue', 'review-queue.json');
      let queue = JSON.parse(fs.readFileSync(queuePath, 'utf-8'));
      queue.pending[0].confidence = 0.8; // Ensure high confidence
      fs.writeFileSync(queuePath, JSON.stringify(queue));

      await updater.reviewTerms();

      queue = JSON.parse(fs.readFileSync(queuePath, 'utf-8'));
      expect(queue.pending).toHaveLength(0);
      expect(queue.reviewed).toHaveLength(1);

      const reviewed = queue.reviewed[0];
      expect(['approved', 'rejected']).toContain(reviewed.status);
    });

    it('should auto-reject NSFW content', async () => {
      await updater.submitTerm({
        term: 'nsfw-term',
        definition: 'inappropriate content',
        nsfw: true
      });

      await updater.reviewTerms();

      const queuePath = path.join(tempDir, 'queue', 'review-queue.json');
      const queue = JSON.parse(fs.readFileSync(queuePath, 'utf-8'));
      const reviewed = queue.reviewed[0];

      expect(reviewed.status).toBe('rejected');
      expect(reviewed.rejectionReason).toBe('NSFW content');
    });

    it('should auto-reject low confidence terms', async () => {
      await updater.submitTerm({
        term: 'low-confidence',
        definition: 'uncertain',
        confidence: 0.2
      });

      const queuePath = path.join(tempDir, 'queue', 'review-queue.json');
      let queue = JSON.parse(fs.readFileSync(queuePath, 'utf-8'));
      queue.pending[0].confidence = 0.2; // Force low confidence
      fs.writeFileSync(queuePath, JSON.stringify(queue));

      await updater.reviewTerms();

      queue = JSON.parse(fs.readFileSync(queuePath, 'utf-8'));
      const reviewed = queue.reviewed[0];

      expect(reviewed.status).toBe('rejected');
      expect(reviewed.rejectionReason).toBe('Low confidence score');
    });
  });

  describe('Version Management', () => {
    it('should create new version on integration', async () => {
      // Submit and approve a term
      await updater.submitTerm({
        term: 'new-term',
        definition: 'A new term'
      });

      // Force approval
      const queuePath = path.join(tempDir, 'queue', 'review-queue.json');
      let queue = JSON.parse(fs.readFileSync(queuePath, 'utf-8'));
      queue.pending[0].status = 'approved';
      queue.reviewed = [queue.pending[0]];
      queue.pending = [];
      fs.writeFileSync(queuePath, JSON.stringify(queue));

      await updater.integrateApprovedTerms();

      const versionPath = path.join(tempDir, 'current-version.json');
      const version = JSON.parse(fs.readFileSync(versionPath, 'utf-8'));

      expect(version.version).toBe('1.0.1'); // Incremented from 1.0.0
      expect(version.addedTerms).toContain(queue.reviewed[0].id);
      expect(version.changelog).toContain('new-term');
    });

    it('should track modified terms', async () => {
      // Create initial version with a term
      const existingTerm: LexiconTerm = {
        id: 'test123',
        term: 'existing',
        definition: 'old definition',
        type: 'slang',
        status: 'approved',
        confidence: 0.8,
        sources: ['test'],
        examples: [],
        firstSeen: new Date(),
        lastUpdated: new Date()
      };

      const versionPath = path.join(tempDir, 'current-version.json');
      const initialVersion = {
        version: '1.0.0',
        releaseDate: new Date(),
        terms: { [existingTerm.id]: existingTerm },
        addedTerms: [],
        removedTerms: [],
        modifiedTerms: [],
        changelog: ''
      };
      fs.writeFileSync(versionPath, JSON.stringify(initialVersion));

      // Submit update to existing term
      await updater.submitTerm({
        term: 'existing',
        definition: 'new definition'
      });

      // Approve and integrate
      const queuePath = path.join(tempDir, 'queue', 'review-queue.json');
      let queue = JSON.parse(fs.readFileSync(queuePath, 'utf-8'));
      queue.pending[0].status = 'approved';
      queue.reviewed = [queue.pending[0]];
      queue.pending = [];
      fs.writeFileSync(queuePath, JSON.stringify(queue));

      await updater.integrateApprovedTerms();

      const updatedVersion = JSON.parse(fs.readFileSync(versionPath, 'utf-8'));
      expect(updatedVersion.modifiedTerms).toContain(existingTerm.id);
    });
  });

  describe('Export Functionality', () => {
    it('should export emoji sentiments', async () => {
      // Add emoji terms
      await updater.submitTerm({
        term: '😊',
        type: 'emoji',
        definition: 'smiling',
        sentiment: 0.7,
        category: 'happy'
      });

      await updater.submitTerm({
        term: '😢',
        type: 'emoji',
        definition: 'crying',
        sentiment: -0.8,
        category: 'sad'
      });

      // Approve all
      const queuePath = path.join(tempDir, 'queue', 'review-queue.json');
      let queue = JSON.parse(fs.readFileSync(queuePath, 'utf-8'));
      queue.reviewed = queue.pending.map((t: any) => ({ ...t, status: 'approved' }));
      queue.pending = [];
      fs.writeFileSync(queuePath, JSON.stringify(queue));

      await updater.integrateApprovedTerms();

      const exportPath = path.join(tempDir, '../src/shared/utils/data/emoji-sentiments-generated.json');
      if (fs.existsSync(exportPath)) {
        const sentiments = JSON.parse(fs.readFileSync(exportPath, 'utf-8'));
        expect(sentiments['😊']).toEqual({
          score: 0.7,
          desc: 'smiling',
          category: 'happy'
        });
      }
    });

    it('should export clickbait phrases', async () => {
      await updater.submitTerm({
        term: 'you won\'t believe',
        definition: 'clickbait phrase',
        category: 'clickbait'
      });

      // Approve and integrate
      const queuePath = path.join(tempDir, 'queue', 'review-queue.json');
      let queue = JSON.parse(fs.readFileSync(queuePath, 'utf-8'));
      queue.reviewed = queue.pending.map((t: any) => ({ ...t, status: 'approved' }));
      queue.pending = [];
      fs.writeFileSync(queuePath, JSON.stringify(queue));

      await updater.integrateApprovedTerms();

      const exportPath = path.join(tempDir, '../src/shared/utils/data/clickbait-phrases-generated.json');
      if (fs.existsSync(exportPath)) {
        const data = JSON.parse(fs.readFileSync(exportPath, 'utf-8'));
        expect(data.phrases).toContain('you won\'t believe');
      }
    });

    it('should export slang abbreviations', async () => {
      await updater.submitTerm({
        term: 'fr',
        definition: 'for real',
        type: 'abbreviation'
      });

      await updater.submitTerm({
        term: 'ngl',
        definition: 'not gonna lie',
        type: 'slang'
      });

      // Approve and integrate
      const queuePath = path.join(tempDir, 'queue', 'review-queue.json');
      let queue = JSON.parse(fs.readFileSync(queuePath, 'utf-8'));
      queue.reviewed = queue.pending.map((t: any) => ({ ...t, status: 'approved' }));
      queue.pending = [];
      fs.writeFileSync(queuePath, JSON.stringify(queue));

      await updater.integrateApprovedTerms();

      const exportPath = path.join(tempDir, '../src/shared/utils/data/slang-abbreviations-generated.json');
      if (fs.existsSync(exportPath)) {
        const slang = JSON.parse(fs.readFileSync(exportPath, 'utf-8'));
        expect(slang.fr).toBe('for real');
        expect(slang.ngl).toBe('not gonna lie');
      }
    });
  });

  describe('Statistics', () => {
    it('should generate accurate stats', async () => {
      // Add various terms
      const terms = [
        { term: 'slang1', type: 'slang', status: 'approved' },
        { term: 'slang2', type: 'slang', status: 'pending' },
        { term: '😊', type: 'emoji', status: 'approved', sentiment: 0.7 },
        { term: '😢', type: 'emoji', status: 'approved', sentiment: -0.8 },
        { term: 'abbr1', type: 'abbreviation', status: 'rejected' }
      ];

      // Create version with these terms
      const versionPath = path.join(tempDir, 'current-version.json');
      const termsMap: Record<string, any> = {};
      terms.forEach((t, i) => {
        termsMap[`id${i}`] = {
          ...t,
          id: `id${i}`,
          definition: `Definition for ${t.term}`,
          confidence: 0.5,
          sources: ['test'],
          examples: [],
          firstSeen: new Date(),
          lastUpdated: new Date()
        };
      });

      const version = {
        version: '1.0.0',
        releaseDate: new Date(),
        terms: termsMap,
        addedTerms: [],
        removedTerms: [],
        modifiedTerms: [],
        changelog: ''
      };
      fs.writeFileSync(versionPath, JSON.stringify(version));

      // Reinitialize updater to load the version
      updater = new LexiconUpdater(tempDir);

      // Capture stats output
      const originalLog = console.log;
      const output: string[] = [];
      console.log = (msg: string) => output.push(msg);

      updater.generateStatsReport();

      console.log = originalLog;

      const statsOutput = output.join('\n');
      expect(statsOutput).toContain('Total Terms: 5');
      expect(statsOutput).toContain('slang: 2');
      expect(statsOutput).toContain('emoji: 2');
      expect(statsOutput).toContain('abbreviation: 1');
      expect(statsOutput).toContain('approved: 3');
      expect(statsOutput).toContain('pending: 1');
      expect(statsOutput).toContain('rejected: 1');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty review queue', async () => {
      await updater.reviewTerms();
      // Should not throw
    });

    it('should handle terms with special characters', async () => {
      await updater.submitTerm({
        term: '¯\\_(ツ)_/¯',
        definition: 'shrug emoticon',
        type: 'emoji'
      });

      const queuePath = path.join(tempDir, 'queue', 'review-queue.json');
      const queue = JSON.parse(fs.readFileSync(queuePath, 'utf-8'));
      expect(queue.pending[0].term).toBe('¯\\_(ツ)_/¯');
    });

    it('should handle duplicate submissions', async () => {
      await updater.submitTerm({ term: 'duplicate' });
      await updater.submitTerm({ term: 'duplicate' });

      const queuePath = path.join(tempDir, 'queue', 'review-queue.json');
      const queue = JSON.parse(fs.readFileSync(queuePath, 'utf-8'));
      expect(queue.pending).toHaveLength(2);
      // Both should have same ID
      expect(queue.pending[0].id).toBe(queue.pending[1].id);
    });
  });

  describe('Changelog Generation', () => {
    it('should generate meaningful changelog', async () => {
      // Add multiple terms
      await updater.submitTerm({ term: 'added1', definition: 'First added term' });
      await updater.submitTerm({ term: 'added2', definition: 'Second added term' });

      // Approve all
      const queuePath = path.join(tempDir, 'queue', 'review-queue.json');
      let queue = JSON.parse(fs.readFileSync(queuePath, 'utf-8'));
      queue.reviewed = queue.pending.map((t: any) => ({ ...t, status: 'approved' }));
      queue.pending = [];
      fs.writeFileSync(queuePath, JSON.stringify(queue));

      await updater.integrateApprovedTerms();

      const versionPath = path.join(tempDir, 'current-version.json');
      const version = JSON.parse(fs.readFileSync(versionPath, 'utf-8'));

      expect(version.changelog).toContain('# Lexicon Version 1.0.1');
      expect(version.changelog).toContain('## Changes');
      expect(version.changelog).toContain('### Added (2 terms)');
      expect(version.changelog).toContain('added1: First added term');
      expect(version.changelog).toContain('added2: Second added term');
    });
  });
});
