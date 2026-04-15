import chalk from 'chalk';
import fs from 'fs';

const getStars = (score) => {
  const rounded = Math.round(score);
  return '⭐'.repeat(rounded) + '☆'.repeat(5 - rounded);
};

export const generateReport = (score, issues, files, options = {}) => {
  const totalFiles = files.length;
  // Deduplicate files by parsing filename out of 'filepath:line' format
  const filesWithIssues = new Set(issues.map(i => i.file.split(':')[0])).size;
  const healthyFiles = totalFiles - filesWithIssues;
  const healthPercentage = totalFiles === 0 ? 0 : ((healthyFiles / totalFiles) * 100).toFixed(1);

  const highCount = issues.filter(i => i.severity === 'high').length;
  const medCount = issues.filter(i => i.severity === 'medium').length;
  const lowCount = issues.filter(i => i.severity === 'low').length;

  console.log('\n======================================');
  console.log(chalk.bold.cyan(' 🚀 React Native Performance Report'));
  console.log('======================================\n');

  console.log(chalk.bold('📊 SUMMARY DASHBOARD'));
  console.log(`Total Files Scanned : ${totalFiles}`);
  console.log(`Healthy Files       : ${chalk.green(healthyFiles)} (${healthPercentage}%)`);
  console.log(`Files with Issues   : ${filesWithIssues > 0 ? chalk.red(filesWithIssues) : chalk.green(0)}`);
  console.log(`Total Issues Found  : ${issues.length > 0 ? chalk.yellow(issues.length) : chalk.green(0)}`);
  
  const scoreColor = score >= 4 ? chalk.green : (score >= 2.5 ? chalk.yellow : chalk.red);
  console.log(`Score               : ${scoreColor(getStars(score))} (${score}/5)\n`);

  console.log(chalk.bold('🚨 ISSUE BREAKDOWN'));
  console.log(`${chalk.red('🔴 High Priority  :')} ${highCount}`);
  console.log(`${chalk.yellow('🟡 Medium Priority:')} ${medCount}`);
  console.log(`${chalk.blue('🔵 Low Priority   :')} ${lowCount}\n`);

  if (issues.length === 0) {
    console.log(chalk.green('✅ No performance issues found! Excellent job.'));
    console.log('======================================\n');
  } else {
    console.log(chalk.bold('🛠️  DETAILED FINDINGS'));
    issues.forEach((issue, index) => {
      let severityLabel;
      switch (issue.severity) {
        case 'high': severityLabel = chalk.red.bold('[HIGH]'); break;
        case 'medium': severityLabel = chalk.yellow.bold('[MEDIUM]'); break;
        case 'low': severityLabel = chalk.blue.bold('[LOW]'); break;
        default: severityLabel = chalk.gray.bold('[UNKNOWN]');
      }

      console.log(`${index + 1}. ${severityLabel} ${chalk.bold(issue.type)}`);
      console.log(`   File: ${chalk.gray(issue.file)}`);
      console.log(`   Suggestion: ${chalk.cyan(issue.message)}\n`);
    });
    console.log('======================================\n');
  }

  // Handle HTML Export
  if (options.html) {
    const htmlReport = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>React Native Performance Report</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f4f9; color: #333; margin: 0; padding: 40px 20px; }
  .container { max-width: 1000px; margin: auto; background: white; padding: 40px; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.08); }
  h1 { text-align: center; color: #1e293b; font-size: 2.5rem; margin-bottom: 10px; }
  .subtitle { text-align: center; color: #64748b; margin-bottom: 40px; }
  .dashboard { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-top: 30px; }
  .card { padding: 25px; border-radius: 12px; text-align: center; color: white; font-weight: bold; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
  .card h3 { margin: 0; font-size: 1rem; text-transform: uppercase; letter-spacing: 1px; opacity: 0.9; }
  .card p { margin: 15px 0 0; font-size: 2.5rem; font-weight: 800; }
  .card.files { background: linear-gradient(135deg, #3b82f6, #2563eb); }
  .card.healthy { background: linear-gradient(135deg, #10b981, #059669); }
  .card.issues { background: linear-gradient(135deg, #ef4444, #dc2626); }
  .card.score { background: linear-gradient(135deg, #f59e0b, #d97706); }
  h2 { margin-top: 50px; color: #334155; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; }
  table { width: 100%; border-collapse: collapse; margin-top: 20px; text-align: left; }
  th, td { padding: 15px; border-bottom: 1px solid #e2e8f0; }
  th { background-color: #f8fafc; color: #475569; font-weight: 600; text-transform: uppercase; font-size: 0.85rem; letter-spacing: 1px; }
  tbody tr:hover { background-color: #f1f5f9; }
  .severity-high { color: #ef4444; font-weight: bold; }
  .severity-medium { color: #f59e0b; font-weight: bold; }
  .severity-low { color: #3b82f6; font-weight: bold; }
  code { background-color: #f1f5f9; padding: 4px 8px; border-radius: 4px; font-family: monospace; color: #0f172a; }
  .suggestion { color: #64748b; }
</style>
</head>
<body>
<div class="container">
  <h1>🚀 React Native Performance Report</h1>
  <div class="subtitle">Generated dynamically by rn-performance-report</div>

  <div class="dashboard">
    <div class="card files"><h3>Total Files</h3><p>${totalFiles}</p></div>
    <div class="card healthy"><h3>Health</h3><p>${healthPercentage}%</p></div>
    <div class="card issues"><h3>Issues</h3><p>${issues.length}</p></div>
    <div class="card score"><h3>Score</h3><p>${score}<span style="font-size:1.2rem">/5</span></p></div>
  </div>

  ${issues.length > 0 ? `
  <h2>Detailed Findings</h2>
  <table>
    <thead><tr><th>Severity</th><th>Issue Type</th><th>File Origin</th><th>Resolution Suggestion</th></tr></thead>
    <tbody>
      ${issues.map(i => `
        <tr>
          <td class="severity-${i.severity}">${i.severity.toUpperCase()}</td>
          <td><strong>${i.type}</strong></td>
          <td><code>${i.file}</code></td>
          <td class="suggestion">${i.message}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>` : '<h2 style="text-align:center; color: #10b981; margin-top:60px;">✅ Zero performance issues found! Your application is in peak condition!</h2>'}
</div>
</body>
</html>
`;
    fs.writeFileSync('rn-performance-report.html', htmlReport);
    console.log(chalk.green('✅ Beautiful HTML Report exported to: rn-performance-report.html'));
  }

  // Handle JSON Export
  if (options.json) {
    const jsonReport = {
      timestamp: new Date().toISOString(),
      summary: { totalFiles, healthyFiles, healthPercentage, filesWithIssues, totalIssues: issues.length, score },
      breakdown: { high: highCount, medium: medCount, low: lowCount },
      issues
    };
    fs.writeFileSync('rn-performance-report.json', JSON.stringify(jsonReport, null, 2));
    console.log(chalk.green('✅ JSON Report exported to: rn-performance-report.json'));
  }
};
