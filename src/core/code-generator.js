/**
 * Code Generator - High-level code generation from specifications
 * 
 * Uses AST manipulation to generate:
 * - Functions from descriptions
 * - Classes from schemas
 * - Complete modules from specifications
 * - Optimized implementations
 */

import { ASTManipulator } from '../ast/ast-manipulator.js';

export class CodeGenerator {
    constructor(astManipulator) {
        this.ast = astManipulator;
        this.generationHistory = [];
        this.templates = this.initializeTemplates();
    }

    initializeTemplates() {
        return {
            function: {
                basic: `function {name}({params}) {{body}}`,
                async: `async function {name}({params}) {{body}}`,
                generator: `function* {name}({params}) {{body}}`,
                arrow: `({params}) => {{body}}`,
                arrowExpression: `({params}) => expression`
            },
            class: {
                basic: `class {name} {{constructor}}{{methods}}`,
                extends: `class {name} extends {parent} {{constructor}}{{methods}}`
            },
            control: {
                if: `if ({condition}) {{then}}`,
                ifElse: `if ({condition}) {{then}} else {{else}}`,
                ternary: `({condition}) ? {consequent} : {alternate}`,
                switch: `switch ({expression}) {{cases}}`
            },
            loop: {
                for: `for (let {i} = 0; {i} < {n}; {i}++) {{body}}`,
                forEach: `for (const {item} of {iterable}) {{body}}`,
                while: `while ({condition}) {{body}}`,
                doWhile: `do {{body}} while ({condition})`
            },
            error: {
                tryCatch: `try {{tryBlock}} catch ({error}) {{catchBlock}}`,
                tryFinally: `try {{tryBlock}} finally {{finallyBlock}}`,
                throw: `throw new {errorType}({message})`
            }
        };
    }

    generateFunction(spec) {
        const {
            name = 'anonymous',
            params = [],
            body = '',
            async = false,
            generator = false,
            arrow = false,
            returns = null,
            decorators = []
        } = spec;

        let paramStr = params.join(', ');
        let bodyContent = Array.isArray(body) ? body.join('\n') : body;

        // Handle return statement
        if (returns !== null && !bodyContent.includes('return')) {
            bodyContent = bodyContent.trim() 
                ? `return ${returns};`
                : `return ${bodyContent}`;
        }

        // Ensure body has braces
        if (!bodyContent.includes('{')) {
            bodyContent = `{ return ${bodyContent}; }`;
        }

        let code;
        if (arrow) {
            code = `const ${name} = (${paramStr}) => ${bodyContent.includes('{') ? bodyContent : `{ ${bodyContent} }`}`;
        } else if (generator) {
            code = `function* ${name}(${paramStr}) ${bodyContent}`;
        } else if (async) {
            code = `async function ${name}(${paramStr}) ${bodyContent}`;
        } else {
            code = `function ${name}(${paramStr}) ${bodyContent}`;
        }

        // Add decorators
        for (const decorator of decorators) {
            code = `${decorator}\n${code}`;
        }

        return code;
    }

    generateClass(spec) {
        const {
            name = 'Anonymous',
            extends: parentClass = null,
            properties = [],
            methods = [],
            constructor: constructorSpec = null
        } = spec;

        let code = parentClass 
            ? `class ${name} extends ${parentClass} {`
            : `class ${name} {`;

        // Constructor
        if (constructorSpec) {
            const ctorParams = constructorSpec.params?.join(', ') || '';
            const ctorBody = constructorSpec.body?.join('\n') || '';
            code += `\n  constructor(${ctorParams}) {\n    super();\n    ${ctorBody}\n  }`;
        } else if (parentClass) {
            code += `\n  constructor() {\n    super();\n  }`;
        }

        // Properties
        for (const prop of properties) {
            if (prop.initializer !== undefined) {
                code += `\n  ${prop.name} = ${JSON.stringify(prop.initializer)};`;
            } else {
                code += `\n  ${prop.name};`;
            }
        }

        // Methods
        for (const method of methods) {
            const async = method.async ? 'async ' : '';
            const static_ = method.static ? 'static ' : '';
            const params = method.params?.join(', ') || '';
            const body = Array.isArray(method.body) 
                ? method.body.join('\n    ') 
                : method.body || '';
            
            code += `\n  ${static_}${async}${method.name}(${params}) {\n    ${body}\n  }`;
        }

        code += '\n}';

        return code;
    }

    generateModule(spec) {
        const {
            imports = [],
            exports = [],
            code = []
        } = spec;

        let moduleCode = '';

        // Imports
        for (const imp of imports) {
            if (imp.default) {
                moduleCode += `import ${imp.default} from '${imp.source}';\n`;
            }
            if (imp.named?.length > 0) {
                moduleCode += `import { ${imp.named.join(', ')} } from '${imp.source}';\n`;
            }
            if (imp.namespace) {
                moduleCode += `import * as ${imp.namespace} from '${imp.source}';\n`;
            }
        }

        if (imports.length > 0) {
            moduleCode += '\n';
        }

        // Code
        for (const statement of code) {
            moduleCode += statement + '\n\n';
        }

        // Exports
        for (const exp of exports) {
            if (typeof exp === 'string') {
                moduleCode += `export { ${exp} };\n`;
            } else if (exp.default) {
                moduleCode += `export default ${exp.default};\n`;
            }
        }

        return moduleCode;
    }

