/**
 * SINGULARITY - AST Manipulator Tests
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';

import { ASTManipulator } from '../src/ast/ast-manipulator.js';

describe('ASTManipulator', () => {
    let ast;

    before(() => {
        ast = new ASTManipulator();
    });

    describe('parse()', () => {
        it('should parse valid JavaScript code', () => {
            const code = 'const x = 42;';
            const result = ast.parse(code);
            assert.ok(result, 'Should return AST');
            assert.ok(result.type, 'Should have type');
        });

        it('should parse functions', () => {
            const code = 'function test(a, b) { return a + b; }';
            const result = ast.parse(code);
            assert.strictEqual(result.body[0].type, 'FunctionDeclaration');
        });

        it('should throw on invalid syntax', () => {
            assert.throws(() => {
                ast.parse('function { return; }');
            }, 'Should throw parse error');
        });
    });

    describe('generate()', () => {
        it('should generate code from AST', () => {
            const code = 'const x = 42;';
            const parsed = ast.parse(code);
            const generated = ast.generate(parsed);
            assert.ok(typeof generated === 'string');
            assert.ok(generated.includes('x'));
        });

        it('should handle complex code', () => {
            const code = `
                function fibonacci(n) {
                    if (n <= 1) return n;
                    return fibonacci(n - 1) + fibonacci(n - 2);
                }
            `;
            const parsed = ast.parse(code);
            const generated = ast.generate(parsed);
            assert.ok(generated.includes('fibonacci'));
        });
    });

    describe('analyze()', () => {
        it('should analyze code structure', () => {
            const code = `
                function test() { return 1; }
                class MyClass { constructor() {} }
            `;
            const parsed = ast.parse(code);
            const analysis = ast.analyze(parsed);
            
            assert.ok(analysis.nodeCount > 0, 'Should count nodes');
            assert.ok(analysis.functionCount >= 1, 'Should find functions');
            assert.ok(analysis.classCount >= 1, 'Should find classes');
        });

        it('should calculate complexity', () => {
            const code = `
                if (x) {
                    if (y) {
                        if (z) { return 1; }
                    }
                }
            `;
            const parsed = ast.parse(code);
            const analysis = ast.analyze(parsed);
            assert.ok(analysis.cyclomaticComplexity > 1);
        });
    });

    describe('findNodes()', () => {
        it('should find nodes by type', () => {
            const code = 'const a = 1; const b = 2;';
            const parsed = ast.parse(code);
            const vars = ast.findByType(parsed, 'VariableDeclaration');
            assert.strictEqual(vars.length, 2);
        });

        it('should find functions', () => {
            const code = `
                function foo() {}
                function bar() {}
            `;
            const parsed = ast.parse(code);
            const funcs = ast.findByType(parsed, 'FunctionDeclaration');
            assert.strictEqual(funcs.length, 2);
        });
    });

    describe('transform()', () => {
        it('should transform nodes', () => {
            const code = 'const x = 1;';
            const parsed = ast.parse(code);
            
            const transformed = ast.transform(parsed, [
                (node) => {
                    if (node.type === 'VariableDeclaration') {
                        return { ...node, kind: 'let' };
                    }
                    return node;
                }
            ]);
            
            assert.ok(transformed);
        });
    });

    describe('createNode()', () => {
        it('should create AST nodes', () => {
            const node = ast.createNode('Identifier', { name: 'test' });
            assert.strictEqual(node.type, 'Identifier');
            assert.strictEqual(node.name, 'test');
        });

        it('should create function nodes', () => {
            const func = ast.createFunction('add', ['a', 'b'], {
                type: 'BlockStatement',
                body: [{
                    type: 'ReturnStatement',
                    argument: {
                        type: 'BinaryExpression',
                        operator: '+',
                        left: { type: 'Identifier', name: 'a' },
                        right: { type: 'Identifier', name: 'b' }
                    }
                }]
            });
            
            assert.strictEqual(func.type, 'FunctionDeclaration');
            assert.strictEqual(func.id.name, 'add');
        });
    });

    describe('validateAST()', () => {
        it('should validate well-formed AST', () => {
            const code = 'const x = 42;';
            const parsed = ast.parse(code);
            const result = ast.validateAST(parsed);
            assert.strictEqual(result.valid, true);
        });

        it('should detect invalid AST', () => {
            const invalid = { type: 'Unknown' };
            const result = ast.validateAST(invalid);
            assert.strictEqual(result.valid, false);
        });
    });

    describe('suggestModifications()', () => {
        it('should suggest performance optimizations', () => {
            const code = `
                function test() {
                    for (let i = 0; i < 100; i++) {
                        console.log(i);
                    }
                }
            `;
            const parsed = ast.parse(code);
            const suggestions = ast.suggestModifications(parsed, 'optimize-performance');
            assert.ok(Array.isArray(suggestions));
        });

        it('should suggest bug fixes', () => {
            const code = 'if (x == null) { return; }';
            const parsed = ast.parse(code);
            const suggestions = ast.suggestModifications(parsed, 'fix-bugs');
            assert.ok(suggestions.some(s => s.type === 'bugfix'));
        });
    });
});
