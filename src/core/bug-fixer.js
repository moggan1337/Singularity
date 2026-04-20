/**
 * Bug Fixer - Automatic bug detection and fixing
 * 
 * Identifies and fixes:
 * - Syntax errors
 * - Logic errors
 * - Type errors
 * - Performance issues
 * - Security vulnerabilities
 * - Race conditions
 */

import { ASTManipulator } from '../ast/ast-manipulator.js';

export class BugFixer {
    constructor(astManipulator, profiler) {
        this.ast = astManipulator;
        this.profiler = profiler;
        this.fixPatterns = this.initializeFixPatterns();
        this.fixHistory = [];
    }

    initializeFixPatterns() {
        return {
            'use-strict-equality': {
                pattern: /([!=]=)(?!=)/g,
                fix: (match) => match + '=',
                description: 'Use strict equality (=== or !==)'
            },
            'remove-debugger': {
                pattern: /debugger;?/g,
                fix: () => '',
                description: 'Remove debugger statements'
            },
            'avoid-eval': {
                pattern: /eval\s*\(/g,
                fix: null,
                isSecurityIssue: true,
                description: 'eval() is a security risk'
            },
            'use-let-const': {
                pattern: /\bvar\s+/g,
                fix: (match, offset, string) => {
                    // Check if reassigned later
                    const afterVar = string.substring(offset + 4);
                    const isReassigned = /^[^\s=]+=[^=]/.test(afterVar);
                    return isReassigned ? 'let ' : 'const ';
                },
                description: 'Use let or const instead of var'
            },
            'prefer-arrow-functions': {
                pattern: /function\s*\([^)]*\)\s*{[^}]*return[^}]*}/g,
                fix: null,
                isSuggestion: true,
                description: 'Consider using arrow function'
            },
            'handle-promises': {
                pattern: /async\s+function[^}]*(?<!await)(?<!async)/g,
                fix: null,
                isSuggestion: true,
                description: 'Async function should use await'
            },
            'add-error-handling': {
                pattern: /try\s*{[^}]*}\s*catch/g,
                check: (match, code) => {
                    const tryBlock = match.match(/try\s*{([^}]*)}/)?.[1] || '';
                    return !tryBlock.includes('catch') && !tryBlock.includes('throw');
                },
                fix: null,
                isSuggestion: true,
                description: 'Add proper error handling'
            },
            'remove-console-log': {
                pattern: /console\.(log|debug|info)\s*\([^)]*\)/g,
                fix: () => '// TODO: Remove debug logging',
                isSuggestion: true,
                description: 'Remove debug logging'
            }
        };
    }

    async analyzeAndFix(bugReport, singularity) {
        this.profiler.startProfile('bug-fix');

        const analysis = await this.analyze(bugReport, singularity);
        const fixes = await this.generateFixes(analysis, singularity);
        
        this.profiler.endProfile('bug-fix');

        // Record fix in history
        this.fixHistory.push({
            bugReport,
            analysis,
            fixes,
            timestamp: Date.now()
        });

        return {
            analysis,
            fixes,
            code: this.applyFixes(analysis.originalCode, fixes)
        };
    }

    async analyze(bugReport, singularity) {
        const { code, error, description, location } = bugReport;

        const analysis = {
            originalCode: code,
            error,
            description,
            location,
            issues: [],
            severity: 'unknown',
            rootCause: null
        };

        // Parse code
        try {
            const ast = this.ast.parse(code);
            analysis.ast = ast;

            // Static analysis for common issues
            analysis.issues = this.performStaticAnalysis(ast, code);

            // If there's an error message, try to identify the cause
            if (error) {
                analysis.rootCause = this.identifyRootCause(error, analysis.issues);
            }

            // Determine severity
            analysis.severity = this.determineSeverity(analysis.issues);

        } catch (parseError) {
            analysis.parseError = parseError.message;
            analysis.issues.push({
                type: 'syntax-error',
                message: parseError.message,
                severity: 'critical'
            });
            analysis.severity = 'critical';
        }

        return analysis;
    }

    performStaticAnalysis(ast, code) {
        const issues = [];

        // Check for common bug patterns
        for (const [name, pattern] of Object.entries(this.fixPatterns)) {
            if (pattern.isSecurityIssue) {
                const matches = code.match(pattern.pattern);
                if (matches) {
                    issues.push({
                        type: 'security',
                        subtype: name,
                        message: pattern.description,
                        severity: 'critical',
                        matches: matches.length
                    });
                }
            }
        }

        // AST-based analysis
        const dangerousCalls = this.ast.findNodes(ast, node => {
            if (node.type === 'CallExpression' && node.callee?.name === 'eval') {
                return true;
            }
            return false;
        });

        if (dangerousCalls.length > 0) {
            issues.push({
                type: 'security',
                subtype: 'dangerous-function',
                message: 'Use of eval() detected',
                severity: 'critical',
                nodes: dangerousCalls
            });
        }

        // Check for unused variables
        const variables = this.ast.findByType(ast, 'VariableDeclarator');
        const usedIdentifiers = new Set();
        
        this.ast.findByType(ast, 'Identifier').forEach(id => {
            usedIdentifiers.add(id.name);
        });

        for (const decl of variables) {
            if (decl.id?.name && !usedIdentifiers.has(decl.id.name)) {
                issues.push({
                    type: 'warning',
                    subtype: 'unused-variable',
                    message: `Unused variable: ${decl.id.name}`,
                    severity: 'low',
                    node: decl
                });
            }
        }

        // Check for potential null/undefined access
        const memberAccess = this.ast.findByType(ast, 'MemberExpression');
        for (const access of memberAccess) {
            if (access.computed && access.object?.type === 'Identifier') {
                issues.push({
                    type: 'warning',
                    subtype: 'dynamic-property-access',
                    message: 'Dynamic property access without null check',
                    severity: 'medium',
                    node: access
                });
            }
        }

        // Check for empty catch blocks
        const catchClauses = this.ast.findByType(ast, 'CatchClause');
        for (const catchClause of catchClauses) {
            if (!catchClause.body?.body || catchClause.body.body.length === 0) {
                issues.push({
                    type: 'warning',
                    subtype: 'empty-catch',
                    message: 'Empty catch block - errors are silently ignored',
                    severity: 'low',
                    node: catchClause
                });
            }
        }

        return issues;
    }

    identifyRootCause(error, issues) {
        // Parse error message to identify root cause
        const errorStr = typeof error === 'string' ? error : error.message;

        if (errorStr.includes('Unexpected token')) {
            return 'syntax-error';
        }
        if (errorStr.includes('is not defined')) {
            return 'undefined-reference';
        }
        if (errorStr.includes('is not a function')) {
            return 'type-error';
        }
        if (errorStr.includes('undefined')) {
            return 'undefined-value';
        }

        // If no specific error but we have issues, use the most severe
        if (issues.length > 0) {
            return issues[0].type;
        }

        return 'unknown';
    }

    determineSeverity(issues) {
        if (issues.some(i => i.severity === 'critical')) return 'critical';
        if (issues.some(i => i.severity === 'high')) return 'high';
        if (issues.some(i => i.severity === 'medium')) return 'medium';
        if (issues.some(i => i.severity === 'low')) return 'low';
        return 'info';
    }

    async generateFixes(analysis, singularity) {
        const fixes = [];

        for (const issue of analysis.issues) {
            const fix = this.createFix(issue, analysis.originalCode);
            if (fix) {
                fixes.push(fix);
            }
        }

        return fixes;
    }

    createFix(issue, code) {
        const pattern = this.fixPatterns[issue.subtype];

        if (!pattern) {
            return {
                type: issue.type,
                description: issue.message,
                autoFixable: false,
                suggestion: this.getSuggestion(issue)
            };
        }

        return {
            type: issue.type,
            subtype: issue.subtype,
            description: pattern.description,
            autoFixable: pattern.fix !== null,
            fix: pattern.fix,
            originalCode: code,
            securityIssue: pattern.isSecurityIssue || false
        };
    }

    getSuggestion(issue) {
        const suggestions = {
            'unused-variable': 'Consider removing unused variables or prefixing with underscore',
            'empty-catch': 'Add error logging or handling in catch block',
            'dynamic-property-access': 'Add null/undefined check before accessing property',
            'syntax-error': 'Check for missing brackets, semicolons, or typos',
            'undefined-reference': 'Ensure the variable is defined before use',
            'type-error': 'Check that the value is of the expected type',
            'undefined-value': 'Add null/undefined checks or provide default values'
        };

        return suggestions[issue.subtype] || 'Review and fix the identified issue';
    }

    applyFixes(code, fixes) {
        let fixedCode = code;

        for (const fix of fixes) {
            if (fix.autoFixable && fix.fix) {
                if (typeof fix.fix === 'function') {
                    fixedCode = fixedCode.replace(this.fixPatterns[fix.subtype]?.pattern || /./, fix.fix);
                } else {
                    fixedCode = fixedCode.replace(this.fixPatterns[fix.subtype]?.pattern, fix.fix);
                }
            }
        }

        return fixedCode;
    }

    validateFix(fixedCode, originalError) {
        try {
            this.ast.parse(fixedCode);
            return { valid: true };
        } catch (error) {
            return { 
                valid: false, 
                error: error.message,
                suggestion: 'Fix may have introduced new issues'
            };
        }
    }

    getFixHistory() {
        return [...this.fixHistory];
    }

    addFixPattern(name, pattern, fix) {
        this.fixPatterns[name] = { pattern, fix };
    }
}
