/**
 * TruthLens Education Hub - 2025 Interactive Learning Platform
 *
 * Features:
 * - Personalized learning paths based on assessment
 * - Gamified progress tracking with achievements
 * - Interactive modules with choose-your-own-adventure elements
 * - Real-time analytics and engagement tracking
 * - Accessibility-first design with screen reader support
 * - Mobile-optimized touch interactions
 */

class TruthLensEducation {
  constructor() {
    this.currentModule = null;
    this.userProgress = this.loadUserProgress();
    this.achievements = this.loadAchievements();
    this.learningPath = null;
    this.sessionStartTime = Date.now();

    // Interactive learning data structure
    this.educationData = this.buildEducationDatabase();

    this.init();
  }

  buildEducationDatabase() {
    return {
      modules: {
        'credibility-basics': {
          id: 'credibility-basics',
          title: 'Credibility Basics',
          icon: '🎯',
          level: 'beginner',
          duration: 8,
          description: 'Learn how to evaluate sources and understand credibility scores',
          objectives: [
            'Understand what makes a source credible',
            'Interpret TruthLens credibility scores',
            'Identify reliable vs unreliable sources',
            'Apply basic fact-checking principles'
          ],
          content: {
            sections: [
              {
                id: 'intro',
                title: 'Welcome to Credibility 101! 🎉',
                type: 'interactive-intro',
                content: 'Ready to become a credibility detective? Let\'s start with the basics!',
                duration: 60,
                interactions: [
                  {
                    type: 'choice',
                    question: 'When you see news online, what do you check first? 🤔',
                    options: [
                      { text: 'The headline looks interesting 📰', value: 'headline', feedback: 'Headlines can be misleading! Let\'s learn better ways.' },
                      { text: 'Who wrote or published it 👤', value: 'source', feedback: 'Great instinct! Source credibility is crucial.' },
                      { text: 'How many likes or shares it has 👍', value: 'engagement', feedback: 'Popularity doesn\'t equal accuracy. Let\'s explore why!' }
                    ]
                  }
                ]
              },
              {
                id: 'what-is-credibility',
                title: 'What Makes Something Credible? 🔍',
                type: 'concept-explanation',
                content: 'Credibility is like a trust score for information. Think of it as a reliability rating!',
                duration: 120,
                keyPoints: [
                  '📚 Source expertise and reputation',
                  '✅ Fact-checking and verification',
                  '🔗 Citations and references',
                  '⚖️ Balanced perspective and fairness'
                ],
                visual: {
                  type: 'credibility-pyramid',
                  elements: ['Facts at the base', 'Sources in middle', 'Context at top']
                }
              },
              {
                id: 'scoring-system',
                title: 'Understanding TruthLens Scores 📊',
                type: 'interactive-demo',
                content: 'Our AI analyzes multiple factors to give you an instant credibility score.',
                duration: 180,
                demo: {
                  type: 'score-simulator',
                  examples: [
                    { url: 'reuters.com/article', score: 95, factors: ['Established news org', 'Multiple sources', 'Expert quotes'] },
                    { url: 'random-blog.com/news', score: 35, factors: ['Unknown author', 'No sources cited', 'Sensational language'] },
                    { url: 'university-study.edu', score: 88, factors: ['Academic source', 'Peer reviewed', 'Data-driven'] }
                  ]
                }
              },
              {
                id: 'red-flags',
                title: 'Spotting Red Flags 🚩',
                type: 'choose-your-path',
                content: 'Learn to identify warning signs of unreliable information.',
                duration: 150,
                scenarios: [
                  {
                    id: 'clickbait-headline',
                    setup: 'You see: "DOCTORS HATE THIS ONE WEIRD TRICK!" 😱',
                    choices: [
                      { text: 'Click to read more', outcome: 'careful', feedback: 'Clickbait often leads to misleading info!' },
                      { text: 'Check the source first', outcome: 'good', feedback: 'Smart! Always verify the source.' },
                      { text: 'Share with friends immediately', outcome: 'poor', feedback: 'Whoa! Never share without verifying.' }
                    ]
                  },
                  {
                    id: 'no-author',
                    setup: 'An article has no author listed and says "BREAKING NEWS" 📰',
                    choices: [
                      { text: 'Anonymous can be legitimate', outcome: 'poor', feedback: 'Credible news always has attribution!' },
                      { text: 'Look for other sources covering it', outcome: 'excellent', feedback: 'Perfect! Cross-reference everything.' },
                      { text: 'Trust if it matches my beliefs', outcome: 'careful', feedback: 'Bias can cloud judgment!' }
                    ]
                  }
                ]
              },
              {
                id: 'practice-assessment',
                title: 'Test Your Skills! 🎯',
                type: 'interactive-quiz',
                content: 'Apply what you\'ve learned with real examples.',
                duration: 120,
                questions: [
                  {
                    type: 'source-evaluation',
                    scenario: 'Rate this source\'s credibility',
                    source: {
                      title: 'Climate Change Study Results',
                      author: 'Dr. Sarah Johnson, PhD Environmental Science',
                      publication: 'Nature Climate Research',
                      date: '2024-12-15',
                      citations: 47
                    },
                    correctScore: 'high',
                    explanation: 'Academic author, peer-reviewed journal, recent date, good citations = high credibility!'
                  }
                ]
              }
            ]
          },
          completion: {
            certificate: true,
            badge: 'credibility-detective',
            nextRecommended: ['bias-detection', 'verification-strategies']
          }
        },

        'bias-detection': {
          id: 'bias-detection',
          title: 'Spotting Bias',
          icon: '⚖️',
          level: 'intermediate',
          duration: 12,
          description: 'Identify political lean, perspective, and media bias patterns',
          prerequisites: ['credibility-basics'],
          content: {
            sections: [
              {
                id: 'intro',
                title: 'Everyone Has Perspective! 👁️',
                type: 'perspective-intro',
                content: 'Bias isn\'t always bad - it\'s about understanding different viewpoints.',
                duration: 90,
                keyMessage: 'The goal isn\'t to eliminate bias, but to recognize and account for it.'
              },
              {
                id: 'types-of-bias',
                title: 'The Bias Spectrum 🌈',
                type: 'bias-explorer',
                content: 'From subtle word choices to obvious agenda-pushing.',
                duration: 180,
                biasTypes: [
                  {
                    name: 'Selection Bias',
                    description: 'What stories get covered vs ignored',
                    example: 'Covering only negative economic news during election season',
                    detectability: 'medium'
                  },
                  {
                    name: 'Framing Bias',
                    description: 'How stories are presented',
                    example: '"Tax relief" vs "tax cuts for the wealthy"',
                    detectability: 'easy'
                  },
                  {
                    name: 'Source Bias',
                    description: 'Which experts get quoted',
                    example: 'Only interviewing advocates, not critics',
                    detectability: 'hard'
                  }
                ]
              },
              {
                id: 'political-lean',
                title: 'Political Perspective Detective 🕵️',
                type: 'lean-analyzer',
                content: 'Learn to spot left, right, and center perspectives.',
                duration: 240,
                exercises: [
                  {
                    type: 'headline-comparison',
                    topic: 'Tax Policy',
                    headlines: [
                      { text: 'New Tax Plan Provides Relief for Working Families', lean: 'left' },
                      { text: 'Tax Increases Burden Small Businesses', lean: 'right' },
                      { text: 'Mixed Reactions to Proposed Tax Changes', lean: 'center' }
                    ]
                  }
                ]
              },
              {
                id: 'language-analysis',
                title: 'Words That Reveal Bias 📝',
                type: 'language-lab',
                content: 'Charged words, euphemisms, and loaded language.',
                duration: 180,
                examples: [
                  {
                    neutral: 'protesters',
                    biased: ['rioters', 'freedom fighters', 'activists'],
                    analysis: 'Same people, different framing'
                  },
                  {
                    neutral: 'surveillance program',
                    biased: ['security measure', 'spying operation', 'protection system'],
                    analysis: 'Emotional coloring changes perception'
                  }
                ]
              }
            ]
          }
        },

        'verification-strategies': {
          id: 'verification-strategies',
          title: 'Verification Toolkit',
          icon: '🔍',
          level: 'intermediate',
          duration: 15,
          description: 'Master cross-referencing, fact-checking, and source validation',
          content: {
            sections: [
              {
                id: 'cross-reference',
                title: 'The Three-Source Rule 3️⃣',
                type: 'strategy-guide',
                content: 'Never trust a single source for important information.',
                duration: 180,
                strategy: {
                  name: 'Triangulation Method',
                  steps: [
                    'Find original source',
                    'Look for 2+ independent confirmations',
                    'Check for contradicting information',
                    'Evaluate source quality'
                  ]
                }
              },
              {
                id: 'fact-check-tools',
                title: 'Your Fact-Checking Toolkit 🧰',
                type: 'tool-showcase',
                content: 'Professional tools for amateur detectives.',
                duration: 240,
                tools: [
                  {
                    name: 'Snopes.com',
                    use: 'Urban legends and viral claims',
                    reliability: 'high',
                    speed: 'fast'
                  },
                  {
                    name: 'FactCheck.org',
                    use: 'Political claims and statements',
                    reliability: 'high',
                    speed: 'medium'
                  },
                  {
                    name: 'Google Reverse Image Search',
                    use: 'Photo verification',
                    reliability: 'medium',
                    speed: 'instant'
                  }
                ]
              }
            ]
          }
        }
      },

      assessmentQuestions: [
        {
          id: 1,
          question: '🤔 How confident are you at spotting fake news?',
          type: 'confidence',
          options: [
            { text: '😅 Just starting out', value: 'beginner', weight: { beginner: 3 } },
            { text: '🧐 Pretty good, but want to improve', value: 'intermediate', weight: { intermediate: 3 } },
            { text: '🔍 I\'m already a fact-checking pro', value: 'advanced', weight: { advanced: 3 } }
          ]
        },
        {
          id: 2,
          question: '📱 Where do you get most of your news?',
          type: 'source-preference',
          options: [
            { text: '📱 Social media (TikTok, Instagram, Twitter)', value: 'social', weight: { beginner: 2, intermediate: 1 } },
            { text: '📺 Traditional news websites and TV', value: 'traditional', weight: { intermediate: 2, advanced: 1 } },
            { text: '📚 Multiple sources, including academic', value: 'diverse', weight: { advanced: 3, intermediate: 1 } }
          ]
        },
        {
          id: 3,
          question: '⚖️ How often do you check if news might be biased?',
          type: 'bias-awareness',
          options: [
            { text: '🤷 I don\'t usually think about it', value: 'rarely', weight: { beginner: 3 } },
            { text: '🧐 Sometimes, for important topics', value: 'sometimes', weight: { intermediate: 2, beginner: 1 } },
            { text: '🔍 Always - I know bias is everywhere', value: 'always', weight: { advanced: 3, intermediate: 1 } }
          ]
        },
        {
          id: 4,
          question: '🔍 Before sharing something online, you...',
          type: 'sharing-behavior',
          options: [
            { text: '⚡ Share if it seems interesting or important', value: 'quick', weight: { beginner: 2 } },
            { text: '🤔 Check if it seems legit first', value: 'check', weight: { intermediate: 2, beginner: 1 } },
            { text: '🕵️ Verify through multiple sources', value: 'verify', weight: { advanced: 3, intermediate: 1 } }
          ]
        },
        {
          id: 5,
          question: '📊 What would help you most right now?',
          type: 'learning-goal',
          options: [
            { text: '🎯 Basic skills for spotting fake news', value: 'basics', weight: { beginner: 3 } },
            { text: '⚖️ Understanding bias and perspective', value: 'bias', weight: { intermediate: 3, advanced: 1 } },
            { text: '🚀 Advanced research and verification', value: 'advanced', weight: { advanced: 3, intermediate: 1 } }
          ]
        }
      ],

      achievements: {
        'first-steps': {
          id: 'first-steps',
          name: 'First Steps',
          description: 'Complete your first module',
          icon: '🎯',
          condition: 'complete_module',
          value: 1
        },
        'quiz-master': {
          id: 'quiz-master',
          name: 'Quiz Master',
          description: 'Score 100% on any quiz',
          icon: '🧠',
          condition: 'perfect_quiz',
          value: 1
        },
        'week-warrior': {
          id: 'week-warrior',
          name: 'Week Warrior',
          description: 'Learn for 7 days straight',
          icon: '🔥',
          condition: 'daily_streak',
          value: 7
        },
        'truth-seeker': {
          id: 'truth-seeker',
          name: 'Truth Seeker',
          description: 'Complete all modules',
          icon: '🕵️',
          condition: 'complete_all_modules',
          value: 6
        },
        'bias-detective': {
          id: 'bias-detective',
          name: 'Bias Detective',
          description: 'Master bias detection',
          icon: '⚖️',
          condition: 'complete_bias_module',
          value: 1
        },
        'fact-checker': {
          id: 'fact-checker',
          name: 'Fact Checker',
          description: 'Complete verification training',
          icon: '✅',
          condition: 'complete_verification_module',
          value: 1
        }
      }
    };
  }

