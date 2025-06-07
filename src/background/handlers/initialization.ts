/**
 * Extension initialization handler
 * Manages extension startup, installation, and updates
 */

export class InitializationHandler {
  /**
   * Initialize the extension
   */
  static async initialize(details?: chrome.runtime.InstalledDetails): Promise<void> {
    console.debug('TruthLens extension initializing...', details?.reason || 'startup');

    try {
      // Set up initial extension state
      await this.setupInitialState();

      // Register event listeners
      this.registerEventListeners();

      // Handle specific installation/update logic
      if (details) {
        await this.handleInstallationDetails(details);
      }

      console.debug('TruthLens extension initialized successfully');
    } catch (error) {
      console.error('Failed to initialize extension:', error);
    }
  }

  /**
   * Handle installation-specific logic
   */
  private static async handleInstallationDetails(details: chrome.runtime.InstalledDetails): Promise<void> {
    if (details.reason === 'install') {
      console.debug('🎉 First time installation - triggering onboarding');

      // Mark that onboarding should be shown
      await chrome.storage.local.set({
        onboarding_completed: false,
        first_install_timestamp: Date.now(),
        installation_reason: 'install'
      });

      // Track installation for analytics
      console.debug('📊 New user installation tracked');

    } else if (details.reason === 'update') {
      console.debug('🔄 Extension updated to version:', chrome.runtime.getManifest().version);

      // For updates, preserve existing onboarding status
      const result = await chrome.storage.local.get('onboarding_completed');
      if (result.onboarding_completed === undefined) {
        // If onboarding status is unknown, assume it's completed for existing users
        await chrome.storage.local.set({ onboarding_completed: true });
      }

      // Track update for analytics
      console.debug('📊 Extension update tracked');
    }
  }

  /**
   * Set up initial extension state
   */
  private static async setupInitialState(): Promise<void> {
    // Initialize default settings if not present
    const result = await chrome.storage.sync.get(['settings']);
    if (!result.settings) {
      await chrome.storage.sync.set({
        settings: {
          enabled: true,
          showVisualIndicators: true,
          indicatorPosition: 'top-right',
          factCheckingLevel: 'standard',
          autoAnalyze: true,
          trustedDomains: [],
          blockedDomains: [],
          theme: 'auto',
          notifications: {
            enabled: true,
            lowCredibilityAlert: true,
            factCheckComplete: false,
          },
          privacy: {
            analyticsEnabled: false,
            localProcessingOnly: true,
            cacheDuration: 24,
          },
        },
      });
    }
  }

  /**
   * Register event listeners for extension lifecycle
   */
  private static registerEventListeners(): void {
    // Handle extension install/update
    chrome.runtime.onInstalled.addListener(this.handleInstalled);

    // Handle extension startup
    chrome.runtime.onStartup.addListener(this.handleStartup);
  }

  /**
   * Handle extension installation or update
   */
  private static handleInstalled(details: chrome.runtime.InstalledDetails): void {
    console.debug('Extension installed/updated:', details.reason);

    if (details.reason === 'install') {
      console.debug('First time installation');
      // Could open welcome page or show onboarding
    } else if (details.reason === 'update') {
      console.debug('Extension updated to version:', chrome.runtime.getManifest().version);
      // Could show update notes or migrate settings
    }
  }

  /**
   * Handle extension startup
   */
  private static handleStartup(): void {
    console.debug('Extension started');
    // Perform any startup tasks
  }
}

/**
 * Exported initialization function for background script
 */
export const initializeExtension = InitializationHandler.initialize;
