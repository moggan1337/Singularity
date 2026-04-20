/**
 * SINGULARITY - Safety Monitor Tests
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';

import { SafetyMonitor } from '../src/safety/safety-monitor.js';

describe('SafetyMonitor', () => {
    let monitor;

    before(() => {
        monitor = new SafetyMonitor('strict');
    });

    after(() => {
        monitor.clearCheckpoints();
        monitor.clearAuditLog();
    });

    describe('constructor()', () => {
        it('should initialize with default strict config', () => {
            assert.strictEqual(monitor.level, 'strict');
            assert.ok(monitor.config.maxRollbacks > 0);
            assert.strictEqual(monitor.config.allowFileSystemAccess, false);
        });

        it('should accept custom level', () => {
            const permissive = new SafetyMonitor('permissive');
            assert.strictEqual(permissive.level, 'permissive');
        });
    });

    describe('validateChange()', () => {
        it('should validate null change', async () => {
            const result = await monitor.validateChange(null);
            assert.strictEqual(result.valid, false);
        });

        it('should validate change without type', async () => {
            const result = await monitor.validateChange({});
            assert.strictEqual(result.valid, false);
        });

        it('should validate code change with code', async () => {
            const change = {
                type: 'code',
                code: 'const x = 1;'
            };
            const result = await monitor.validateChange(change);
            assert.strictEqual(result.valid, true);
        });

        it('should reject code with forbidden patterns', async () => {
            const change = {
                type: 'code',
                code: 'eval("dangerous")'
            };
            const result = await monitor.validateChange(change);
            assert.strictEqual(result.valid, false);
        });

        it('should reject parameter change without path', async () => {
            const change = {
                type: 'parameter',
                value: 42
            };
            const result = await monitor.validateChange(change);
            assert.strictEqual(result.valid, false);
        });

        it('should validate algorithm change', async () => {
            const change = {
                type: 'algorithm',
                name: 'testAlgo',
                algorithm: () => {}
            };
            const result = await monitor.validateChange(change);
            assert.strictEqual(result.valid, true);
        });
    });

    describe('validateCodeSafety()', () => {
        it('should allow safe code', () => {
            const change = {
                type: 'code',
                code: 'function add(a, b) { return a + b; }'
            };
            const result = monitor.validateCodeSafety(change);
            assert.strictEqual(result.valid, true);
        });

        it('should reject eval', () => {
            const change = {
                type: 'code',
                code: 'eval("alert(1)")'
            };
            const result = monitor.validateCodeSafety(change);
            assert.strictEqual(result.valid, false);
        });

        it('should reject process.exit', () => {
            const change = {
                type: 'code',
                code: 'process.exit(0)'
            };
            const result = monitor.validateCodeSafety(change);
            assert.strictEqual(result.valid, false);
        });

        it('should reject fs require', () => {
            const change = {
                type: 'code',
                code: 'const fs = require("fs")'
            };
            const result = monitor.validateCodeSafety(change);
            assert.strictEqual(result.valid, false);
        });
    });

    describe('checkpoints', () => {
        it('should create checkpoints', async () => {
            const mockSingularity = {
                state: {
                    iteration: 1,
                    version: '1.0.0',
                    capabilities: new Set(['test'])
                },
                modules: {},
                quine: { getCurrentSource: () => 'test code' }
            };

            const checkpoint = await monitor.createCheckpoint(mockSingularity);
            
            assert.ok(checkpoint.id);
            assert.ok(checkpoint.timestamp);
            assert.strictEqual(checkpoint.iteration, 1);
            
            const checkpoints = monitor.getCheckpoints();
            assert.ok(checkpoints.length > 0);
        });
    });

    describe('audit logging', () => {
        it('should log audit events', async () => {
            await monitor.logAudit('test_event', { data: 'test' });
            
            const logs = monitor.getAuditLog();
            assert.ok(logs.some(l => l.event === 'test_event'));
        });

        it('should filter audit logs', async () => {
            await monitor.logAudit('filter_test', { data: 1 });
            
            const filtered = monitor.getAuditLog({ event: 'filter_test' });
            assert.ok(filtered.every(l => l.event === 'filter_test'));
        });
    });

    describe('getStats()', () => {
        it('should return statistics', () => {
            const stats = monitor.getStats();
            
            assert.ok('totalValidations' in stats);
            assert.ok('passedValidations' in stats);
            assert.ok('failedValidations' in stats);
            assert.ok('totalRollbacks' in stats);
        });
    });

    describe('setLevel()', () => {
        it('should change safety level', () => {
            monitor.setLevel('moderate');
            assert.strictEqual(monitor.level, 'moderate');
        });
    });

    describe('addForbiddenPattern()', () => {
        it('should add custom forbidden pattern', () => {
            const initialCount = monitor.config.forbiddenPatterns.length;
            monitor.addForbiddenPattern(/custom_danger/);
            assert.ok(monitor.config.forbiddenPatterns.length > initialCount);
        });
    });

    describe('testChange()', () => {
        it('should test code change', async () => {
            const change = {
                type: 'code',
                code: 'const x = 1 + 2;'
            };
            
            const result = await monitor.testChange(change);
            assert.ok(typeof result === 'object');
        });
    });

    describe('export() / import()', () => {
        it('should export and import', () => {
            const exported = monitor.export();
            
            assert.ok(exported.level);
            assert.ok(exported.config);
            assert.ok(exported.stats);
            
            const newMonitor = new SafetyMonitor();
            newMonitor.import(exported);
            
            assert.strictEqual(newMonitor.level, exported.level);
        });
    });
});
