/**
 * AST Manipulator - Core module for parsing, analyzing, and modifying code ASTs
 * 
 * Provides the foundation for:
 * - Code generation and transformation
 * - Self-modification through AST manipulation
 * - Pattern matching and code analysis
 */

import * as acorn from 'acorn';
import * as walk from 'acorn-walk';
import * as escodegen from 'escodegen';
import * as estraverse from 'estraverse';

export class ASTManipulator {
    constructor(options = {}) {
        this.options = {
            ecmaVersion: options.ecmaVersion || 2022,
            sourceType: options.sourceType || 'module',
            ...options
        };
        
        this.patternCache = new Map();
        this.transformationRules = [];
        this.initializeTransformationRules();
    }

    initializeTransformationRules() {
        this.transformationRules = [
            {
                name: 'inline-constant',
                pattern: (node) => node.type === 'VariableDeclaration' && 
                         node.declarations.length === 1 &&
                         node.declarations[0].init?.type === 'Literal',
                transform: (node) => ({ type: 'VariableDeclaration', ...node, kind: 'const' })
            },
            {
                name: 'remove-debugger',
                pattern: (node) => node.type === 'DebuggerStatement',
                transform: () => null
            },
            {
                name: 'simplify-boolean',
                pattern: (node) => node.type === 'UnaryExpression' && node.operator === '!',
                transform: (node) => {
                    if (node.argument.type === 'UnaryExpression' && node.argument.operator === '!') {
                        return node.argument.argument;
                    }
                    return node;
                }
            },
            {
                name: 'merge-var-declarations',
                pattern: (nodes) => {
                    if (!Array.isArray(nodes)) return false;
                    const vars = nodes.filter(n => n.type === 'VariableDeclaration' && n.kind === 'var');
                    return vars.length > 1;
                },
                transform: (nodes) => {
                    const vars = nodes.filter(n => n.type === 'VariableDeclaration' && n.kind === 'var');
                    const others = nodes.filter(n => n.type !== 'VariableDeclaration' || n.kind !== 'var');
                    
                    const merged = vars.reduce((acc, decl) => {
                        acc.declarations.push(...decl.declarations);
                        return acc;
                    }, { type: 'VariableDeclaration', kind: 'var', declarations: [] });
                    
                    return [merged, ...others];
                }
            }
        ];
    }

    parse(code, options = {}) {
        try {
            const parserOptions = {
                ...this.options,
                ...options
            };
            
            return acorn.parse(code, parserOptions);
        } catch (error) {
            throw new Error(`Parse error: ${error.message}\nAt position ${error.pos}`);
        }
    }

    generate(ast, options = {}) {
        try {
            return escodegen.generate(ast, {
                format: {
                    indent: { style: '  ' },
                    quotes: 'single',
                    ...options
                },
                ...options
            });
        } catch (error) {
            throw new Error(`Code generation error: ${error.message}`);
        }
    }

    analyze(ast) {
        const analysis = {
            nodeCount: 0,
            functionCount: 0,
            classCount: 0,
            complexity: 0,
            depth: 0,
            imports: [],
            exports: [],
            functions: [],
            classes: [],
            variables: [],
            cyclomaticComplexity: 1
        };

        walk.simple(ast, {
            Node(node) {
                analysis.nodeCount++;
            },
            FunctionDeclaration(node) {
                analysis.functionCount++;
                analysis.functions.push({
                    name: node.id?.name || 'anonymous',
                    params: node.params.length,
                    complexity: this.complexity || 1
                });
            },
            ClassDeclaration(node) {
                analysis.classCount++;
                analysis.classes.push({
                    name: node.id?.name || 'anonymous',
                    methods: node.body.body.filter(m => m.type === 'MethodDefinition').length
                });
            },
            ImportDeclaration(node) {
                analysis.imports.push({
                    source: node.source.value,
                    specifiers: node.specifiers.map(s => s.type)
                });
            },
            ExportNamedDeclaration(node) {
                analysis.exports.push(node.specifiers.map(s => s.exported.name));
            },
            VariableDeclarator(node) {
                analysis.variables.push({
                    name: node.id.name,
                    kind: node.parent?.kind || 'var'
                });
            }
        });

        // Calculate cyclomatic complexity
        analysis.cyclomaticComplexity = this.calculateComplexity(ast);

        return analysis;
    }

