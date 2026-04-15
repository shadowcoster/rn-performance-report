import { parse } from '@babel/parser';
import _traverse from '@babel/traverse';
const traverse = _traverse.default || _traverse;

/**
 * Parses React Native file and compiles a summarized code skeleton
 * to optimize OpenAI token usage.
 */
export const compressCode = (content) => {
  let ast;
  try {
    ast = parse(content, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript'],
      errorRecovery: true
    });
  } catch (e) {
    throw new Error('Failed to parse AST for compression.');
  }

  let componentName = 'UnknownComponent';
  const inputs = new Set();
  const events = new Set();
  let hasAsync = false;
  let usesRedux = false;
  let usesNavigation = false;
  let hasUseEffect = false;

  traverse(ast, {
    ExportDefaultDeclaration(path) {
      const declaration = path.node.declaration;
      if (declaration.type === 'Identifier') componentName = declaration.name;
      if (declaration.type === 'FunctionDeclaration' && declaration.id) componentName = declaration.id.name;
      if (declaration.type === 'ArrowFunctionExpression') {
        const parent = path.parentPath.node;
        if (parent?.type === 'VariableDeclaration' && parent.declarations?.length > 0) {
          componentName = parent.declarations[0].id?.name || componentName;
        }
      }
    },
    CallExpression(path) {
      const callee = path.node.callee;
      if (callee?.name === 'useDispatch' || callee?.name === 'useSelector') usesRedux = true;
      if (callee?.name === 'useNavigation' || callee?.name === 'useRoute') usesNavigation = true;
      if (callee?.name === 'useEffect') hasUseEffect = true;
      if (callee?.property?.name === 'dispatch') usesRedux = true;
      if (callee?.property?.name === 'navigate') usesNavigation = true;
    },
    FunctionDeclaration(path) {
      if (path.node.async) hasAsync = true;
    },
    ArrowFunctionExpression(path) {
      if (path.node.async) hasAsync = true;
    },
    JSXOpeningElement(path) {
      const { node } = path;
      const name = node.name.name;
      
      if (name === 'TextInput') inputs.add('TextInput');

      node.attributes.forEach(attr => {
        if (attr.name?.name === 'placeholder' && attr.value?.type === 'StringLiteral') {
          inputs.add(attr.value.value);
        }
        if (['onPress', 'onClick', 'onChangeText', 'onChange'].includes(attr.name?.name)) {
          events.add(attr.name.name);
        }
      });
    }
  });

  return {
    componentName,
    inputs: Array.from(inputs),
    events: Array.from(events),
    hasAsync,
    usesRedux,
    usesNavigation,
    hasUseEffect
  };
};
