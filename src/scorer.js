/**
 * Calculates a performance score based on the severity of the issues found.
 * @param {Array} issues 
 * @returns {number} Score out of 5 (minimum 1)
 */
export const calculateScore = (issues) => {
  let score = 5.0;

  issues.forEach(issue => {
    switch (issue.severity) {
      case 'high':
        score -= 1.0;
        break;
      case 'medium':
        score -= 0.5;
        break;
      case 'low':
        score -= 0.2;
        break;
      default:
        break;
    }
  });

  // Minimum score should be 1
  return Math.max(1.0, Math.round(score * 10) / 10);
};
