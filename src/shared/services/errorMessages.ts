/**
 * Error Message Templates - Gen Z UX 2025 Implementation
 * Progressive disclosure, accessibility-first error messaging
 */

import { 
  ErrorMessageTemplate, 
  ErrorCategory, 
  ErrorSeverity, 
  TruthLensError 
} from '../types/error';

class ErrorMessageService {
  private templates: Map<string, ErrorMessageTemplate> = new Map();
  private customTemplates: Map<string, ErrorMessageTemplate> = new Map();

  constructor() {
    this.initializeDefaultTemplates();
  }

  private initializeDefaultTemplates(): void {
    // Network Error Templates (Gen Z friendly, progressive disclosure)
    this.templates.set('network:high', {
      id: 'network-high',
      category: 'network',
      severity: 'high',
      primary: {
        title: "Can't connect right now",
        message: "Your internet seems to be having a moment. No worries though!",
        icon: 'wifi-off',
        color: '#ef4444'
      },
      secondary: {
        details: "We're having trouble reaching our servers. This usually happens when your internet connection is unstable or our servers are temporarily busy.",
        cause: "This could be due to network connectivity issues, server maintenance, or high traffic.",
        prevention: "Try switching to a more stable network connection, or wait a few minutes and try again."
      },
      actions: {
        primary: {
          label: 'Try again',
          action: 'retry',
          accessibilityLabel: 'Retry the connection'
        },
        secondary: {
          label: 'Go offline',
          action: 'offline-mode',
          accessibilityLabel: 'Switch to offline mode'
        },
        tertiary: {
          label: 'Learn more',
          action: 'show-details',
          accessibilityLabel: 'Show more details about this error'
        }
      },
      accessibility: {
        ariaLabel: 'Network connection error',
        focusTarget: 'retry-button',
        announceText: 'Connection issue detected. You can try again or switch to offline mode.'
      },
      analytics: {
        eventName: 'error_displayed',
        properties: {
          category: 'network',
          severity: 'high',
          userFriendly: true
        }
      }
    });

    this.templates.set('network:medium', {
      id: 'network-medium',
      category: 'network',
      severity: 'medium',
      primary: {
        title: "Slow connection detected",
        message: "Things are loading a bit slower than usual",
        icon: 'wifi-low',
        color: '#f59e0b'
      },
      secondary: {
        details: "Your connection speed is lower than optimal. Some features might take longer to load.",
        cause: "This is typically due to network congestion or a weak signal.",
        prevention: "Consider moving closer to your Wi-Fi router or switching to a faster connection."
      },
      actions: {
        primary: {
          label: 'Continue anyway',
          action: 'continue',
          accessibilityLabel: 'Continue with slow connection'
        },
        secondary: {
          label: 'Optimize for slow connection',
          action: 'lite-mode',
          accessibilityLabel: 'Enable lite mode for better performance'
        }
      },
      accessibility: {
        ariaLabel: 'Slow connection warning',
        focusTarget: 'continue-button',
        announceText: 'Slow connection detected. You can continue or enable lite mode.'
      },
      analytics: {
        eventName: 'error_displayed',
        properties: {
          category: 'network',
          severity: 'medium',
          performanceImpact: true
        }
      }
    });

    // Permission Error Templates
    this.templates.set('permission:high', {
      id: 'permission-high',
      category: 'permission',
      severity: 'high',
      primary: {
        title: "Need permission to continue",
        message: "We need access to keep things running smoothly",
        icon: 'shield-alert',
        color: '#ef4444'
      },
      secondary: {
        details: "TruthLens needs certain browser permissions to analyze content and provide credibility scores.",
        cause: "Required permissions were denied or revoked.",
        prevention: "Grant the necessary permissions in your browser settings to enable full functionality."
      },
      actions: {
        primary: {
          label: 'Grant permission',
          action: 'request-permission',
          accessibilityLabel: 'Grant the required permissions'
        },
        secondary: {
          label: 'Continue with limited features',
          action: 'limited-mode',
          accessibilityLabel: 'Continue with reduced functionality'
        },
        tertiary: {
          label: 'Why do you need this?',
          action: 'explain-permissions',
          accessibilityLabel: 'Learn why these permissions are needed'
        }
      },
      accessibility: {
        ariaLabel: 'Permission required error',
        focusTarget: 'grant-permission-button',
        announceText: 'Permission required to continue. You can grant permission or use limited features.'
      },
      analytics: {
        eventName: 'error_displayed',
        properties: {
          category: 'permission',
          severity: 'high',
          blocking: true
        }
      }
    });

    // AI Processing Error Templates
    this.templates.set('ai:medium', {
      id: 'ai-medium',
      category: 'ai',
      severity: 'medium',
      primary: {
        title: "AI analysis unavailable",
        message: "Our AI is taking a quick break, but we've got alternatives",
        icon: 'cpu-off',
        color: '#f59e0b'
      },
      secondary: {
        details: "The Chrome built-in AI service is temporarily unavailable. This might be due to usage limits or service maintenance.",
        cause: "AI quota exceeded or service temporarily unavailable.",
        prevention: "This is temporary and should resolve automatically. You can try again later or use our backup analysis."
      },
      actions: {
        primary: {
          label: 'Use backup analysis',
          action: 'fallback-ai',
          accessibilityLabel: 'Switch to backup AI analysis'
        },
        secondary: {
          label: 'Try again later',
          action: 'retry-later',
          accessibilityLabel: 'Retry AI analysis later'
        },
        tertiary: {
          label: 'Manual review',
          action: 'manual-review',
          accessibilityLabel: 'Review content manually'
        }
      },
      accessibility: {
        ariaLabel: 'AI analysis unavailable',
        focusTarget: 'backup-analysis-button',
        announceText: 'AI analysis temporarily unavailable. Backup analysis is available.'
      },
      analytics: {
        eventName: 'error_displayed',
        properties: {
          category: 'ai',
          severity: 'medium',
          fallbackAvailable: true
        }
      }
    });

    // Data Error Templates  
    this.templates.set('data:medium', {
      id: 'data-medium',
      category: 'data',
      severity: 'medium',
      primary: {
        title: "Couldn't save your settings",
        message: "Your changes didn't stick, but we can fix this",
        icon: 'save-off',
        color: '#f59e0b'
      },
      secondary: {
        details: "There was an issue saving your preferences to local storage. This might be due to storage limits or browser restrictions.",
        cause: "Storage quota exceeded or permissions issue.",
        prevention: "Try clearing some browser data or check if you have sufficient storage space available."
      },
      actions: {
        primary: {
          label: 'Try saving again',
          action: 'retry-save',
          accessibilityLabel: 'Attempt to save settings again'
        },
        secondary: {
          label: 'Use defaults',
          action: 'use-defaults',
          accessibilityLabel: 'Continue with default settings'
        },
        tertiary: {
          label: 'Export settings',
          action: 'export-settings',
          accessibilityLabel: 'Export your settings as backup'
        }
      },
      accessibility: {
        ariaLabel: 'Settings save error',
        focusTarget: 'retry-save-button',
        announceText: 'Failed to save settings. You can retry or use default settings.'
      },
      analytics: {
        eventName: 'error_displayed',
        properties: {
          category: 'data',
          severity: 'medium',
          dataLoss: false
        }
      }
    });

    // Runtime Error Templates
    this.templates.set('runtime:critical', {
      id: 'runtime-critical',
      category: 'runtime',
      severity: 'critical',
      primary: {
        title: "Something went wrong",
        message: "The extension hit a snag and needs to restart",
        icon: 'alert-triangle',
        color: '#ef4444'
      },
      secondary: {
        details: "A critical error occurred that prevents the extension from functioning properly. This is usually due to an unexpected code error or browser compatibility issue.",
        cause: "JavaScript runtime error or unexpected application state.",
        prevention: "This should be rare. If it keeps happening, try updating your browser or reinstalling the extension."
      },
      actions: {
        primary: {
          label: 'Restart extension',
          action: 'restart-extension',
          accessibilityLabel: 'Restart the TruthLens extension'
        },
        secondary: {
          label: 'Send error report',
          action: 'send-report',
          accessibilityLabel: 'Send error report to help us fix this'
        },
        tertiary: {
          label: 'Get help',
          action: 'get-help',
          accessibilityLabel: 'Get help and support'
        }
      },
      accessibility: {
        ariaLabel: 'Critical error occurred',
        focusTarget: 'restart-button',
        announceText: 'Critical error detected. Extension restart required.'
      },
      analytics: {
        eventName: 'error_displayed',
        properties: {
          category: 'runtime',
          severity: 'critical',
          requiresRestart: true
        }
      }
    });

    // User Error Templates (Input validation, etc.)
    this.templates.set('user:low', {
      id: 'user-low',
      category: 'user',
      severity: 'low',
      primary: {
        title: "Oops, that didn't work",
        message: "Let's fix that input real quick",
        icon: 'edit-3',
        color: '#3b82f6'
      },
      secondary: {
        details: "The information you entered isn't in the right format or is missing required fields.",
        cause: "Invalid input format or missing required information.",
        prevention: "Double-check the format requirements and make sure all required fields are filled out."
      },
      actions: {
        primary: {
          label: 'Fix it',
          action: 'focus-input',
          accessibilityLabel: 'Go back to fix the input'
        },
        secondary: {
          label: 'Clear and start over',
          action: 'clear-form',
          accessibilityLabel: 'Clear the form and start over'
        }
      },
      accessibility: {
        ariaLabel: 'Input validation error',
        focusTarget: 'invalid-field',
        announceText: 'Invalid input detected. Please correct the highlighted fields.'
      },
      analytics: {
        eventName: 'error_displayed',
        properties: {
          category: 'user',
          severity: 'low',
          validation: true
        }
      }
    });

    // System/Browser Compatibility Error Templates
    this.templates.set('system:medium', {
      id: 'system-medium',
      category: 'system',
      severity: 'medium',
      primary: {
        title: "Browser compatibility issue",
        message: "Your browser doesn't support some features we use",
        icon: 'browser',
        color: '#f59e0b'
      },
      secondary: {
        details: "Some browser features required by TruthLens aren't available in your current browser or version.",
        cause: "Outdated browser version or missing API support.",
        prevention: "Update your browser to the latest version or switch to a supported browser like Chrome, Edge, or Firefox."
      },
      actions: {
        primary: {
          label: 'Continue with basic features',
          action: 'compatibility-mode',
          accessibilityLabel: 'Continue with basic functionality'
        },
        secondary: {
          label: 'Update browser',
          action: 'update-browser',
          accessibilityLabel: 'Get information about updating your browser'
        },
        tertiary: {
          label: 'Supported browsers',
          action: 'browser-support',
          accessibilityLabel: 'See list of supported browsers'
        }
      },
      accessibility: {
        ariaLabel: 'Browser compatibility warning',
        focusTarget: 'compatibility-mode-button',
        announceText: 'Browser compatibility issue detected. Basic features are available.'
      },
      analytics: {
        eventName: 'error_displayed',
        properties: {
          category: 'system',
          severity: 'medium',
          browserCompat: false
        }
      }
    });

    // Security Error Templates
    this.templates.set('security:high', {
      id: 'security-high',
      category: 'security',
      severity: 'high',
      primary: {
        title: "Security issue detected",
        message: "We've paused to keep your data safe",
        icon: 'shield-x',
        color: '#ef4444'
      },
      secondary: {
        details: "A potential security issue was detected that could compromise your data or privacy.",
        cause: "Content Security Policy violation or suspicious activity detected.",
        prevention: "This is a safety measure. Please ensure you're using TruthLens from the official Chrome Web Store."
      },
      actions: {
        primary: {
          label: 'Learn more',
          action: 'security-info',
          accessibilityLabel: 'Learn more about this security issue'
        },
        secondary: {
          label: 'Contact support',
          action: 'contact-support',
          accessibilityLabel: 'Contact TruthLens support team'
        }
      },
      accessibility: {
        ariaLabel: 'Security issue alert',
        focusTarget: 'security-info-button',
        announceText: 'Security issue detected. Extension paused for safety.'
      },
      analytics: {
        eventName: 'error_displayed',
        properties: {
          category: 'security',
          severity: 'high',
          blocking: true
        }
      }
    });
  }

