/**
 * Gen Z Preference Collection System
 * Implements 2025 best practices for emoji feedback, micro-surveys, and collaborative design
 * Focuses on visual communication and mobile-first interactions
 */

import {
  PreferenceData,
  Demographics,
  UserPreferences,
  FeedbackEntry,
  SentimentData
} from './types';
import { SentimentAnalyzer } from './SentimentAnalyzer';

export interface PreferenceCollectionConfig {
  enableEmojiReactions: boolean;
  enableMicroSurveys: boolean;
  enableVideoFeedback: boolean;
  enableCollaborativeDesign: boolean; // "Design with Gen Z, not for them"
  maxSurveyQuestions: number;
  questionTimeout: number; // Time limit for quick responses
  emojiSelectionLimit: number;
  enableRealTimeUpdates: boolean;
  privacyFirst: boolean; // Privacy-first data collection
  accessibilityCompliant: boolean;
}

export interface EmojiReaction {
  emoji: string;
  timestamp: number;
  context: string; // What was being reacted to
  intensity: number; // 0-1, pressure or duration based
  userId?: string;
}

export interface MicroSurvey {
  id: string;
  title: string;
  questions: SurveyQuestion[];
  targetDemographic: Partial<Demographics>;
  completionTime: number; // Expected completion time in seconds
  visualStyle: 'minimal' | 'colorful' | 'animated' | 'dark';
  isCollaborative: boolean; // Co-created with Gen Z users
}

export interface SurveyQuestion {
  id: string;
  type: 'emoji_scale' | 'emoji_select' | 'quick_text' | 'voice_note' | 'video_response' | 'slider' | 'binary';
  question: string;
  options?: string[] | EmojiOption[];
  required: boolean;
  maxTime?: number; // Time limit in seconds
  placeholder?: string;
  accessibility?: AccessibilityOptions;
}

export interface EmojiOption {
  emoji: string;
  label: string;
  value: number;
  description?: string;
}

export interface AccessibilityOptions {
  screenReaderText: string;
  highContrastMode: boolean;
  largeTextSupport: boolean;
  keyboardNavigation: boolean;
  voiceInput: boolean;
}

export interface SurveyResponse {
  surveyId: string;
  questionId: string;
  response: any;
  timestamp: number;
  responseTime: number; // Time taken to respond
  confidence: number; // User's confidence in their response
  method: 'touch' | 'voice' | 'keyboard' | 'gesture';
}

export interface CollaborativeDesignSession {
  id: string;
  topic: string;
  participants: string[];
  ideas: DesignIdea[];
  votingRounds: VotingRound[];
  consensus: DesignConsensus;
  startTime: number;
  endTime?: number;
}

export interface DesignIdea {
  id: string;
  contributor: string;
  idea: string;
  visualRepresentation?: string; // Base64 image or description
  votes: number;
  feedback: FeedbackEntry[];
  timestamp: number;
}

export interface VotingRound {
  id: string;
  options: DesignIdea[];
  results: Map<string, number>;
  method: 'emoji' | 'drag_rank' | 'swipe_vote' | 'tap_vote';
}

export interface DesignConsensus {
  selectedIdeas: string[];
  agreementLevel: number; // 0-1
  dissensionPoints: string[];
  nextSteps: string[];
}

export class PreferenceCollectionSystem {
  private config: PreferenceCollectionConfig;
  private sentimentAnalyzer: SentimentAnalyzer;
  private sessionId: string;

  // Data storage
  private preferences: Map<string, PreferenceData> = new Map();
  private emojiReactions: EmojiReaction[] = [];
  private activeSurveys: Map<string, MicroSurvey> = new Map();
  private surveyResponses: Map<string, SurveyResponse[]> = new Map();
  private collaborativeSessions: Map<string, CollaborativeDesignSession> = new Map();

  // Real-time processing
  private processingQueue: FeedbackEntry[] = [];
  private isProcessingRealTime: boolean = false;

