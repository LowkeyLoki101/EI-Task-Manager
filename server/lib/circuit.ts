type HalfOpenProbe = { inFlight: boolean; };

export class CircuitBreaker {
  private failures = 0;
  private openedAt = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  private half: HalfOpenProbe = { inFlight: false };

  constructor(
    private failureThreshold = 5,
    private openMs = 15_000
  ) {}

  canRequest() {
    if (this.state === 'open') {
      if (Date.now() - this.openedAt > this.openMs) {
        this.state = 'half-open';
        this.half.inFlight = false;
      } else {
        return false;
      }
    }
    if (this.state === 'half-open' && this.half.inFlight) return false;
    return true;
  }

  onSuccess() {
    this.failures = 0;
    this.state = 'closed';
    this.half.inFlight = false;
  }

  onFailure() {
    this.failures += 1;
    if (this.state === 'half-open' || this.failures >= this.failureThreshold) {
      this.state = 'open';
      this.openedAt = Date.now();
      this.half.inFlight = false;
    }
  }

  markProbe() {
    if (this.state === 'half-open') this.half.inFlight = true;
  }

  status() {
    return { state: this.state, failures: this.failures, openedAt: this.openedAt };
  }
}