import { glob } from 'glob';

/**
 * Scans the current project's src directory for JS/TS/React files
 * @returns {Promise<string[]>} Array of file paths
 */
export const scanApp = async () => {
  try {
    const files = await glob('**/*.{js,jsx,ts,tsx}', {
      ignore: ['node_modules/**', '**/*.test.*', '**/*.spec.*', 'ios/**', 'android/**', 'dist/**', '.expo/**', 'coverage/**']
    });
    return files;
  } catch (error) {
    throw new Error(`Failed to scan files: ${error.message}`);
  }
};
