/**
 * Prompt Stems - Curated active & passive stems for different modes
 * Provides context-aware prompts based on current system state
 */

export type DiaryMode = 'directive' | 'exploratory' | 'reflective' | 'casual';
export type PromptType = 'active' | 'passive';

export interface PromptStem {
  type: PromptType;
  mode: DiaryMode;
  stem: string;
  titleSuggestion: string;
}

export class PromptStems {
  private stems: PromptStem[] = [
    // DIRECTIVE MODE - Focus on goals and next steps
    {
      type: 'active',
      mode: 'directive',
      stem: 'Looking at the current tasks and priorities, what specific next action should be taken to move the most important work forward?',
      titleSuggestion: 'Next Priority Action'
    },
    {
      type: 'active',
      mode: 'directive',
      stem: 'Given the current workflow state and task completion patterns, what optimization could be implemented this week?',
      titleSuggestion: 'Workflow Optimization'
    },
    {
      type: 'passive',
      mode: 'directive',
      stem: 'The system detected some overdue tasks or tool errors. What strategy should be used to get back on track?',
      titleSuggestion: 'Recovery Strategy'
    },

    // EXPLORATORY MODE - Focus on discovery and learning
    {
      type: 'active',
      mode: 'exploratory',
      stem: 'What interesting pattern or connection emerges when looking at recent task completion data and user interactions?',
      titleSuggestion: 'Pattern Discovery'
    },
    {
      type: 'active',
      mode: 'exploratory',
      stem: 'Based on recent conversations and tasks, what new capability or feature might be valuable to explore?',
      titleSuggestion: 'Feature Exploration'
    },
    {
      type: 'passive',
      mode: 'exploratory',
      stem: 'Several successful task completions happened recently. What made them work well and how can that be replicated?',
      titleSuggestion: 'Success Analysis'
    },

    // REFLECTIVE MODE - Focus on learning and improvement
    {
      type: 'active',
      mode: 'reflective',
      stem: 'Reflecting on the past week of interactions, what has been learned about effective collaboration patterns?',
      titleSuggestion: 'Collaboration Insights'
    },
    {
      type: 'active',
      mode: 'reflective',
      stem: 'What assumption about user preferences or workflows has been validated or challenged recently?',
      titleSuggestion: 'Assumption Review'
    },
    {
      type: 'passive',
      mode: 'reflective',
      stem: 'Some tool errors or failed attempts occurred. What can be learned from these failures to prevent them in the future?',
      titleSuggestion: 'Failure Analysis'
    },

    // CASUAL MODE - Focus on general observations and thoughts
    {
      type: 'active',
      mode: 'casual',
      stem: 'What interesting observation can be made about the current state of the system and user activities?',
      titleSuggestion: 'System Observation'
    },
    {
      type: 'active',
      mode: 'casual',
      stem: 'Looking at the data flow and user interactions, what small improvement or insight comes to mind?',
      titleSuggestion: 'Small Insight'
    },
    {
      type: 'passive',
      mode: 'casual',
      stem: 'The system has been running smoothly. What is working well that should be continued?',
      titleSuggestion: 'System Health'
    }
  ];

  /**
   * Select appropriate prompt based on current context
   */
  selectPrompt(context: {
    hasErrors: boolean;
    hasOverdueTasks: boolean;
    recentSuccesses: number;
    systemHealth: 'good' | 'degraded' | 'poor';
    lastMode?: DiaryMode;
  }): PromptStem {
    // Determine mode based on context
    let mode: DiaryMode;
    let preferPassive = false;

    if (context.hasErrors || context.hasOverdueTasks || context.systemHealth === 'poor') {
      mode = context.hasOverdueTasks ? 'directive' : 'reflective';
      preferPassive = true;
    } else if (context.recentSuccesses > 2) {
      mode = 'exploratory';
    } else if (context.systemHealth === 'good') {
      mode = context.lastMode === 'casual' ? 'directive' : 'casual';
    } else {
      mode = 'reflective';
    }

    // Filter stems by mode
    const modeStems = this.stems.filter(stem => stem.mode === mode);
    
    // Prefer passive if we have friction/errors
    const typeStems = preferPassive 
      ? modeStems.filter(stem => stem.type === 'passive')
      : modeStems;

    // Fall back to any mode stems if no type matches
    const candidateStems = typeStems.length > 0 ? typeStems : modeStems;

    // Select randomly from candidates
    return candidateStems[Math.floor(Math.random() * candidateStems.length)];
  }

  /**
   * Get all stems for a specific mode and type
   */
  getStems(mode?: DiaryMode, type?: PromptType): PromptStem[] {
    let filtered = this.stems;
    
    if (mode) {
      filtered = filtered.filter(stem => stem.mode === mode);
    }
    
    if (type) {
      filtered = filtered.filter(stem => stem.type === type);
    }
    
    return filtered;
  }

  /**
   * Add custom prompt stem
   */
  addCustomStem(stem: PromptStem): void {
    this.stems.push(stem);
  }
}