  // Public API Methods

  public getTemplate(category: ErrorCategory, severity: ErrorSeverity): ErrorMessageTemplate | null {
    const key = `${category}:${severity}`;
    return this.templates.get(key) || this.customTemplates.get(key) || null;
  }

  public getTemplateForError(error: TruthLensError): ErrorMessageTemplate | null {
    // Try to find exact match first
    let template = this.getTemplate(error.category, error.severity);
    
    // Fallback to different severity levels
    if (!template) {
      const fallbackSeverities: ErrorSeverity[] = ['high', 'medium', 'low', 'critical'];
      for (const severity of fallbackSeverities) {
        template = this.getTemplate(error.category, severity);
        if (template) break;
      }
    }

    // If still no template, return a generic one
    if (!template) {
      template = this.getGenericTemplate(error.category, error.severity);
    }

    return template;
  }

  private getGenericTemplate(category: ErrorCategory, severity: ErrorSeverity): ErrorMessageTemplate {
    const severityConfig = {
      critical: { color: '#ef4444', icon: 'alert-triangle' },
      high: { color: '#ef4444', icon: 'alert-circle' },
      medium: { color: '#f59e0b', icon: 'info' },
      low: { color: '#3b82f6', icon: 'info' }
    };

    const config = severityConfig[severity];
    
    return {
      id: `generic-${category}-${severity}`,
      category,
      severity,
      primary: {
        title: 'Something went wrong',
        message: 'We encountered an issue and are working to fix it',
        icon: config.icon,
        color: config.color
      },
      secondary: {
        details: `A ${severity} ${category} error occurred.`,
        cause: 'The specific cause is being investigated.',
        prevention: 'Try refreshing the page or restarting the extension.'
      },
      actions: {
        primary: {
          label: 'Try again',
          action: 'retry',
          accessibilityLabel: 'Try the action again'
        },
        secondary: {
          label: 'Report issue',
          action: 'report',
          accessibilityLabel: 'Report this issue'
        }
      },
      accessibility: {
        ariaLabel: `${category} error`,
        focusTarget: 'retry-button',
        announceText: `A ${category} error occurred. You can try again or report the issue.`
      },
      analytics: {
        eventName: 'error_displayed',
        properties: {
          category,
          severity,
          generic: true
        }
      }
    };
  }

