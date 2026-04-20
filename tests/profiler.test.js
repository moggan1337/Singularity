/**
 * SINGULARITY - Profiler Tests
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';

import { SelfProfiler } from '../src/profiling/profiler.js';

describe('SelfProfiler', () => {
    let profiler;

    before(() => {
        profiler = new SelfProfiler({
            enableMemoryTracking: false,
            enableTimingTracking: true
        });
    });

    after(() => {
        profiler.reset();
    });

    describe('startProfile() / endProfile()', () => {
        it('should track profile duration', () => {
            profiler.startProfile('test-operation');
            
            // Simulate work
            let sum = 0;
            for (let i = 0; i < 1000; i++) sum += i;
            
            const result = profiler.endProfile('test-operation');
            
            assert.ok(result, 'Should return profile result');
            assert.ok(result.duration > 0, 'Should have duration');
            assert.strictEqual(result.name, 'test-operation');
        });

        it('should handle nested profiles', () => {
            profiler.startProfile('outer');
            profiler.startProfile('inner');
            
            // Simulate work
            let sum = 0;
            for (let i = 0; i < 100; i++) sum += i;
            
            profiler.endProfile('inner');
            profiler.endProfile('outer');
            
            const outer = profiler.getProfile('outer');
            assert.ok(outer, 'Should have outer profile');
        });
    });

    describe('checkpoint()', () => {
        it('should record checkpoints', () => {
            profiler.startProfile('checkpoint-test');
            const checkpoint = profiler.checkpoint('step1');
            
            assert.ok(checkpoint, 'Should return checkpoint');
            assert.strictEqual(checkpoint.name, 'step1');
            assert.ok(checkpoint.elapsed >= 0, 'Should have elapsed time');
            
            profiler.endProfile('checkpoint-test');
        });
    });

    describe('getMemoryUsage()', () => {
        it('should return memory stats', () => {
            const memory = profiler.getMemoryUsage();
            assert.ok(typeof memory === 'object');
            assert.ok('heapUsed' in memory);
            assert.ok('heapTotal' in memory);
        });
    });

    describe('findBottlenecks()', () => {
        it('should identify bottlenecks', () => {
            // Generate some profiles
            for (let i = 0; i < 10; i++) {
                profiler.startProfile(`slow-op-${i}`);
                // Simulate slow operation
                const start = Date.now();
                while (Date.now() - start < 10) {}
                profiler.endProfile(`slow-op-${i}`);
            }
            
            const bottlenecks = profiler.findBottlenecks();
            assert.ok(Array.isArray(bottlenecks));
        });
    });

    describe('getSummary()', () => {
        it('should return comprehensive summary', () => {
            const summary = profiler.getSummary();
            
            assert.ok(summary.metrics, 'Should have metrics');
            assert.ok(typeof summary.profileCount === 'number');
            assert.ok(Array.isArray(summary.topProfiles));
        });
    });

    describe('analyzeTrend()', () => {
        it('should analyze performance trends', () => {
            // Generate historical data
            for (let i = 0; i < 5; i++) {
                profiler.startProfile('trend-test');
                profiler.endProfile('trend-test');
            }
            
            const trend = profiler.analyzeTrend('trend-test', 'duration');
            assert.ok(trend, 'Should return trend analysis');
            assert.ok('values' in trend);
        });
    });

    describe('compareProfiles()', () => {
        it('should compare two profiles', () => {
            profiler.startProfile('compare-a');
            let sum = 0;
            for (let i = 0; i < 100; i++) sum += i;
            profiler.endProfile('compare-a');
            
            profiler.startProfile('compare-b');
            for (let i = 0; i < 1000; i++) sum += i;
            profiler.endProfile('compare-b');
            
            const comparison = profiler.compareProfiles('compare-a', 'compare-b');
            assert.ok(comparison, 'Should return comparison');
        });
    });

    describe('export() / import()', () => {
        it('should export and import profiler state', () => {
            profiler.startProfile('export-test');
            profiler.endProfile('export-test');
            
            const exported = profiler.export();
            assert.ok(exported.profiles, 'Should export profiles');
            
            const newProfiler = new SelfProfiler();
            newProfiler.import(exported);
            
            assert.ok(newProfiler.getProfile('export-test'));
        });
    });

    describe('generateReport()', () => {
        it('should generate text report', () => {
            profiler.startProfile('report-test');
            profiler.endProfile('report-test');
            
            const report = profiler.generateReport();
            assert.ok(typeof report === 'string');
            assert.ok(report.includes('PROFILING REPORT'));
        });
    });
});
