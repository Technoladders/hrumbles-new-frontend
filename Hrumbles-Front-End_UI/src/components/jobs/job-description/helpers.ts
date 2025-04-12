
// Helper utility functions for JobDescription

export function getTimePosted(postedDate: string): string {
  const posted = new Date(postedDate);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - posted.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "1 day";
  if (diffDays < 30) return `${diffDays} days`;
  if (diffDays < 60) return "1 month";
  return `${Math.floor(diffDays / 30)} months`;
}
