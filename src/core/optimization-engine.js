/**
 * Optimization Engine - Automatic performance optimization
 * 
 * Implements various optimization strategies:
 * - Algorithm optimization
 * - Memory optimization
 * - Computational optimization
 * - Code-level optimizations
 */

import { ASTManipulator } from '../ast/ast-manipulator.js';

export class OptimizationEngine {
    constructor(profiler) {
        this.profiler = profiler;
        this.ast = new ASTManipulator();
        this.optimizationHistory = [];
        this.rules = this.initializeOptimizationRules();
    }

    initializeOptimizationRules() {
        return {
            // Constant folding
            'constant-folding': {
                pattern: (node) => node.type === 'BinaryExpression' &&
                    node.left?.type === 'Literal' && node.right?.type === 'Literal',
                evaluate: (node) => {
                    const left = node.left.value;
                    const right = node.right.value;
                    let result;
                    
                    switch (node.operator) {
                        case '+': result = left + right; break;
                        case '-': result = left - right; break;
                        case '*': result = left * right; break;
                        case '/': result = left / right; break;
                        case '%': result = left % right; break;
                        case '**': result = Math.pow(left, right); break;
                        default: return null;
                    }
                    
                    return { type: 'Literal', value: result };
                },
                description: 'Fold constant expressions at compile time'
            },

            // Dead code elimination
            'dead-code': {
                pattern: (node) => {
                    if (node.type === 'IfStatement') {
                        const test = node.test;
                        if (test.type === 'Literal' && typeof test.value === 'boolean') {
                            return test.value ? 'keep-consequent' : 'keep-alternate';
                        }
                    }
                    return false;
                },
                evaluate: (node, variant) => {
                    if (variant === 'keep-consequent') {
                        return node.consequent;
                    } else if (variant === 'keep-alternate') {
                        return node.alternate || { type: 'BlockStatement', body: [] };
                    }
                    return node;
                },
                description: 'Remove unreachable code branches'
            },

            // Loop unrolling
            'loop-unroll': {
                pattern: (node) => {
                    if (node.type === 'ForStatement') {
                        const body = node.body?.body || [];
                        return body.length <= 3;
                    }
                    return false;
                },
                evaluate: (node) => {
                    // Simplified loop unrolling
                    const body = node.body?.body || [];
                    const update = node.update?.code || 'i++';
                    const init = node.init?.code || 'let i = 0';
                    const test = node.test?.code || 'i < n';
                    
                    return {
                        type: 'ForStatement',
                        unrolled: true,
                        body,
                        iterationHint: body.length
                    };
                },
                description: 'Reduce loop overhead by processing multiple iterations'
            },

            // Function inlining
            'inline-function': {
                pattern: (node) => {
                    if (node.type === 'CallExpression') {
                        const callee = node.callee;
                        // Inline simple functions
                        return callee?.type === 'Identifier' && 
                               node.arguments.length <= 2;
                    }
                    return false;
                },
                description: 'Inline small, frequently called functions'
            },

            // Strength reduction
            'strength-reduction': {
                pattern: (node) => {
                    if (node.type === 'BinaryExpression') {
                        return node.operator === '*' && 
                               (node.left?.value === 2 || node.right?.value === 2);
                    }
                    return false;
                },
                evaluate: (node) => {
                    const other = node.left?.value === 2 ? node.right : node.left;
                    return {
                        type: 'BinaryExpression',
                        operator: '+',
                        left: other,
                        right: other
                    };
                },
                description: 'Replace expensive operations with cheaper alternatives'
            },

            // Remove duplicate code
            'duplicate-elimination': {
                pattern: null,
                description: 'Identify and extract duplicate code patterns'
            },

            // Use local variables
            'cache-members': {
                pattern: (node) => {
                    if (node.type === 'MemberExpression') {
                        return node.computed === false && 
                               node.object?.type === 'Identifier';
                    }
                    return false;
                },
                description: 'Cache frequently accessed object members'
            }
        };
    }

    async generateOptimizations(bottlenecks) {
        const optimizations = [];

        for (const bottleneck of bottlenecks) {
            const applicableRules = this.findApplicableRules(bottleneck);
            
            for (const rule of applicableRules) {
                const optimization = this.createOptimization(bottleneck, rule);
                if (optimization) {
                    optimizations.push(optimization);
                }
            }
        }

        return optimizations;
    }

    findApplicableRules(bottleneck) {
        const applicable = [];

        for (const [name, rule] of Object.entries(this.rules)) {
            if (this.ruleAppliesToBottleneck(name, bottleneck)) {
                applicable.push({ name, rule });
            }
        }

        return applicable;
    }