  init() {
    this.bindEvents();
    this.updateProgressDisplay();
    this.checkDailyStreak();
    this.setupAccessibility();
  }

  bindEvents() {
    // Assessment events
    document.addEventListener('click', (e) => {
      if (e.target.matches('.answer-btn')) {
        this.handleAssessmentAnswer(e.target);
      }
      if (e.target.matches('.assessment-next')) {
        this.nextAssessmentQuestion();
      }
      if (e.target.matches('.assessment-back')) {
        this.prevAssessmentQuestion();
      }
      if (e.target.matches('.result-start-btn')) {
        this.startLearningPath();
      }
    });

    // Module events
    document.addEventListener('click', (e) => {
      if (e.target.closest('.module-card')) {
        const moduleCard = e.target.closest('.module-card');
        const moduleId = moduleCard.dataset.module;
        this.openModule(moduleId);
      }
    });

    // Quiz events
    document.addEventListener('click', (e) => {
      if (e.target.matches('.quiz-start-btn')) {
        const quizCard = e.target.closest('.quiz-card');
        const quizId = quizCard.dataset.quiz;
        this.startQuiz(quizId);
      }
    });

    // Progress tracking
    document.addEventListener('click', (e) => {
      if (e.target.matches('.progress-btn')) {
        this.showProgressModal();
      }
    });

    // Community events
    document.addEventListener('click', (e) => {
      if (e.target.matches('.community-btn')) {
        this.handleCommunityAction(e.target);
      }
    });
  }

