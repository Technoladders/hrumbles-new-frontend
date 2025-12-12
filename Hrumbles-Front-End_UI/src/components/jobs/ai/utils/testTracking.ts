// utils/testTracking.ts

interface TestMetrics {
  date: string;
  requestsMade: number;
  budgetSpent: number;
  averageResponseTime: number;
  successRate: number;
}

export function logTestMetrics(data: any) {
  const metrics: TestMetrics = {
    date: new Date().toISOString(),
    requestsMade: data.requestNumber,
    budgetSpent: parseFloat(data.totalSpent),
    averageResponseTime: parseInt(data.responseTime),
    successRate: 100 // You can calculate this
  };
  
  // Log to console
  console.table(metrics);
  
  // Optional: Save to localStorage for simple tracking
  const history = JSON.parse(
    localStorage.getItem('deepseek-test-metrics') || '[]'
  );
  history.push(metrics);
  localStorage.setItem('deepseek-test-metrics', JSON.stringify(history));
}