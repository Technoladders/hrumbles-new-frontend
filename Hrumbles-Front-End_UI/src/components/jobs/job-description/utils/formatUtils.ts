
/**
 * Formats a job description into bullet points
 * If the description already contains bullets (-, *, •), it preserves them
 * Otherwise, it splits by newlines or periods to create bullets
 */
export const formatBulletPoints = (description: string): string[] => {
  if (!description) return [];
  
  // Check if the description already has bullet points
  const hasBullets = /^[-*•]|\n[-*•]/.test(description);
  
  if (hasBullets) {
    // Split by newlines and filter out empty lines
    return description
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map(line => {
        // Remove the bullet character if it exists
        return line.replace(/^[-*•]\s*/, '');
      });
  } else {
    // If no bullets, split by periods or newlines
    const sentences = description
      .split(/\.\s+|\n+/)
      .map(sentence => sentence.trim())
      .filter(sentence => sentence.length > 0);
    
    // Add a period at the end if it doesn't exist
    return sentences.map(sentence => 
      sentence.endsWith('.') ? sentence : `${sentence}.`
    );
  }
};

/**
 * Format a value for display, using a fallback if the value is empty
 */
export const formatDisplayValue = (value: string | undefined | null, fallback = "-"): string => {
  if (!value) return fallback;
  return value;
};