    calculateComplexity(ast) {
        let complexity = 1;

        estraverse.traverse(ast, {
            enter(node) {
                if (['IfStatement', 'ConditionalExpression', 'ForStatement', 
                     'ForInStatement', 'ForOfStatement', 'WhileStatement', 
                     'DoWhileStatement', 'SwitchCase', 'CatchClause'].includes(node.type)) {
                    complexity++;
                }
                if (node.type === 'LogicalExpression') {
                    if (node.operator === '&&' || node.operator === '||') {
                        complexity++;
                    }
                }
            }
        });

        return complexity;
    }

    findNodes(ast, predicate) {
        const nodes = [];
        
        estraverse.traverse(ast, {
            enter(node) {
                if (predicate(node)) {
                    nodes.push(node);
                }
            }
        });
        
        return nodes;
    }

    findByType(ast, type) {
        return this.findNodes(ast, node => node.type === type);
    }

    findByName(ast, name) {
        return this.findNodes(ast, node => 
            node.type === 'Identifier' && node.name === name
        );
    }

    transform(ast, transformers) {
        const transformed = estraverse.replace(ast, {
            enter: (node, parent) => {
                for (const transformer of transformers) {
                    const result = transformer(node, parent);
                    if (result !== undefined) {
                        return result;
                    }
                }
                return node;
            },
            fallback: 'iteration'
        });
        
        return transformed;
    }

    applyChange(change) {
        const { type, target, modifications } = change;
        
        switch (type) {
            case 'replace-node':
                return this.replaceNode(target, modifications);
            case 'insert-node':
                return this.insertNode(target, modifications);
            case 'remove-node':
                return this.removeNode(target);
            case 'modify-property':
                return this.modifyProperty(target, modifications);
            default:
                throw new Error(`Unknown change type: ${type}`);
        }
    }

    replaceNode(target, modifications) {
        return estraverse.replace(target, {
            enter(node) {
                if (modifications[node.type]) {
                    return { ...node, ...modifications[node.type] };
                }
                return node;
            }
        });
    }

    insertNode(target, { before, after, parent, position }) {
        const newAst = JSON.parse(JSON.stringify(target));
        
        estraverse.traverse(newAst, {
            enter(node) {
                if (position && node === position) {
                    if (before) {
                        node.body = [before, ...node.body];
                    }
                    if (after) {
                        node.body = [...node.body, after];
                    }
                }
            }
        });
        
        return newAst;
    }

    removeNode(target) {
        return estraverse.remove(target, {
            enter(node) {
                return null;
            }
        });
    }

    modifyProperty(node, modifications) {
        const modified = { ...node };
        for (const [key, value] of Object.entries(modifications)) {
            if (typeof value === 'function') {
                modified[key] = value(node[key]);
            } else {
                modified[key] = value;
            }
        }
        return modified;
    }

    suggestModifications(ast, goal, learnedPatterns = []) {
        const suggestions = [];
        
        switch (goal) {
            case 'optimize-performance':
                suggestions.push(...this.suggestPerformanceOptimizations(ast));
                break;
            case 'reduce-complexity':
                suggestions.push(...this.suggestComplexityReductions(ast));
                break;
            case 'improve-readability':
                suggestions.push(...this.suggestReadabilityImprovements(ast));
                break;
            case 'fix-bugs':
                suggestions.push(...this.suggestBugFixes(ast));
                break;
            default:
                suggestions.push(...this.suggestGeneralImprovements(ast));
        }

        // Apply learned patterns
        for (const pattern of learnedPatterns) {
            const patternBased = this.applyLearnedPattern(ast, pattern);
            if (patternBased) {
                suggestions.push(...patternBased);
            }
        }

        return suggestions;
    }