  setupAccessibility() {
    // Add ARIA labels and keyboard navigation
    const moduleCards = document.querySelectorAll('.module-card');
    moduleCards.forEach(card => {
      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', '0');
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          card.click();
        }
      });
    });

    // Progress announcements
    this.setupProgressAnnouncements();
  }

  setupProgressAnnouncements() {
    // Create live region for progress updates
    let announcer = document.getElementById('progress-announcer');
    if (!announcer) {
      announcer = document.createElement('div');
      announcer.id = 'progress-announcer';
      announcer.setAttribute('aria-live', 'polite');
      announcer.setAttribute('aria-atomic', 'true');
      announcer.className = 'sr-only';
      document.body.appendChild(announcer);
    }
  }

  announceProgress(message) {
    const announcer = document.getElementById('progress-announcer');
    if (announcer) {
      announcer.textContent = message;
    }
  }

  // Assessment System
  handleAssessmentAnswer(button) {
    // Clear previous selections
    const answerOptions = button.parentElement;
    answerOptions.querySelectorAll('.answer-btn').forEach(btn => {
      btn.classList.remove('selected');
    });

    // Select current answer
    button.classList.add('selected');

    // Enable next button
    const nextBtn = document.querySelector('.assessment-next');
    if (nextBtn) {
      nextBtn.disabled = false;
    }

    // Store answer
    const questionContainer = button.closest('.assessment-card');
    const currentQuestion = this.getCurrentQuestionIndex();
    this.storeAssessmentAnswer(currentQuestion, button.dataset.value);

    // Provide immediate feedback
    this.showAnswerFeedback(button);
  }

  storeAssessmentAnswer(questionIndex, value) {
    if (!this.assessmentAnswers) {
      this.assessmentAnswers = {};
    }
    this.assessmentAnswers[questionIndex] = value;
  }

  showAnswerFeedback(button) {
    // Add subtle visual feedback
    button.style.animation = 'pulse 0.5s ease-out';

    // Add checkmark emoji
    if (!button.textContent.includes('✓')) {
      button.textContent += ' ✓';
    }

    // Remove animation after completion
    setTimeout(() => {
      button.style.animation = '';
    }, 500);
  }

  nextAssessmentQuestion() {
    const currentQuestion = this.getCurrentQuestionIndex();
    const totalQuestions = this.educationData.assessmentQuestions.length;

    if (currentQuestion < totalQuestions - 1) {
      this.showAssessmentQuestion(currentQuestion + 1);
      this.updateAssessmentProgress(currentQuestion + 1, totalQuestions);
    } else {
      this.completeAssessment();
    }
  }

  prevAssessmentQuestion() {
    const currentQuestion = this.getCurrentQuestionIndex();

    if (currentQuestion > 0) {
      this.showAssessmentQuestion(currentQuestion - 1);
      this.updateAssessmentProgress(currentQuestion - 1, this.educationData.assessmentQuestions.length);
    }
  }

  getCurrentQuestionIndex() {
    // Implementation depends on how you track current question
    return parseInt(document.querySelector('.progress-text').textContent.match(/\d+/)[0]) - 1;
  }

  showAssessmentQuestion(index) {
    const question = this.educationData.assessmentQuestions[index];
    const questionContainer = document.querySelector('.question-container');

    // Update question content
    questionContainer.querySelector('.question-title').textContent = question.question;

    // Update answer options
    const answerOptions = questionContainer.querySelector('.answer-options');
    answerOptions.innerHTML = question.options.map(option => `
      <button class="answer-btn" data-value="${option.value}">
        ${option.text}
      </button>
    `).join('');

    // Update navigation buttons
    const backBtn = document.querySelector('.assessment-back');
    const nextBtn = document.querySelector('.assessment-next');

    backBtn.disabled = index === 0;
    nextBtn.disabled = true;

    // Check if already answered
    if (this.assessmentAnswers && this.assessmentAnswers[index]) {
      const selectedValue = this.assessmentAnswers[index];
      const selectedBtn = answerOptions.querySelector(`[data-value="${selectedValue}"]`);
      if (selectedBtn) {
        selectedBtn.classList.add('selected');
        nextBtn.disabled = false;
      }
    }
  }

  updateAssessmentProgress(current, total) {
    const progressFill = document.querySelector('.progress-fill');
    const progressText = document.querySelector('.progress-text');

    const percentage = ((current + 1) / total) * 100;
    progressFill.style.width = `${percentage}%`;
    progressText.textContent = `Question ${current + 1} of ${total}`;
  }

  completeAssessment() {
    // Calculate learning path based on answers
    this.learningPath = this.calculateLearningPath();

    // Show results
    this.showAssessmentResults();

    // Track completion
    this.trackEvent('assessment_completed', {
      answers: this.assessmentAnswers,
      learning_path: this.learningPath,
      duration: Date.now() - this.sessionStartTime
    });
  }

  calculateLearningPath() {
    const answers = this.assessmentAnswers;
    const weights = { beginner: 0, intermediate: 0, advanced: 0 };

    // Calculate weights based on answers
    this.educationData.assessmentQuestions.forEach((question, index) => {
      const answer = answers[index];
      const option = question.options.find(opt => opt.value === answer);

      if (option && option.weight) {
        Object.keys(option.weight).forEach(level => {
          weights[level] += option.weight[level];
        });
      }
    });

    // Determine primary level
    const primaryLevel = Object.keys(weights).reduce((a, b) =>
      weights[a] > weights[b] ? a : b
    );

    // Generate personalized path
    return {
      level: primaryLevel,
      estimatedTime: this.calculateEstimatedTime(primaryLevel),
      recommendedModules: this.getRecommendedModules(primaryLevel),
      startModule: this.getStartModule(primaryLevel)
    };
  }

  calculateEstimatedTime(level) {
    const baseTimes = {
      beginner: 25,
      intermediate: 35,
      advanced: 45
    };
    return baseTimes[level] || 25;
  }

  getRecommendedModules(level) {
    const moduleRecommendations = {
      beginner: ['credibility-basics', 'bias-detection', 'verification-strategies'],
      intermediate: ['bias-detection', 'verification-strategies', 'truthlens-mastery'],
      advanced: ['verification-strategies', 'truthlens-mastery', 'critical-thinking', 'misinformation-patterns']
    };
    return moduleRecommendations[level] || moduleRecommendations.beginner;
  }

  getStartModule(level) {
    const startModules = {
      beginner: 'credibility-basics',
      intermediate: 'bias-detection',
      advanced: 'verification-strategies'
    };
    return startModules[level] || 'credibility-basics';
  }

  showAssessmentResults() {
    const assessmentQuiz = document.getElementById('assessment-quiz');
    const assessmentResult = document.getElementById('assessment-result');

    // Hide quiz, show results
    assessmentQuiz.hidden = true;
    assessmentResult.hidden = false;

    // Update result content
    document.getElementById('user-level').textContent =
      this.learningPath.level.charAt(0).toUpperCase() + this.learningPath.level.slice(1);
    document.getElementById('estimated-time').textContent =
      `${this.learningPath.estimatedTime} minutes`;
    document.getElementById('module-count').textContent =
      this.learningPath.recommendedModules.length;

    // Announce results to screen readers
    this.announceProgress(`Assessment completed. Your level: ${this.learningPath.level}.
      Estimated time: ${this.learningPath.estimatedTime} minutes.`);
  }

  startLearningPath() {
    // Save learning path
    this.saveLearningPath();

    // Navigate to first recommended module
    const startModule = this.learningPath.startModule;
    this.openModule(startModule);

    // Track learning path start
    this.trackEvent('learning_path_started', {
      path: this.learningPath,
      timestamp: Date.now()
    });
  }

  // Module System
  openModule(moduleId) {
    const module = this.educationData.modules[moduleId];
    if (!module) {
      console.error(`Module ${moduleId} not found`);
      return;
    }

    this.currentModule = module;

    // Check prerequisites
    if (module.prerequisites && !this.hasCompletedPrerequisites(module.prerequisites)) {
      this.showPrerequisiteWarning(module);
      return;
    }

    // Open module modal
    this.showModuleModal(module);

    // Track module start
    this.trackEvent('module_started', {
      module_id: moduleId,
      module_title: module.title,
      user_level: this.learningPath?.level,
      timestamp: Date.now()
    });
  }

  hasCompletedPrerequisites(prerequisites) {
    return prerequisites.every(prereq =>
      this.userProgress.completedModules.includes(prereq)
    );
  }

  showPrerequisiteWarning(module) {
    const warning = `You need to complete these modules first: ${module.prerequisites.join(', ')}`;
    this.showNotification(warning, 'warning');
  }

  showModuleModal(module) {
    const modal = document.getElementById('module-modal');
    const title = modal.querySelector('.module-modal-title');
    const content = modal.querySelector('.module-modal-content');

    title.textContent = module.title;
    content.innerHTML = this.renderModuleContent(module);

    modal.hidden = false;

    // Focus management
    setTimeout(() => {
      const firstFocusable = content.querySelector('button, [tabindex="0"], input');
      if (firstFocusable) {
        firstFocusable.focus();
      }
    }, 100);
  }

  renderModuleContent(module) {
    return `
      <div class="module-intro">
        <div class="module-intro-header">
          <span class="module-intro-icon">${module.icon}</span>
          <div class="module-intro-meta">
            <span class="module-level">${module.level}</span>
            <span class="module-duration">⏱️ ${module.duration} minutes</span>
          </div>
        </div>
        <p class="module-intro-description">${module.description}</p>

        <div class="module-objectives">
          <h4>🎯 Learning Objectives</h4>
          <ul>
            ${module.objectives.map(obj => `<li>${obj}</li>`).join('')}
          </ul>
        </div>

        <div class="module-actions">
          <button class="btn btn-primary module-start-btn" data-module="${module.id}">
            🚀 Start Learning
          </button>
          <button class="btn btn-secondary module-preview-btn" data-module="${module.id}">
            👁️ Preview Content
          </button>
        </div>
      </div>

      <div class="module-progress-track" hidden>
        <div class="section-progress">
          <span class="current-section">1</span> of <span class="total-sections">${module.content.sections.length}</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: 0%"></div>
        </div>
      </div>

      <div class="module-content-area" id="module-content-${module.id}" hidden>
        <!-- Dynamic content will be loaded here -->
      </div>
    `;
  }

  // Progress Tracking
  updateProgressDisplay() {
    const progress = this.userProgress;

    // Update overview cards
    this.updateOverviewCard('overall-progress', `${Math.round(progress.overallProgress)}%`);
    this.updateOverviewCard('time-invested', `${Math.round(progress.timeInvested / 60)}m`);
    this.updateOverviewCard('badges-earned', progress.achievements.length);
    this.updateOverviewCard('day-streak', progress.currentStreak);

    // Update module progress
    this.updateModuleProgress();

    // Update achievements
    this.updateAchievementsDisplay();
  }

  updateOverviewCard(cardType, value) {
    const card = document.querySelector(`[data-overview="${cardType}"] .overview-number`);
    if (card) {
      card.textContent = value;
    }
  }

  updateModuleProgress() {
    const moduleCards = document.querySelectorAll('.module-card');
    moduleCards.forEach(card => {
      const moduleId = card.dataset.module;
      const progress = this.getModuleProgress(moduleId);

      const progressBar = card.querySelector('.progress-fill');
      const progressLabel = card.querySelector('.progress-label');

      if (progressBar && progressLabel) {
        progressBar.style.width = `${progress.percentage}%`;
        progressLabel.textContent = progress.label;
      }
    });
  }

  getModuleProgress(moduleId) {
    const progress = this.userProgress;

    if (progress.completedModules.includes(moduleId)) {
      return { percentage: 100, label: 'Completed' };
    } else if (progress.inProgressModules.includes(moduleId)) {
      const moduleProgress = progress.moduleProgress[moduleId] || 0;
      return { percentage: moduleProgress, label: 'In Progress' };
    } else {
      return { percentage: 0, label: 'Not started' };
    }
  }

  updateAchievementsDisplay() {
    const achievements = this.achievements;
    const userAchievements = this.userProgress.achievements;

    Object.keys(achievements).forEach(achievementId => {
      const badge = document.querySelector(`[data-achievement="${achievementId}"]`);
      if (badge) {
        if (userAchievements.includes(achievementId)) {
          badge.classList.remove('locked');
          badge.classList.add('earned');
        } else {
          badge.classList.add('locked');
          badge.classList.remove('earned');
        }
      }
    });
  }

  checkDailyStreak() {
    const today = new Date().toDateString();
    const lastVisit = localStorage.getItem('truthlens-last-visit');

    if (lastVisit !== today) {
      this.updateStreak();
      localStorage.setItem('truthlens-last-visit', today);
    }
  }

  updateStreak() {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const lastVisit = localStorage.getItem('truthlens-last-visit');

    if (lastVisit === yesterday.toDateString()) {
      // Consecutive day
      this.userProgress.currentStreak += 1;
    } else if (lastVisit !== today.toDateString()) {
      // Streak broken
      this.userProgress.currentStreak = 1;
    }

    // Check for streak achievements
    this.checkStreakAchievements();
    this.saveUserProgress();
  }

  checkStreakAchievements() {
    const streak = this.userProgress.currentStreak;

    if (streak >= 7 && !this.userProgress.achievements.includes('week-warrior')) {
      this.earnAchievement('week-warrior');
    }
  }

  earnAchievement(achievementId) {
    const achievement = this.achievements[achievementId];
    if (!achievement) return;

    // Add to user achievements
    this.userProgress.achievements.push(achievementId);

    // Show celebration
    this.showAchievementNotification(achievement);

    // Update display
    this.updateAchievementsDisplay();

    // Save progress
    this.saveUserProgress();

    // Track achievement
    this.trackEvent('achievement_earned', {
      achievement_id: achievementId,
      achievement_name: achievement.name,
      timestamp: Date.now()
    });

    // Announce to screen readers
    this.announceProgress(`Achievement unlocked: ${achievement.name}! ${achievement.description}`);
  }

  showAchievementNotification(achievement) {
    // Create achievement notification
    const notification = document.createElement('div');
    notification.className = 'achievement-notification';
    notification.innerHTML = `
      <div class="achievement-notification-content">
        <div class="achievement-notification-icon">${achievement.icon}</div>
        <div class="achievement-notification-text">
          <div class="achievement-notification-title">🎉 Achievement Unlocked!</div>
          <div class="achievement-notification-name">${achievement.name}</div>
          <div class="achievement-notification-desc">${achievement.description}</div>
        </div>
      </div>
    `;

    document.body.appendChild(notification);

    // Animate in
    setTimeout(() => {
      notification.classList.add('show');
    }, 100);

    // Remove after delay
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 300);
    }, 4000);
  }

  showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification--${type}`;
    notification.innerHTML = `
      <div class="notification-content">
        <span class="notification-message">${message}</span>
        <button class="notification-close" aria-label="Close notification">✕</button>
      </div>
    `;

    document.body.appendChild(notification);

    // Add close functionality
    notification.querySelector('.notification-close').addEventListener('click', () => {
      notification.remove();
    });

    // Auto-remove after delay
    setTimeout(() => {
      if (document.body.contains(notification)) {
        notification.remove();
      }
    }, 5000);
  }

  // Data Persistence
  loadUserProgress() {
    const saved = localStorage.getItem('truthlens-education-progress');
    if (saved) {
      return JSON.parse(saved);
    }

    return {
      overallProgress: 0,
      timeInvested: 0,
      completedModules: [],
      inProgressModules: [],
      moduleProgress: {},
      achievements: [],
      currentStreak: 0,
      quizScores: {},
      learningPath: null,
      lastActivity: Date.now()
    };
  }

  saveUserProgress() {
    this.userProgress.lastActivity = Date.now();
    localStorage.setItem('truthlens-education-progress', JSON.stringify(this.userProgress));
  }

  loadAchievements() {
    return this.educationData.achievements;
  }

  saveLearningPath() {
    this.userProgress.learningPath = this.learningPath;
    this.saveUserProgress();
  }

  // Analytics Tracking
  trackEvent(eventName, properties = {}) {
    // Add common properties
    const eventData = {
      ...properties,
      session_id: this.getSessionId(),
      user_level: this.learningPath?.level,
      timestamp: Date.now()
    };

    // Send to analytics service
    if (typeof gtag !== 'undefined') {
      gtag('event', eventName, eventData);
    }

    // Console logging for development
    console.log(`🎓 Education Event: ${eventName}`, eventData);
  }

  getSessionId() {
    if (!this.sessionId) {
      this.sessionId = `edu_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    return this.sessionId;
  }
}

