import fs from 'fs/promises';
import { parse } from '@babel/parser';
import _traverse from '@babel/traverse';
const traverse = _traverse.default || _traverse;

/**
 * Analyzes file paths for extreme 10x developer React Native performance anti-patterns.
 * @param {string[]} files 
 * @returns {Promise<Array>} Array of detected issues
 */
export const analyzeFiles = async (files) => {
  const issues = [];

  await Promise.all(files.map(async (file) => {
    try {
      const content = await fs.readFile(file, 'utf-8');
      const lines = content.split('\n');

      // 1. Detect Large monolithic files
      if (lines.length > 400) {
        issues.push({
          type: 'Huge Monolithic File',
          severity: 'low',
          file: file,
          message: `File has ${lines.length} lines. Break it down into modular sub-components for better JS thread parsing.`
        });
      }

      let ast;
      try {
        ast = parse(content, {
          sourceType: 'module',
          plugins: ['jsx', 'typescript'],
          errorRecovery: true
        });
      } catch (parseError) {
        return; // skip unparseable
      }

      traverse(ast, {
        
        JSXOpeningElement(path) {
          const { node } = path;
          const componentName = node.name.name;

          // 2. Missing keyExtractor on FlatList
          if (componentName === 'FlatList') {
            const hasKeyExtractor = node.attributes.some(attr => attr.name && attr.name.name === 'keyExtractor');
            if (!hasKeyExtractor) {
              issues.push({
                type: 'Missing keyExtractor',
                severity: 'high',
                file: `${file}:${node.loc.start.line}`,
                message: 'FlatList is missing a keyExtractor prop. This forces React to reconcile the entire list on every state change.'
              });
            }
          }
        },

        JSXElement(path) {
          const { node } = path;
          const element = node.openingElement.name.name;
          
          // 3. ScrollView with .map() instead of FlatList
          if (element === 'ScrollView') {
             node.children.forEach(child => {
                if (child.type === 'JSXExpressionContainer' && child.expression.type === 'CallExpression') {
                   if (child.expression.callee?.property?.name === 'map') {
                      issues.push({
                        type: 'ScrollView rendering a mapped list',
                        severity: 'high',
                        file: `${file}:${node.loc.start.line}`,
                        message: 'Using .map() inside a ScrollView creates severe memory bottlenecks for dynamic lists. Refactor this to use a FlatList for automated windowing.'
                      });
                   }
                }
             });
          }
        },

        CallExpression(path) {
          const { node } = path;

          // 4. Console.log statements polluting the JS thread
          if (node.callee.type === 'MemberExpression' && node.callee.object?.name === 'console' && node.callee.property?.name === 'log') {
            issues.push({
               type: 'Leftover Console Statement',
               severity: 'low',
               file: `${file}:${node.loc.start.line}`,
               message: 'Synchronous console logging blocks the JavaScript thread in React Native drastically. Remove before production.'
            });
          }
        },

        JSXAttribute(path) {
          const { node } = path;
          const attrName = node.name.name;

          // 5. Inline Styles
          if (attrName === 'style' || attrName === 'contentContainerStyle' || attrName === 'ListHeaderComponentStyle' || attrName === 'ListFooterComponentStyle') {
            const isObject = node.value?.type === 'JSXExpressionContainer' && node.value.expression.type === 'ObjectExpression';
            const isArrayWithObject = node.value?.type === 'JSXExpressionContainer' && 
                                      node.value.expression.type === 'ArrayExpression' && 
                                      node.value.expression.elements.some(el => el?.type === 'ObjectExpression');
            
            if (isObject || isArrayWithObject) {
              issues.push({
                type: 'Inline Style Reference',
                severity: 'medium',
                file: `${file}:${node.loc.start.line}`,
                message: 'Use StyleSheet.create. Inline styling hashes a new memory reference every frame rendering cycle, breaking PureComponents.'
              });
            }
          }

          // 6. Generic Object/Array Literals in heavy props
          if (attrName === 'data' || attrName === 'initialParams') {
            if (node.value?.type === 'JSXExpressionContainer' && 
               (node.value.expression.type === 'ArrayExpression' || node.value.expression.type === 'ObjectExpression')) {
                issues.push({
                  type: `Literal passed to ${attrName}`,
                  severity: 'high',
                  file: `${file}:${node.loc.start.line}`,
                  message: `Passing a hardcoded array/object to ${attrName} triggers an infinite re-render loop on lists. Wrap in useMemo or define outside the component.`
                });
            }
          }

          // 7. Inline Anonymous Functions on highly activated props
          if (attrName === 'renderItem' || attrName === 'ListHeaderComponent' || attrName === 'ListFooterComponent' || attrName === 'onPress' || attrName === 'onChange' || attrName === 'onChangeText') {
            const isFunction = node.value?.type === 'JSXExpressionContainer' && 
                              (node.value.expression.type === 'ArrowFunctionExpression' || 
                               node.value.expression.type === 'FunctionExpression');
                               
            if (isFunction) {
              // Ignore high severity for simple onPress, keep High for lists
              const severityLevel = ['onPress', 'onChange', 'onChangeText'].includes(attrName) ? 'medium' : 'high';
              issues.push({
                type: `Inline ${attrName} closure`,
                severity: severityLevel,
                file: `${file}:${node.loc.start.line}`,
                message: `Avoid passing anonymous functions to ${attrName}. Wrap in useCallback to prevent recursive child reconciliation.`
              });
            }
          }
        }
      });
    } catch (error) {
      console.warn(`Warning: Could not read file ${file}: ${error.message}`);
    }
  }));

  return issues;
};