    ruleAppliesToBottleneck(ruleName, bottleneck) {
        const mapping = {
            'constant-folding': ['computation', 'arithmetic'],
            'dead-code': ['control-flow'],
            'loop-unroll': ['iteration', 'loop'],
            'inline-function': ['function-call'],
            'strength-reduction': ['computation', 'arithmetic'],
            'duplicate-elimination': ['code-size'],
            'cache-members': ['memory', 'property-access']
        };

        const keywords = mapping[ruleName] || [];
        const bottleneckText = JSON.stringify(bottleneck).toLowerCase();
        
        return keywords.some(kw => bottleneckText.includes(kw)) ||
               bottleneck.name.includes(ruleName);
    }

    createOptimization(bottleneck, rule) {
        return {
            type: rule.name,
            description: rule.rule.description,
            priority: bottleneck.severity === 'high' ? 'high' : 'medium',
            estimatedImpact: this.estimateImpact(rule.name, bottleneck),
            implementation: this.getImplementationHint(rule.name)
        };
    }

    estimateImpact(ruleName, bottleneck) {
        const impacts = {
            'constant-folding': 0.05,
            'dead-code': 0.1,
            'loop-unroll': 0.15,
            'inline-function': 0.2,
            'strength-reduction': 0.08,
            'duplicate-elimination': 0.12,
            'cache-members': 0.1
        };

        const baseImpact = impacts[ruleName] || 0.05;
        const severityMultiplier = {
            high: 1.5,
            medium: 1.0,
            low: 0.5
        };

        return baseImpact * (severityMultiplier[bottleneck.severity] || 1);
    }

    getImplementationHint(ruleName) {
        const hints = {
            'constant-folding': 'Evaluate constant expressions during parsing phase',
            'dead-code': 'Use AST traversal to identify and remove unreachable branches',
            'loop-unroll': 'Duplicate loop body based on iteration count',
            'inline-function': 'Replace function calls with function body',
            'strength-reduction': 'Replace multiplication with addition where applicable',
            'duplicate-elimination': 'Extract common patterns into helper functions',
            'cache-members': 'Store object property access in local variables'
        };

        return hints[ruleName] || 'Apply standard optimization technique';
    }

    optimizeCode(code, options = {}) {
        const {
            aggressive = false,
            target = 'performance',
            preserveSemantics = true
        } = options;

        let optimizedCode = code;
        let ast = this.ast.parse(code);

        // Apply optimizations in order
        const optimizationOrder = aggressive
            ? Object.keys(this.rules)
            : ['constant-folding', 'dead-code', 'strength-reduction'];

        for (const ruleName of optimizationOrder) {
            const rule = this.rules[ruleName];
            if (!rule || !rule.pattern) continue;

            const before = JSON.stringify(ast);
            ast = this.ast.transform(ast, [
                (node) => this.applyOptimizationRule(node, rule)
            ]);
            const after = JSON.stringify(ast);

            if (before !== after) {
                this.recordOptimization(ruleName, before !== after);
            }
        }

        optimizedCode = this.ast.generate(ast);

        return {
            original: code,
            optimized: optimizedCode,
            improvements: this.getImprovements()
        };
    }

    applyOptimizationRule(node, rule) {
        if (!rule.pattern) return node;

        const result = rule.pattern(node);
        
        if (result === false) return node;
        
        if (result === true && rule.evaluate) {
            return rule.evaluate(node);
        }
        
        if (typeof result === 'string' && rule.evaluate) {
            return rule.evaluate(node, result);
        }

        return node;
    }

    recordOptimization(ruleName, applied) {
        this.optimizationHistory.push({
            rule: ruleName,
            applied,
            timestamp: Date.now()
        });

        // Keep history manageable
        if (this.optimizationHistory.length > 1000) {
            this.optimizationHistory = this.optimizationHistory.slice(-500);
        }
    }

    getImprovements() {
        const summary = {};
        
        for (const entry of this.optimizationHistory) {
            summary[entry.rule] = (summary[entry.rule] || 0) + 1;
        }

        return summary;
    }

