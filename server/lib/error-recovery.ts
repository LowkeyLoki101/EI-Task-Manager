/**
 * Error Recovery and Circuit Breaker Utilities
 * Provides resilient system integration with graceful degradation
 */

interface CircuitBreakerState {
  failures: number;
  lastFailureTime: number;
  state: 'closed' | 'open' | 'half-open';
}

class CircuitBreaker {
  private state: CircuitBreakerState = {
    failures: 0,
    lastFailureTime: 0,
    state: 'closed'
  };
  
  constructor(
    private name: string,
    private failureThreshold: number = 5,
    private timeoutMs: number = 60000 // 1 minute
  ) {}

  async execute<T>(operation: () => Promise<T>, fallback?: () => T): Promise<T> {
    if (this.state.state === 'open') {
      const timeSinceFailure = Date.now() - this.state.lastFailureTime;
      if (timeSinceFailure < this.timeoutMs) {
        console.warn(`[CircuitBreaker:${this.name}] Circuit open, using fallback`);
        if (fallback) return fallback();
        throw new Error(`Circuit breaker ${this.name} is open`);
      } else {
        this.state.state = 'half-open';
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      console.error(`[CircuitBreaker:${this.name}] Operation failed:`, error);
      if (fallback) return fallback();
      throw error;
    }
  }

  private onSuccess() {
    this.state.failures = 0;
    this.state.state = 'closed';
  }

  private onFailure() {
    this.state.failures++;
    this.state.lastFailureTime = Date.now();
    
    if (this.state.failures >= this.failureThreshold) {
      this.state.state = 'open';
      console.warn(`[CircuitBreaker:${this.name}] Circuit opened after ${this.state.failures} failures`);
    }
  }

  getState() {
    return { ...this.state };
  }
}

// Global circuit breakers for external services
export const circuitBreakers = {
  openai: new CircuitBreaker('OpenAI', 3, 120000), // 2 minute timeout
  elevenlabs: new CircuitBreaker('ElevenLabs', 5, 60000), // 1 minute timeout
  contextAggregator: new CircuitBreaker('ContextAggregator', 3, 30000), // 30 second timeout
  knowledgeBase: new CircuitBreaker('KnowledgeBase', 3, 30000),
};

export async function safeExternalCall<T>(
  circuitBreaker: CircuitBreaker,
  operation: () => Promise<T>,
  fallback: T,
  operationName: string = 'external-call'
): Promise<T> {
  try {
    return await circuitBreaker.execute(operation, () => fallback);
  } catch (error) {
    console.error(`[ErrorRecovery] ${operationName} failed, using fallback:`, error);
    return fallback;
  }
}

export function isHTMLResponse(content: string): boolean {
  return content.trim().startsWith('<!DOCTYPE') || content.trim().startsWith('<html');
}

export function isJSONResponse(content: string): boolean {
  const trimmed = content.trim();
  return (trimmed.startsWith('{') && trimmed.endsWith('}')) || 
         (trimmed.startsWith('[') && trimmed.endsWith(']'));
}

export async function resilientFetch(url: string, options?: RequestInit): Promise<any> {
  const response = await fetch(url, options);
  const text = await response.text();
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  if (isHTMLResponse(text)) {
    throw new Error(`Expected JSON but received HTML content. URL: ${url}`);
  }
  
  if (isJSONResponse(text)) {
    return JSON.parse(text);
  }
  
  return text;
}