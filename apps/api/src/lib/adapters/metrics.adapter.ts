export interface MetricLabels {
  [key: string]: string | number;
}

export interface IMetricsAdapter {
  recordCounter(name: string, value: number, labels?: MetricLabels): void;
  recordGauge(name: string, value: number, labels?: MetricLabels): void;
  recordHistogram(name: string, value: number, labels?: MetricLabels): void;
}

// In-memory implementation that logs metrics
export class InMemoryMetricsAdapter implements IMetricsAdapter {
  private counters: Map<string, number> = new Map();
  private gauges: Map<string, number> = new Map();
  private histograms: Map<string, number[]> = new Map();

  recordCounter(name: string, value: number, labels?: MetricLabels): void {
    const key = this.buildKey(name, labels);
    const current = this.counters.get(key) || 0;
    this.counters.set(key, current + value);
    console.log('[Metrics] Counter:', { name, value, labels, total: current + value });
  }

  recordGauge(name: string, value: number, labels?: MetricLabels): void {
    const key = this.buildKey(name, labels);
    this.gauges.set(key, value);
    console.log('[Metrics] Gauge:', { name, value, labels });
  }

  recordHistogram(name: string, value: number, labels?: MetricLabels): void {
    const key = this.buildKey(name, labels);
    const values = this.histograms.get(key) || [];
    values.push(value);
    this.histograms.set(key, values);
    console.log('[Metrics] Histogram:', { name, value, labels, count: values.length });
  }

  private buildKey(name: string, labels?: MetricLabels): string {
    if (!labels) return name;
    const labelStr = Object.entries(labels)
      .map(([k, v]) => `${k}:${v}`)
      .join(',');
    return `${name}{${labelStr}}`;
  }

  // Utility method to get stats
  getStats() {
    return {
      counters: Object.fromEntries(this.counters),
      gauges: Object.fromEntries(this.gauges),
      histograms: Object.fromEntries(
        Array.from(this.histograms.entries()).map(([key, values]) => [
          key,
          {
            count: values.length,
            sum: values.reduce((a, b) => a + b, 0),
            avg: values.reduce((a, b) => a + b, 0) / values.length,
            min: Math.min(...values),
            max: Math.max(...values),
          },
        ]),
      ),
    };
  }
}