    analyzePerformance(code) {
        const ast = this.ast.parse(code);
        const analysis = this.ast.analyze(ast);

        const performanceHints = [];

        // Check for expensive operations
        const loops = this.ast.findByType(ast, 'ForStatement');
        if (loops.length > 5) {
            performanceHints.push({
                type: 'warning',
                message: `Multiple loops detected (${loops.length}). Consider algorithmic improvements.`,
                severity: 'medium'
            });
        }

        // Check for nested loops
        for (const loop of loops) {
            const nestedLoops = this.countNestedLoops(loop);
            if (nestedLoops > 2) {
                performanceHints.push({
                    type: 'critical',
                    message: `Deeply nested loops (${nestedLoops + 1} levels). Consider optimization.`,
                    severity: 'high'
                });
            }
        }

        // Check for string concatenation in loops
        const binExps = this.ast.findByType(ast, 'BinaryExpression');
        const stringConcat = binExps.filter(e => 
            e.operator === '+' && 
            (e.left?.type === 'Literal' || e.right?.type === 'Literal')
        );
        
        if (stringConcat.length > 10) {
            performanceHints.push({
                type: 'suggestion',
                message: 'Consider using array join instead of string concatenation.',
                severity: 'low'
            });
        }

        return {
            analysis,
            hints: performanceHints,
            complexity: analysis.cyclomaticComplexity,
            estimatedPerformance: this.estimatePerformance(analysis)
        };
    }

    countNestedLoops(node, depth = 0) {
        let maxDepth = depth;
        
        if (node.type === 'ForStatement' || 
            node.type === 'WhileStatement' || 
            node.type === 'ForInStatement' ||
            node.type === 'ForOfStatement') {
            maxDepth = depth + 1;
        }

        for (const key of ['body', 'consequent', 'alternate']) {
            if (node[key] && typeof node[key] === 'object') {
                maxDepth = Math.max(
                    maxDepth,
                    this.countNestedLoops(node[key], depth + (node.type.includes('Statement') ? 1 : 0))
                );
            }
        }

        return maxDepth - depth;
    }

    estimatePerformance(analysis) {
        // Simplified performance estimation
        let score = 100;

        // Penalize high complexity
        score -= Math.max(0, (analysis.cyclomaticComplexity - 10) * 2);

        // Penalize many functions
        score -= Math.max(0, (analysis.functionCount - 10) * 1);

        // Penalize deep nesting
        score -= analysis.nodeCount > 1000 ? 10 : 0;

        return Math.max(0, Math.min(100, score));
    }

    suggestAlgorithmicImprovements(code) {
        const ast = this.ast.parse(code);
        const suggestions = [];

        // Look for common patterns that can be improved
        
        // Nested loops with potential for hash map
        const loops = this.ast.findByType(ast, 'ForStatement');
        for (const loop of loops) {
            if (this.hasNestedLoopSearch(loop)) {
                suggestions.push({
                    pattern: 'hash-map-optimization',
                    description: 'Nested loop search can be optimized with a hash map',
                    estimatedSpeedup: 'O(n²) → O(n)',
                    priority: 'high'
                });
            }
        }

        // Repeated sorting
        const sortCalls = this.ast.findByType(ast, 'CallExpression')
            .filter(c => c.callee?.property?.name === 'sort');
        
        if (sortCalls.length > 1) {
            suggestions.push({
                pattern: 'reduce-sorting',
                description: 'Multiple sort operations detected. Consider caching sorted results.',
                priority: 'medium'
            });
        }

        // Recursive functions without memoization
        const functions = this.ast.findByType(ast, 'FunctionDeclaration');
        for (const func of functions) {
            if (this.isRecursive(func) && !this.hasMemoization(func)) {
                suggestions.push({
                    pattern: 'add-memoization',
                    description: `Function ${func.id?.name || 'anonymous'} is recursive but not memoized`,
                    priority: 'medium'
                });
            }
        }

        return suggestions;
    }

    hasNestedLoopSearch(loop) {
        let hasSearch = false;
        
        this.ast.findByType(loop, 'ForStatement').forEach(innerLoop => {
            const body = innerLoop.body?.body || [];
            if (body.some(n => n.type === 'IfStatement')) {
                hasSearch = true;
            }
        });

        return hasSearch;
    }

    isRecursive(func) {
        const funcName = func.id?.name;
        if (!funcName) return false;

        let recursive = false;
        this.ast.findByType(func, 'CallExpression').forEach(call => {
            if (call.callee?.name === funcName) {
                recursive = true;
            }
        });

        return recursive;
    }

    hasMemoization(func) {
        const code = this.ast.generate(func);
        return code.includes('Cache') || 
               code.includes('memo') || 
               code.includes('memoize');
    }

    getOptimizationStats() {
        return {
            totalOptimizations: this.optimizationHistory.length,
            byRule: this.getImprovements(),
            historyLength: this.optimizationHistory.length
        };
    }
}