  public registerCustomTemplate(template: ErrorMessageTemplate): void {
    const key = `${template.category}:${template.severity}`;
    this.customTemplates.set(key, template);
  }

  public formatErrorMessage(
    template: ErrorMessageTemplate, 
    error: TruthLensError,
    showDetails: boolean = false
  ): {
    html: string;
    text: string;
    accessibility: {
      ariaLabel: string;
      announceText: string;
    };
  } {
    const html = this.generateErrorHTML(template, error, showDetails);
    const text = this.generateErrorText(template, error, showDetails);
    
    return {
      html,
      text,
      accessibility: {
        ariaLabel: template.accessibility.ariaLabel,
        announceText: template.accessibility.announceText
      }
    };
  }

  private generateErrorHTML(
    template: ErrorMessageTemplate, 
    error: TruthLensError, 
    showDetails: boolean
  ): string {
    return `
      <div class="truthlens-error" role="alert" aria-label="${template.accessibility.ariaLabel}">
        <div class="error-primary">
          <div class="error-icon" style="color: ${template.primary.color}">
            <i class="icon-${template.primary.icon}" aria-hidden="true"></i>
          </div>
          <div class="error-content">
            <h3 class="error-title">${template.primary.title}</h3>
            <p class="error-message">${template.primary.message}</p>
          </div>
        </div>
        
        ${showDetails && template.secondary ? `
          <div class="error-details" aria-expanded="true">
            <div class="error-detail-item">
              <h4>What happened?</h4>
              <p>${template.secondary.details}</p>
            </div>
            <div class="error-detail-item">
              <h4>Why did this happen?</h4>
              <p>${template.secondary.cause}</p>
            </div>
            <div class="error-detail-item">
              <h4>How to prevent this?</h4>
              <p>${template.secondary.prevention}</p>
            </div>
          </div>
        ` : ''}
        
        <div class="error-actions">
          ${template.actions.primary ? `
            <button class="error-action primary" data-action="${template.actions.primary.action}" 
                    aria-label="${template.actions.primary.accessibilityLabel}">
              ${template.actions.primary.label}
            </button>
          ` : ''}
          
          ${template.actions.secondary ? `
            <button class="error-action secondary" data-action="${template.actions.secondary.action}"
                    aria-label="${template.actions.secondary.accessibilityLabel}">
              ${template.actions.secondary.label}
            </button>
          ` : ''}
          
          ${template.actions.tertiary ? `
            <button class="error-action tertiary" data-action="${template.actions.tertiary.action}"
                    aria-label="${template.actions.tertiary.accessibilityLabel}">
              ${template.actions.tertiary.label}
            </button>
          ` : ''}
          
          ${!showDetails && template.secondary ? `
            <button class="error-action details-toggle" data-action="toggle-details"
                    aria-label="Show more details about this error" aria-expanded="false">
              Show details
            </button>
          ` : ''}
        </div>
        
        <div class="error-metadata" aria-hidden="true">
          <small>Error ID: ${error.id}</small>
          <small>Time: ${new Date(error.timestamp).toLocaleTimeString()}</small>
        </div>
      </div>
    `;
  }

