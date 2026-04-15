#!/usr/bin/env node

import { Command } from 'commander';
import { scanApp } from '../src/scanner.js';
import { analyzeFiles } from '../src/analyzer.js';
import { calculateScore } from '../src/scorer.js';
import { generateReport } from '../src/reporter.js';
import { generateTestCase } from '../src/testGenerator.js';

const program = new Command();

program
  .name('rn-performance-report')
  .description('A CLI to analyze React Native code for performance issues')
  .version('1.0.0');

program
  .command('test')
  .description('Run performance analysis on directory')
  .option('--html', 'Generate a detailed HTML performance report')
  .option('--json', 'Generate a JSON performance report')
  .action(async (options) => {
    try {
      // 1. Scan for files
      const files = await scanApp();
      
      if (files.length === 0) {
        console.log('No files found to analyze. Ensure you have React Native code in the directory.');
        process.exit(1);
      }

      // 2. Analyze files
      const issues = await analyzeFiles(files);

      // 3. Score findings
      const score = calculateScore(issues);

      // 4. Report
      generateReport(score, issues, files, options);
      
    } catch (error) {
      console.error('An error occurred during analysis:', error);
      process.exit(1);
    }
  });

program
  .command('test-case <file>')
  .description('Generate Jest + React Native Testing Library test cases for a given component')
  .action(async (file) => {
    await generateTestCase(file);
  });

program
  .command('generate-tests')
  .description('Automatically scan the directory and generate test cases selectively routing complex components through AI')
  .action(async () => {
    try {
      const files = await scanApp();
      if (files.length === 0) {
        console.log('No files found to process.');
        return;
      }
      for (const file of files) {
        // Validation skip for explicit testing/styling loops
        if (file.includes('.test.') || file.includes('styles') || file.includes('constants')) {
           continue;
        }
        await generateTestCase(file);
      }
    } catch (e) {
      console.error('Error generating tests:', e);
    }
  });

program.parse(process.argv);