  constructor(config: Partial<PreferenceCollectionConfig> = {}) {
    this.config = {
      enableEmojiReactions: true,
      enableMicroSurveys: true,
      enableVideoFeedback: true,
      enableCollaborativeDesign: true,
      maxSurveyQuestions: 5, // Keep micro-surveys short for Gen Z attention span
      questionTimeout: 15, // 15 seconds max per question
      emojiSelectionLimit: 8, // Limit choices to prevent decision fatigue
      enableRealTimeUpdates: true,
      privacyFirst: true,
      accessibilityCompliant: true,
      ...config
    };

    this.sentimentAnalyzer = new SentimentAnalyzer({
      enableGenZSlangDetection: true,
      enableEmojiAnalysis: true,
      realTimeProcessing: this.config.enableRealTimeUpdates
    });

    this.sessionId = this.generateSessionId();
  }

  /**
   * Initialize preference collection system
   */
  public async initialize(): Promise<void> {
    try {
      // Setup default emoji reaction sets optimized for Gen Z
      this.setupDefaultEmojiSets();

      // Create mobile-optimized survey templates
      this.createDefaultSurveyTemplates();

      // Initialize collaborative design framework
      if (this.config.enableCollaborativeDesign) {
        this.initializeCollaborativeDesign();
      }

      console.debug('[PreferenceCollectionSystem] Initialized successfully', {
        sessionId: this.sessionId,
        config: this.config
      });
    } catch (error) {
      console.error('[PreferenceCollectionSystem] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Collect emoji reaction feedback
   */
  public async collectEmojiReaction(
    emoji: string,
    context: string,
    intensity: number = 1.0,
    userId?: string
  ): Promise<void> {
    const reaction: EmojiReaction = {
      emoji,
      timestamp: Date.now(),
      context,
      intensity: Math.max(0, Math.min(1, intensity)),
      userId
    };

    this.emojiReactions.push(reaction);

    // Analyze sentiment in real-time if enabled
    if (this.config.enableRealTimeUpdates) {
      const feedbackEntry: FeedbackEntry = {
        timestamp: reaction.timestamp,
        type: 'emoji',
        content: emoji,
        context: context,
        sentiment: 0 // Will be calculated
      };

      const sentimentData = await this.sentimentAnalyzer.analyzeSentiment(feedbackEntry);
      feedbackEntry.sentiment = sentimentData.overallSentiment;

      // Update user preferences
      if (userId) {
        this.updateUserPreferences(userId, feedbackEntry, sentimentData);
      }
    }

    // Keep only recent reactions (last 1000)
    if (this.emojiReactions.length > 1000) {
      this.emojiReactions = this.emojiReactions.slice(-1000);
    }
  }

  /**
   * Create and launch micro-survey optimized for Gen Z
   */
  public createMicroSurvey(
    title: string,
    questions: Omit<SurveyQuestion, 'id'>[],
    targetDemographic: Partial<Demographics> = {},
    collaborative: boolean = false
  ): string {
    const surveyId = this.generateSurveyId();

    // Limit questions to maintain attention
    const limitedQuestions = questions.slice(0, this.config.maxSurveyQuestions);

    // Add IDs and optimize for mobile
    const processedQuestions: SurveyQuestion[] = limitedQuestions.map((q, index) => ({
      ...q,
      id: `${surveyId}_q${index + 1}`,
      maxTime: q.maxTime || this.config.questionTimeout,
      accessibility: this.config.accessibilityCompliant ? {
        screenReaderText: `Question ${index + 1}: ${q.question}`,
        highContrastMode: true,
        largeTextSupport: true,
        keyboardNavigation: true,
        voiceInput: true,
        ...q.accessibility
      } : q.accessibility
    }));

    const survey: MicroSurvey = {
      id: surveyId,
      title,
      questions: processedQuestions,
      targetDemographic,
      completionTime: limitedQuestions.length * this.config.questionTimeout,
      visualStyle: this.detectPreferredVisualStyle(targetDemographic),
      isCollaborative: collaborative
    };

    this.activeSurveys.set(surveyId, survey);
    this.surveyResponses.set(surveyId, []);

    return surveyId;
  }

  /**
   * Submit survey response with Gen Z optimizations
   */
  public async submitSurveyResponse(
    surveyId: string,
    questionId: string,
    response: any,
    method: SurveyResponse['method'] = 'touch',
    confidence: number = 1.0
  ): Promise<boolean> {
    const survey = this.activeSurveys.get(surveyId);
    if (!survey) {
      console.error('[PreferenceCollectionSystem] Survey not found:', surveyId);
      return false;
    }

    const question = survey.questions.find(q => q.id === questionId);
    if (!question) {
      console.error('[PreferenceCollectionSystem] Question not found:', questionId);
      return false;
    }

    const now = Date.now();
    const responses = this.surveyResponses.get(surveyId) || [];

    // Find previous response to calculate response time
    const previousResponse = responses
      .filter(r => r.questionId !== questionId)
      .sort((a, b) => b.timestamp - a.timestamp)[0];

    const responseTime = previousResponse ? now - previousResponse.timestamp : 0;

    const surveyResponse: SurveyResponse = {
      surveyId,
      questionId,
      response,
      timestamp: now,
      responseTime,
      confidence: Math.max(0, Math.min(1, confidence)),
      method
    };

    responses.push(surveyResponse);
    this.surveyResponses.set(surveyId, responses);

    // Analyze response for sentiment and preferences
    if (typeof response === 'string' && response.length > 0) {
      const feedbackEntry: FeedbackEntry = {
        timestamp: now,
        type: 'text',
        content: response,
        context: `Survey: ${survey.title}, Question: ${question.question}`,
        sentiment: 0
      };

      const sentimentData = await this.sentimentAnalyzer.analyzeSentiment(feedbackEntry);
      feedbackEntry.sentiment = sentimentData.overallSentiment;

      // Update preferences based on response
      this.updatePreferencesFromSurveyResponse(surveyResponse, sentimentData);
    }

    return true;
  }

  /**
   * Start collaborative design session (Gen Z co-creation)
   */
  public startCollaborativeDesignSession(
    topic: string,
    participants: string[]
  ): string {
    if (!this.config.enableCollaborativeDesign) {
      throw new Error('Collaborative design is disabled');
    }

    const sessionId = this.generateSessionId();

    const session: CollaborativeDesignSession = {
      id: sessionId,
      topic,
      participants,
      ideas: [],
      votingRounds: [],
      consensus: {
        selectedIdeas: [],
        agreementLevel: 0,
        dissensionPoints: [],
        nextSteps: []
      },
      startTime: Date.now()
    };

    this.collaborativeSessions.set(sessionId, session);

    return sessionId;
  }

  /**
   * Contribute idea to collaborative session
   */
  public async contributeIdea(
    sessionId: string,
    contributor: string,
    idea: string,
    visualRepresentation?: string
  ): Promise<string> {
    const session = this.collaborativeSessions.get(sessionId);
    if (!session) {
      throw new Error('Collaborative session not found');
    }

    const ideaId = `${sessionId}_idea_${session.ideas.length + 1}`;

    const designIdea: DesignIdea = {
      id: ideaId,
      contributor,
      idea,
      visualRepresentation,
      votes: 0,
      feedback: [],
      timestamp: Date.now()
    };

    session.ideas.push(designIdea);

    // Analyze idea sentiment
    const feedbackEntry: FeedbackEntry = {
      timestamp: Date.now(),
      type: 'text',
      content: idea,
      context: `Collaborative Design: ${session.topic}`,
      sentiment: 0
    };

    const sentimentData = await this.sentimentAnalyzer.analyzeSentiment(feedbackEntry);
    feedbackEntry.sentiment = sentimentData.overallSentiment;

    designIdea.feedback.push(feedbackEntry);

    return ideaId;
  }

  /**
   * Vote on design ideas using Gen Z friendly methods
   */
  public voteOnIdeas(
    sessionId: string,
    votes: Record<string, number>,
    method: VotingRound['method'] = 'emoji'
  ): void {
    const session = this.collaborativeSessions.get(sessionId);
    if (!session) {
      throw new Error('Collaborative session not found');
    }

    const votingRound: VotingRound = {
      id: `${sessionId}_vote_${session.votingRounds.length + 1}`,
      options: session.ideas,
      results: new Map(Object.entries(votes)),
      method
    };

    session.votingRounds.push(votingRound);

    // Update vote counts on ideas
    Object.entries(votes).forEach(([ideaId, voteCount]) => {
      const idea = session.ideas.find(i => i.id === ideaId);
      if (idea) {
        idea.votes += voteCount;
      }
    });
  }

  /**
   * Get user preferences with demographic insights
   */
  public getUserPreferences(userId: string): PreferenceData | null {
    return this.preferences.get(userId) || null;
  }

  /**
   * Update user preferences from various sources
   */
  private updateUserPreferences(
    userId: string,
    feedbackEntry: FeedbackEntry,
    sentimentData: SentimentData
  ): void {
    let userData = this.preferences.get(userId);

    if (!userData) {
      userData = {
        userId,
        demographics: this.inferDemographics(feedbackEntry, sentimentData),
        preferences: this.inferPreferences(feedbackEntry, sentimentData),
        feedbackHistory: [],
        sentimentAnalysis: sentimentData
      };
    }

    // Add to feedback history
    userData.feedbackHistory.push(feedbackEntry);

    // Update sentiment analysis with running average
    userData.sentimentAnalysis.overallSentiment =
      (userData.sentimentAnalysis.overallSentiment + sentimentData.overallSentiment) / 2;

    // Merge language patterns
    userData.sentimentAnalysis.languagePatterns = Array.from(new Set([
      ...userData.sentimentAnalysis.languagePatterns,
      ...sentimentData.languagePatterns
    ]));

    // Update authenticity score
    userData.sentimentAnalysis.authenticity =
      (userData.sentimentAnalysis.authenticity + sentimentData.authenticity) / 2;

    // Keep only recent feedback (last 100 entries)
    if (userData.feedbackHistory.length > 100) {
      userData.feedbackHistory = userData.feedbackHistory.slice(-100);
    }

    this.preferences.set(userId, userData);
  }

  /**
   * Setup default emoji reaction sets for Gen Z
   */
  private setupDefaultEmojiSets(): void {
    // This would create predefined emoji sets for different contexts
    // Implementation would involve creating emoji mapping configurations
  }

  /**
   * Create default survey templates optimized for Gen Z
   */
  private createDefaultSurveyTemplates(): void {
    // Quick feedback survey
    this.createMicroSurvey(
      "Quick Vibe Check 🔥",
      [
        {
          type: 'emoji_scale',
          question: "How's this feature hitting? 🎯",
          options: [
            { emoji: '😍', label: 'Absolutely slaying', value: 5 },
            { emoji: '😊', label: 'Pretty fire', value: 4 },
            { emoji: '😐', label: 'It\'s mid', value: 3 },
            { emoji: '😬', label: 'Kinda cringe', value: 2 },
            { emoji: '💀', label: 'This ain\'t it', value: 1 }
          ],
          required: true
        },
        {
          type: 'quick_text',
          question: "Any thoughts? Keep it real 💯",
          placeholder: "Type your honest thoughts...",
          required: false,
          maxTime: 30
        }
      ],
      { ageRange: '18-22' },
      true
    );
  }

  /**
   * Initialize collaborative design framework
   */
  private initializeCollaborativeDesign(): void {
    // Setup collaborative design tools and templates
    // This would include real-time collaboration features
  }

  /**
   * Detect preferred visual style based on demographics
   */
  private detectPreferredVisualStyle(demographics: Partial<Demographics>): MicroSurvey['visualStyle'] {
    // Simple heuristic - would be more sophisticated in real implementation
    if (demographics.ageRange === '13-17') {
      return 'colorful';
    } else if (demographics.ageRange === '18-22') {
      return 'minimal';
    } else {
      return 'dark'; // Gen Z often prefers dark mode
    }
  }

  /**
   * Update preferences from survey responses
   */
  private updatePreferencesFromSurveyResponse(
    response: SurveyResponse,
    sentimentData: SentimentData
  ): void {
    // Analyze response patterns to infer preferences
    // This would involve more complex pattern recognition
  }

  /**
   * Infer demographics from feedback patterns
   */
  private inferDemographics(
    feedbackEntry: FeedbackEntry,
    sentimentData: SentimentData
  ): Demographics {
    // Basic inference - would be more sophisticated with ML
    const ageRange = sentimentData.languagePatterns.length > 2 ? '18-22' : '23-27';
    const devicePreference = 'mobile'; // Default for Gen Z

    return {
      ageRange: ageRange as Demographics['ageRange'],
      devicePreference,
      primaryPlatforms: ['tiktok', 'instagram'] // Default Gen Z platforms
    };
  }

  /**
   * Infer user preferences from feedback
   */
  private inferPreferences(
    feedbackEntry: FeedbackEntry,
    sentimentData: SentimentData
  ): UserPreferences {
    return {
      contentLength: 'short', // Gen Z preference
      visualStyle: 'dark', // Popular with Gen Z
      interactionStyle: 'touch', // Mobile-first
      feedbackMethod: 'emoji', // Visual preference
      notificationPreference: 'batched' // Less intrusive
    };
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `pref_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique survey ID
   */
  private generateSurveyId(): string {
    return `survey_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  }

  /**
   * Get system statistics
   */
  public getSystemStats(): {
    totalReactions: number;
    activeSurveys: number;
    totalResponses: number;
    collaborativeSessions: number;
    averageSentiment: number;
  } {
    const totalResponses = Array.from(this.surveyResponses.values())
      .reduce((sum, responses) => sum + responses.length, 0);

    const sentiments = this.emojiReactions.map(r => 0.5); // Placeholder
    const averageSentiment = sentiments.length > 0
      ? sentiments.reduce((sum, s) => sum + s, 0) / sentiments.length
      : 0;

    return {
      totalReactions: this.emojiReactions.length,
      activeSurveys: this.activeSurveys.size,
      totalResponses,
      collaborativeSessions: this.collaborativeSessions.size,
      averageSentiment
    };
  }

  /**
   * Export user data (GDPR compliance)
   */
  public exportUserData(userId: string): any {
    const userData = this.preferences.get(userId);
    const userReactions = this.emojiReactions.filter(r => r.userId === userId);
    const userResponses: SurveyResponse[] = [];

    this.surveyResponses.forEach(responses => {
      // Would need to track userId in responses for full implementation
      userResponses.push(...responses);
    });

    return {
      preferences: userData,
      reactions: userReactions,
      surveyResponses: userResponses,
      exportDate: new Date().toISOString()
    };
  }

  /**
   * Delete user data (GDPR compliance)
   */
  public deleteUserData(userId: string): boolean {
    try {
      this.preferences.delete(userId);
      this.emojiReactions = this.emojiReactions.filter(r => r.userId !== userId);
      // Would also need to clean survey responses with user tracking

      return true;
    } catch (error) {
      console.error('[PreferenceCollectionSystem] Failed to delete user data:', error);
      return false;
    }
  }

  /**
   * Stop preference collection and cleanup
   */
  public stop(): void {
    this.isProcessingRealTime = false;
    this.processingQueue = [];

    console.debug('[PreferenceCollectionSystem] Stopped successfully');
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<PreferenceCollectionConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current configuration
   */
  public getConfig(): PreferenceCollectionConfig {
    return { ...this.config };
  }
}