    suggestPerformanceOptimizations(ast) {
        const suggestions = [];
        
        // Find repeated computations
        const functions = this.findByType(ast, 'FunctionDeclaration');
        for (const func of functions) {
            const repeatedCalls = this.findRepeatedCalls(func);
            if (repeatedCalls.length > 0) {
                suggestions.push({
                    type: 'performance',
                    priority: 'high',
                    description: `Cache repeated function calls in ${func.id?.name || 'anonymous'}`,
                    transformation: 'memoization',
                    nodes: repeatedCalls
                });
            }
        }

        // Find loops with repeated array operations
        const loops = this.findByType(ast, 'ForStatement');
        for (const loop of loops) {
            if (this.hasInefficientArrayOps(loop)) {
                suggestions.push({
                    type: 'performance',
                    priority: 'high',
                    description: 'Replace array operations with more efficient alternatives',
                    transformation: 'loop-optimization',
                    nodes: [loop]
                });
            }
        }

        // Suggest object pooling for frequently created objects
        const objectCreations = this.findByType(ast, 'ObjectExpression');
        if (objectCreations.length > 10) {
            suggestions.push({
                type: 'performance',
                priority: 'medium',
                description: 'Consider object pooling for frequently created objects',
                transformation: 'object-pooling',
                count: objectCreations.length
            });
        }

        return suggestions;
    }

    suggestComplexityReductions(ast) {
        const suggestions = [];
        const complexity = this.calculateComplexity(ast);
        
        if (complexity > 10) {
            suggestions.push({
                type: 'complexity',
                priority: 'high',
                description: `High cyclomatic complexity (${complexity}). Consider refactoring.`,
                transformation: 'extract-method',
                suggestion: 'Break down complex functions into smaller, focused functions'
            });
        }

        // Find deeply nested conditionals
        const nestedDepth = this.getMaxNestingDepth(ast);
        if (nestedDepth > 4) {
            suggestions.push({
                type: 'complexity',
                priority: 'high',
                description: `Deeply nested code (${nestedDepth} levels)`,
                transformation: 'early-return',
                suggestion: 'Use early returns to reduce nesting'
            });
        }

        return suggestions;
    }

    suggestReadabilityImprovements(ast) {
        const suggestions = [];
        
        // Find magic numbers
        const literals = this.findByType(ast, 'Literal');
        const magicNumbers = literals.filter(l => 
            typeof l.value === 'number' && 
            !Number.isSafeInteger(l.value) === false &&
            ![0, 1, -1].includes(l.value)
        );
        
        if (magicNumbers.length > 0) {
            suggestions.push({
                type: 'readability',
                priority: 'medium',
                description: 'Magic numbers found',
                transformation: 'extract-constant',
                nodes: magicNumbers
            });
        }

        // Find long functions
        const functions = this.findByType(ast, 'FunctionDeclaration');
        for (const func of functions) {
            if (this.countLines(func) > 50) {
                suggestions.push({
                    type: 'readability',
                    priority: 'medium',
                    description: `Long function: ${func.id?.name || 'anonymous'} (${this.countLines(func)} lines)`,
                    transformation: 'extract-method',
                    nodes: [func]
                });
            }
        }

        return suggestions;
    }

    suggestBugFixes(ast) {
        const suggestions = [];
        
        // Find == usage (should use ===)
        const comparisons = this.findByType(ast, 'BinaryExpression');
        const looseComparisons = comparisons.filter(c => 
            c.operator === '==' || c.operator === '!='
        );
        
        if (looseComparisons.length > 0) {
            suggestions.push({
                type: 'bugfix',
                priority: 'high',
                description: 'Use strict equality (===) instead of loose equality (==)',
                transformation: 'strict-equality',
                nodes: looseComparisons
            });
        }

        // Find potential null dereferences
        const memberExpressions = this.findByType(ast, 'MemberExpression');
        const unsafeAccess = memberExpressions.filter(m => 
            m.computed && m.object?.type === 'Identifier' && m.object.name === 'obj'
        );
        
        if (unsafeAccess.length > 0) {
            suggestions.push({
                type: 'bugfix',
                priority: 'medium',
                description: 'Potential unsafe property access',
                transformation: 'add-null-check',
                nodes: unsafeAccess
            });
        }

        // Find empty catch blocks
        const catchClauses = this.findByType(ast, 'CatchClause');
        const emptyCatches = catchClauses.filter(c => 
            !c.body.body || c.body.body.length === 0
        );
        
        if (emptyCatches.length > 0) {
            suggestions.push({
                type: 'bugfix',
                priority: 'low',
                description: 'Empty catch block - errors are silently ignored',
                transformation: 'log-error',
                nodes: emptyCatches
            });
        }

        return suggestions;
    }

    suggestGeneralImprovements(ast) {
        return [
            ...this.suggestPerformanceOptimizations(ast),
            ...this.suggestComplexityReductions(ast),
            ...this.suggestReadabilityImprovements(ast)
        ];
    }