    generateFromAST(ast) {
        return this.ast.generate(ast);
    }

    generateOptimized(spec, optimizationHints = []) {
        let code = this.generateFunction(spec);

        // Apply optimization hints
        for (const hint of optimizationHints) {
            code = this.applyOptimization(code, hint);
        }

        return code;
    }

    applyOptimization(code, hint) {
        switch (hint.type) {
            case 'memoize':
                return this.addMemoization(code, hint.key || 'arguments');
            case 'debounce':
                return this.addDebounce(code, hint.delay || 300);
            case 'throttle':
                return this.addThrottle(code, hint.delay || 300);
            case 'cache':
                return this.addCaching(code, hint.ttl || 60000);
            default:
                return code;
        }
    }

    addMemoization(code, keyExtractor = 'arguments') {
        const ast = this.ast.parse(code);
        const funcName = this.extractFunctionName(ast);
        
        if (!funcName) return code;

        return `
const ${funcName}Cache = new Map();

function ${funcName}(...args) {
    const key = ${keyExtractor === 'arguments' ? 'JSON.stringify(args)' : keyExtractor};
    if (${funcName}Cache.has(key)) {
        return ${funcName}Cache.get(key);
    }
    const result = _${funcName}(...args);
    ${funcName}Cache.set(key, result);
    return result;
}

const _${funcName} = ${funcName};
${code.replace(`function ${funcName}`, 'function _' + funcName)}
`;
    }

    addDebounce(code, delay) {
        const ast = this.ast.parse(code);
        const funcName = this.extractFunctionName(ast);
        
        if (!funcName) return code;

        return `
function ${funcName}(...args) {
    let timeoutId;
    return function(...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => _${funcName}(...args), ${delay});
    };
}

const _${funcName} = ${funcName};
${code.replace(`function ${funcName}`, 'function _' + funcName)}
`;
    }

    addThrottle(code, delay) {
        const ast = this.ast.parse(code);
        const funcName = this.extractFunctionName(ast);
        
        if (!funcName) return code;

        return `
let ${funcName}LastCall = 0;
function ${funcName}(...args) {
    const now = Date.now();
    if (now - ${funcName}LastCall >= ${delay}) {
        ${funcName}LastCall = now;
        return _${funcName}(...args);
    }
}

const _${funcName} = ${funcName};
${code.replace(`function ${funcName}`, 'function _' + funcName)}
`;
    }

    addCaching(code, ttl) {
        const ast = this.ast.parse(code);
        const funcName = this.extractFunctionName(ast);
        
        if (!funcName) return code;

        return `
const ${funcName}Cache = {
    data: new Map(),
    get(key) {
        const entry = this.data.get(key);
        if (entry && Date.now() - entry.timestamp < ${ttl}) {
            return entry.value;
        }
        return undefined;
    },
    set(key, value) {
        this.data.set(key, { value, timestamp: Date.now() });
    }
};

${code}

const _${funcName} = ${funcName};
${funcName} = function(...args) {
    const key = JSON.stringify(args);
    const cached = ${funcName}Cache.get(key);
    if (cached !== undefined) return cached;
    const result = _${funcName}(...args);
    ${funcName}Cache.set(key, result);
    return result;
};
`;
    }

    extractFunctionName(ast) {
        const nodes = this.ast.findByType(ast, 'FunctionDeclaration');
        if (nodes.length > 0 && nodes[0].id) {
            return nodes[0].id.name;
        }
        return null;
    }

    generateVariants(spec, count = 3) {
        const variants = [];
        
        for (let i = 0; i < count; i++) {
            const variant = this.mutateSpec(spec, i / count);
            variants.push(this.generateFunction(variant));
        }

        return variants;
    }

    mutateSpec(spec, intensity = 0.5) {
        const mutated = { ...spec };

        // Mutate parameters
        if (mutated.params && mutated.params.length > 0 && Math.random() < intensity) {
            mutated.params = mutated.params.map(p => {
                if (Math.random() < 0.3) {
                    return p + 'Modified';
                }
                return p;
            });
        }

        // Mutate async flag
        if (Math.random() < intensity) {
            mutated.async = !mutated.async;
        }

        // Potentially add memoization
        if (Math.random() < intensity * 0.5) {
            mutated.decorators = mutated.decorators || [];
            mutated.decorators.push('@memoize');
        }

        return mutated;
    }

    updateSource(code) {
        try {
            this.currentSource = code;
            const ast = this.ast.parse(code);
            return { success: true, ast };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    getGenerationHistory() {
        return [...this.generationHistory];
    }

    clearHistory() {
        this.generationHistory = [];
    }
}
