<div align="center">

# rn-performance-report 🚀

**Analyze performance & auto-generate tests for React Native apps**

[![npm version](https://img.shields.io/npm/v/rn-performance-report.svg?style=flat-square)](https://www.npmjs.com/package/rn-performance-report)
[![npm downloads](https://img.shields.io/npm/dm/rn-performance-report.svg?style=flat-square)](https://www.npmjs.com/package/rn-performance-report)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](http://makeapullrequest.com)

</div>

## 💡 Why use this tool
Manually hunting down React Native performance bottlenecks and writing boilerplate Jest tests is time-consuming and tedious. `rn-performance-report` automates this by statically analyzing your code for common anti-patterns (like inline functions and styles in render) and using advanced AI to generate meaningful, production-ready tests in seconds. 

## 🔥 Features
- **Performance Analysis**: Automatically detect inline functions, inline styles, and large render methods that degrade React Native performance.
- **Code Quality Insights**: Get actionable feedback and a performance score for your components.
- **Test Case Generation**: Instantly generate tests using Jest and React Native Testing Library.
- **AI-Powered Testing**: Leverage AI to understand complex component logic and generate comprehensive full-project test suites securely and efficiently.

## 📦 Installation

To install globally via npm:
```bash
npm install -g rn-performance-report
```

Or run instantly via `npx` without installing:
```bash
npx rn-performance-report
```

## ⚡ Usage

Run the performance scanner on your entire project:
```bash
rn-performance-report test
```

Generate tests for a specific file:
```bash
rn-performance-report test-case <path-to-file>
```

Auto-generate tests for all applicable files:
```bash
rn-performance-report generate-tests
```

## 📊 Example Output

### Performance Report
```bash
$ rn-performance-report test

🚀 Scanning project for performance issues...

File: src/components/ProductList.js
  ❌ Inline function found in render method (Line 42)
  ❌ Inline style object found in render (Line 45)

File: src/screens/HomeScreen.js
  ✅ No performance issues detected

=========================================
🏆 Performance Score: 85/100
⚠️ Found 2 issues to resolve
=========================================
```

## 🧪 Test Generation Example

Input component (`Button.js`):
```javascript
import React from 'react';
import { TouchableOpacity, Text } from 'react-native';

export const Button = ({ onPress, title }) => (
  <TouchableOpacity onPress={onPress}>
    <Text>{title}</Text>
  </TouchableOpacity>
);
```

Generated Test (`Button.test.js`):
```javascript
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Button } from './Button';

describe('Button Component', () => {
  it('renders correctly with given title', () => {
    const { getByText } = render(<Button title="Click Me" onPress={() => {}} />);
    expect(getByText('Click Me')).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    const mockOnPress = jest.fn();
    const { getByText } = render(<Button title="Click Me" onPress={mockOnPress} />);
    
    fireEvent.press(getByText('Click Me'));
    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });
});
```

## 🧠 How it works
1. **AST Analysis**: The tool parses your React Native codebase using Abstract Syntax Trees (AST) to identify inefficiencies without running the code.
2. **AI Integration**: To generate tests, the tool creates a compressed representation of your file's logic and forwards it to an LLM designed for test automation. This ensures context-aware, robust test cases while drastically minimizing token usage and costs.

## 🚀 Roadmap
- **v2 Features**: 
  - CI/CD integrations for automated PR reviews
  - Auto-fix capabilities for minor performance issues
  - Support for custom performance rules configurations
- **Future Improvements**: Expanded AI model support, advanced end-to-end (E2E) testing generation with Detox.

## 🤝 Contributing
Contributions, issues, and feature requests are welcome! 
Feel free to check the [issues page](https://github.com/shadowcoster/rn-performance-report/issues) if you want to contribute.

## ⭐ Support
If this tool helped you save time or improve your app, please give it a ⭐️ on GitHub! It helps with discoverability and encourages further development.