    applyLearnedPattern(ast, pattern) {
        // Apply a learned transformation pattern
        const suggestions = [];
        
        if (pattern.type === 'transformation') {
            const matchingNodes = this.findNodes(ast, pattern.matcher);
            for (const node of matchingNodes) {
                suggestions.push({
                    type: 'learned',
                    priority: 'medium',
                    description: `Applied learned pattern: ${pattern.name}`,
                    transformation: pattern.name,
                    nodes: [node],
                    confidence: pattern.confidence || 0.8
                });
            }
        }
        
        return suggestions;
    }

    findRepeatedCalls(func) {
        const calls = [];
        const callMap = new Map();
        
        estraverse.traverse(func, {
            enter(node) {
                if (node.type === 'CallExpression') {
                    const key = this.parentKey;
                    if (!callMap.has(key)) {
                        callMap.set(key, []);
                    }
                    callMap.get(key).push(node);
                }
            }
        });

        for (const [key, nodes] of callMap) {
            if (nodes.length > 1) {
                calls.push(...nodes);
            }
        }

        return calls;
    }

    hasInefficientArrayOps(loop) {
        let hasArrayOp = false;
        
        estraverse.traverse(loop, {
            enter(node) {
                if (node.type === 'MemberExpression' && 
                    node.property.name === 'push') {
                    hasArrayOp = true;
                }
            }
        });
        
        return hasArrayOp;
    }

    getMaxNestingDepth(ast) {
        let maxDepth = 0;
        let currentDepth = 0;

        estraverse.traverse(ast, {
            enter() {
                currentDepth++;
                maxDepth = Math.max(maxDepth, currentDepth);
            },
            leave() {
                currentDepth--;
            }
        });

        return maxDepth;
    }

    countLines(node) {
        if (node.start && node.end) {
            const code = this.generate(node);
            return code.split('\n').length;
        }
        return 0;
    }

    createNode(type, properties = {}) {
        return {
            type,
            ...properties,
            loc: {
                start: { line: 0, column: 0 },
                end: { line: 0, column: 0 }
            }
        };
    }

    createFunction(name, params, body) {
        return this.createNode('FunctionDeclaration', {
            id: this.createNode('Identifier', { name }),
            params: params.map(p => this.createNode('Identifier', { name: p })),
            body: this.createNode('BlockStatement', {
                body: Array.isArray(body) ? body : [body]
            }),
            generator: false,
            expression: false,
            async: false
        });
    }

    createCall(callee, args = []) {
        return this.createNode('CallExpression', {
            callee: typeof callee === 'string' 
                ? this.createNode('Identifier', { name: callee })
                : callee,
            arguments: args
        });
    }

    createAssignment(left, right) {
        return this.createNode('AssignmentExpression', {
            operator: '=',
            left: typeof left === 'string'
                ? this.createNode('Identifier', { name: left })
                : left,
            right
        });
    }

    createConditional(test, consequent, alternate) {
        return this.createNode('ConditionalExpression', {
            test,
            consequent,
            alternate
        });
    }

    buildFromTemplate(template, context = {}) {
        const code = typeof template === 'string' 
            ? template 
            : this.generate(template);
        
        // Replace placeholders with context values
        let result = code;
        for (const [key, value] of Object.entries(context)) {
            result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
        }
        
        return this.parse(result);
    }

    validateAST(ast) {
        const errors = [];
        
        estraverse.traverse(ast, {
            enter(node) {
                if (!node || typeof node !== 'object') {
                    errors.push(`Invalid node: ${JSON.stringify(node)}`);
                }
                if (!node.type) {
                    errors.push(`Node missing type property`);
                }
            }
        });
        
        return {
            valid: errors.length === 0,
            errors
        };
    }

    cloneAST(ast) {
        return JSON.parse(JSON.stringify(ast));
    }

    compareAST(ast1, ast2) {
        const str1 = JSON.stringify(ast1);
        const str2 = JSON.stringify(ast2);
        return str1 === str2;
    }

    serialize() {
        return {
            options: this.options,
            transformationRules: this.transformationRules.map(r => r.name)
        };
    }

    deserialize(data) {
        this.options = { ...this.options, ...data.options };
    }
}

export { estraverse, walk, escodegen };
