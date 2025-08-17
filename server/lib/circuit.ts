export class CircuitBreaker {
  private failures = 0;
  private openedAt = 0;
  private state: "closed" | "open" | "half-open" = "closed";
  private probing = false;

  constructor(private failureThreshold = 5, private openMs = 20_000) {}

  canRequest() {
    if (this.state === "open") {
      if (Date.now() - this.openedAt > this.openMs) {
        this.state = "half-open";
        this.probing = false;
      } else return false;
    }
    if (this.state === "half-open" && this.probing) return false;
    return true;
  }
  markProbe() { if (this.state === "half-open") this.probing = true; }
  onSuccess() { this.failures = 0; this.state = "closed"; this.probing = false; }
  onFailure() {
    this.failures++;
    if (this.state === "half-open" || this.failures >= this.failureThreshold) {
      this.state = "open"; this.openedAt = Date.now(); this.probing = false;
    }
  }
  status() { return { state: this.state, failures: this.failures, openedAt: this.openedAt }; }
}