  private generateErrorText(
    template: ErrorMessageTemplate, 
    error: TruthLensError, 
    showDetails: boolean
  ): string {
    let text = `${template.primary.title}\n${template.primary.message}`;
    
    if (showDetails && template.secondary) {
      text += `\n\nDetails: ${template.secondary.details}`;
      text += `\nCause: ${template.secondary.cause}`;
      text += `\nPrevention: ${template.secondary.prevention}`;
    }
    
    text += `\n\nActions available:`;
    if (template.actions.primary) {
      text += `\n- ${template.actions.primary.label}`;
    }
    if (template.actions.secondary) {
      text += `\n- ${template.actions.secondary.label}`;
    }
    if (template.actions.tertiary) {
      text += `\n- ${template.actions.tertiary.label}`;
    }
    
    text += `\n\nError ID: ${error.id}`;
    text += `\nTime: ${new Date(error.timestamp).toLocaleString()}`;
    
    return text;
  }

  // Get all available templates for debugging
  public getAllTemplates(): Map<string, ErrorMessageTemplate> {
    const allTemplates = new Map();
    
    this.templates.forEach((template, key) => {
      allTemplates.set(key, template);
    });
    
    this.customTemplates.forEach((template, key) => {
      allTemplates.set(key, template);
    });
    
    return allTemplates;
  }

  // Cleanup method
  public cleanup(): void {
    this.customTemplates.clear();
  }
}

// Export singleton instance
export const errorMessageService = new ErrorMessageService();

export default ErrorMessageService;