// CSS for notifications and achievements (injected dynamically)
const educationCSS = `
.achievement-notification {
  position: fixed;
  top: 20px;
  right: 20px;
  background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
  border-radius: var(--radius-lg, 0.75rem);
  padding: var(--space-4, 1rem);
  box-shadow: var(--shadow-xl, 0 20px 25px -5px rgba(0, 0, 0, 0.1));
  transform: translateX(400px);
  transition: transform var(--transition-normal, 0.25s ease);
  z-index: 2000;
  max-width: 350px;
}

.achievement-notification.show {
  transform: translateX(0);
}

.achievement-notification-content {
  display: flex;
  align-items: center;
  gap: var(--space-3, 0.75rem);
}

.achievement-notification-icon {
  font-size: var(--font-size-2xl, 1.5rem);
  width: 50px;
  height: 50px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.achievement-notification-text {
  flex: 1;
}

.achievement-notification-title {
  font-size: var(--font-size-sm, 0.875rem);
  font-weight: var(--font-weight-bold, 700);
  color: white;
  margin-bottom: var(--space-1, 0.25rem);
}

.achievement-notification-name {
  font-size: var(--font-size-base, 1rem);
  font-weight: var(--font-weight-semibold, 600);
  color: white;
  margin-bottom: var(--space-1, 0.25rem);
}

.achievement-notification-desc {
  font-size: var(--font-size-xs, 0.75rem);
  color: rgba(255, 255, 255, 0.9);
}

.notification {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--bg-primary, #ffffff);
  border: 1px solid var(--color-gray-200, #e5e7eb);
  border-radius: var(--radius-lg, 0.75rem);
  padding: var(--space-4, 1rem);
  box-shadow: var(--shadow-lg, 0 10px 15px -3px rgba(0, 0, 0, 0.1));
  z-index: 1500;
  max-width: 400px;
}

.notification--warning {
  border-color: #f59e0b;
  background: #fffbeb;
}

.notification--error {
  border-color: #ef4444;
  background: #fef2f2;
}

.notification--success {
  border-color: #10b981;
  background: #ecfdf5;
}

.notification-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3, 0.75rem);
}

.notification-message {
  font-size: var(--font-size-sm, 0.875rem);
  color: var(--text-primary, #1f2937);
}

.notification-close {
  background: none;
  border: none;
  color: var(--text-secondary, #6b7280);
  font-size: var(--font-size-lg, 1.125rem);
  cursor: pointer;
  padding: var(--space-1, 0.25rem);
  border-radius: var(--radius-sm, 0.375rem);
  transition: all var(--transition-fast, 0.15s ease);
}

.notification-close:hover {
  background: var(--bg-tertiary, #f3f4f6);
  color: var(--text-primary, #1f2937);
}

@media (max-width: 768px) {
  .achievement-notification {
    right: 10px;
    left: 10px;
    max-width: none;
    transform: translateY(-100px);
  }

  .achievement-notification.show {
    transform: translateY(0);
  }

  .notification {
    left: 10px;
    right: 10px;
    transform: none;
    max-width: none;
  }
}
`;

// Inject education styles
function injectEducationStyles() {
  const styleElement = document.createElement('style');
  styleElement.textContent = educationCSS;
  document.head.appendChild(styleElement);
}

// Initialize education system when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    injectEducationStyles();
    window.truthLensEducation = new TruthLensEducation();
  });
} else {
  injectEducationStyles();
  window.truthLensEducation = new TruthLensEducation();
}

// Export for potential external use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TruthLensEducation;
}
