import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { parse } from '@babel/parser';
import _traverse from '@babel/traverse';
import { exec } from 'child_process';
import util from 'util';
import { compressCode } from './codeCompressor.js';
import { generateAITest } from './aiGenerator.js';

const traverse = _traverse.default || _traverse;
const executeCommand = util.promisify(exec);

// Cache API key across multiple executions so user isn't spammed during batch 'generate-tests'
let cachedApiKey = null;

export const generateTestCase = async (filePath) => {
  try {
    let absolutePath = path.resolve(process.cwd(), filePath);

    try {
      await fs.access(absolutePath);
    } catch {
      const extensions = ['.tsx', '.jsx', '.ts', '.js'];
      let found = false;
      for (const ext of extensions) {
        try {
          await fs.access(absolutePath + ext);
          absolutePath += ext;
          found = true;
          break;
        } catch {}
      }
      if (!found) throw new Error(`File not found: ${filePath}`);
    }

    const fileContent = await fs.readFile(absolutePath, 'utf-8');
    const ext = path.extname(absolutePath);
    const basename = path.basename(absolutePath, ext);

    // Skip generic non-component configs
    if (basename.includes('.test') || basename.includes('styles') || basename.includes('constants')) {
      console.log(chalk.gray(`⏭️  Skipping invalid target: ${basename}`));
      return;
    }

    console.log(chalk.cyan(`\n🔍 Analyzing ${basename}...`));

    // 1. AST Code Compression
    const summary = compressCode(fileContent);

    // 2. Complexity Routing
    const isComplex = summary.usesRedux || summary.usesNavigation || summary.hasAsync || fileContent.length > 2000;

    const outputPath = path.join(
      path.dirname(absolutePath),
      `${basename}.test${ext.includes('ts') ? '.tsx' : '.jsx'}`
    );

    let finalCode = '';

    if (isComplex) {
      console.log(chalk.yellow(`🧠 Complex architecture detected. Routing directly to OpenAI AST pipeline...`));
      
      if (!cachedApiKey) {
        const answers = await inquirer.prompt([{
          type: 'password',
          name: 'apiKey',
          message: 'Enter your OpenAI API Key for AI Test Generation:',
          mask: '*'
        }]);
        cachedApiKey = answers.apiKey?.trim();

        if (!cachedApiKey) {
          console.error(chalk.red('❌ No OpenAI API key provided. Breaking the generation flow.'));
          process.exit(1);
        }
      }

      try {
        finalCode = await generateAITest(summary, cachedApiKey);
        console.log(chalk.green('✅ Generated via AI'));
      } catch (aiError) {
        console.error(chalk.red(`❌ AI Generation Error: ${aiError.message}`));
        console.log(chalk.yellow('⚠️ Breaking the flow to prevent further failures.'));
        process.exit(1);
      }
    
    } else {
      console.log(chalk.gray(`⚡ Simple component framework verified. Processing via native AST logic...`));
      
      const ast = parse(fileContent, {
        sourceType: 'module',
        plugins: ['jsx', 'typescript'],
        errorRecovery: true,
      });

      let componentName = basename;
      const propsDetected = new Set();
      const interactions = [];
      const thirdPartyImports = new Set();
      const inputs = [];

      traverse(ast, {
        ExportDefaultDeclaration(path) {
          const declaration = path.node.declaration;
          if (declaration.type === 'Identifier') componentName = declaration.name;
          if (declaration.type === 'FunctionDeclaration' && declaration.id) componentName = declaration.id.name;
          if (declaration.type === 'ArrowFunctionExpression') {
            const parent = path.parentPath.node;
            if (parent?.type === 'VariableDeclaration' && parent.declarations && parent.declarations.length > 0) {
              componentName = parent.declarations[0].id?.name || componentName;
            }
          }
        },
        ImportDeclaration(path) {
          const source = path.node.source.value;
          if (!source.startsWith('.') && source !== 'react' && source !== 'react-native') {
            thirdPartyImports.add(source);
          }
        },
        ObjectPattern(path) {
          if (path.parent.type === 'ArrowFunctionExpression' || path.parent.type === 'FunctionDeclaration') {
            path.node.properties.forEach((prop) => {
              if (prop.key && prop.key.name) propsDetected.add(prop.key.name);
            });
          }
        },
        JSXOpeningElement(path) {
          const { node } = path;
          let testID = null;
          let hasPress = false;
          let hasChange = false;

          node.attributes.forEach((attr) => {
            if (attr.name?.name === 'testID' && attr.value?.type === 'StringLiteral') testID = attr.value.value;
            if (attr.name?.name === 'placeholder' && attr.value?.type === 'StringLiteral') inputs.push(attr.value.value);
            if (attr.name?.name === 'onPress' || attr.name?.name === 'onClick') hasPress = true;
            if (attr.name?.name === 'onChangeText' || attr.name?.name === 'onChange') hasChange = true;
          });

          if (hasPress) interactions.push({ type: 'press', testID });
          if (hasChange) interactions.push({ type: 'changeText', testID });
        },
      });

      let importsText = `import React from 'react';\nimport { render, fireEvent, waitFor } from '@testing-library/react-native';\nimport ${componentName} from './${basename}';\n`;
      let mocksText = '\n// Smart Auto Mocks\n';

      thirdPartyImports.forEach((pkg) => {
        if (pkg.includes('@react-navigation')) {
          mocksText += `jest.mock('${pkg}', () => ({ useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn(), }), }));\n`;
        } else if (pkg.includes('react-redux')) {
          mocksText += `jest.mock('react-redux', () => ({ useDispatch: () => jest.fn(() => ({ unwrap: jest.fn().mockResolvedValue({}), })), useSelector: () => ({ loading: false }), }));\n`;
        } else if (pkg.includes('toast')) {
          mocksText += `jest.mock('${pkg}', () => ({ show: jest.fn(), }));\n`;
        } else {
          mocksText += `jest.mock('${pkg}', () => ({}));\n`;
        }
      });

      let defaultPropsString = '';
      let propsInjection = '';

      if (propsDetected.size > 0) {
        defaultPropsString = `\nconst defaultProps = {\n${[...propsDetected].map((p) => `${p}: jest.fn(),`).join('\n')}\n};\n`;
        propsInjection = '{...defaultProps}';
      }

      let testCases = `\ndescribe('${componentName} Component', () => {\n`;

      testCases += `
  it('renders correctly', () => {${defaultPropsString}
    const { toJSON } = render(<${componentName} ${propsInjection} />);
    expect(toJSON()).toBeTruthy();
  });\n`;

      if (inputs.length > 0) {
        testCases += `
  it('updates input correctly', () => {${defaultPropsString}
    const { getByPlaceholderText } = render(<${componentName} ${propsInjection} />);
    const input = getByPlaceholderText('${inputs[0]}');
    fireEvent.changeText(input, 'test@example.com');
    expect(input.props.value).toBe('test@example.com');
  });\n`;
      }

      interactions.forEach((interaction, idx) => {
        const query = interaction.testID ? `const target = getByTestId('${interaction.testID}');` : inputs.length > 0 ? `const target = getByPlaceholderText('${inputs[0]}');` : `const target = null;`;
        const fire = interaction.type === 'press' ? `fireEvent.press(target);` : `fireEvent.changeText(target, 'test');`;

        testCases += `
  it('handles ${interaction.type} interaction ${idx}', async () => {${defaultPropsString}
    const { getByTestId, getByPlaceholderText } = render(<${componentName} ${propsInjection} />);
    ${query}

    if (target) {
      await waitFor(() => {
        ${fire}
      });
    }
  });\n`;
      });

      testCases += `});`;
      finalCode = importsText + mocksText + testCases;
      console.log(chalk.green('✅ Generated via AST'));
    }

    await fs.writeFile(outputPath, finalCode);
    console.log(chalk.blue(`📄 Saved at: ${outputPath}`));

    try {
      const { stdout } = await executeCommand(`npx jest ${outputPath} --json --passWithNoTests`);
      const result = JSON.parse(stdout);
      const total = result.numTotalTests || 0;
      const passed = result.numPassedTests || 0;

      console.log(chalk.bold('\n📊 TEST RESULTS'));
      console.log(`Total: ${total}`);
      console.log(`Passed: ${passed}`);
      console.log(`Failed: ${total - passed}`);
    } catch {
      console.log(chalk.yellow('⚠️ Jest completed with warnings (Tests failed parsing or execution)'));
    }
  } catch (err) {
    console.error(chalk.red(`❌ Error: ${err.message}`));
  }
};