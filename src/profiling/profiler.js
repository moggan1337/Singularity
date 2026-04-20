/**
 * Self-Profiler - Built-in performance monitoring and profiling
 * 
 * Tracks execution time, memory usage, and identifies optimization opportunities.
 * Enables the AI to profile its own performance and find bottlenecks.
 */

export class SelfProfiler {
    constructor(config = {}) {
        this.config = {
            sampleRate: config.sampleRate || 100,
            maxHistory: config.maxHistory || 1000,
            enableMemoryTracking: config.enableMemoryTracking ?? true,
            enableTimingTracking: config.enableTimingTracking ?? true,
            ...config
        };

        this.profiles = new Map();
        this.currentProfile = null;
        this.startTimes = new Map();
        this.history = [];
        this.metrics = {
            totalExecutions: 0,
            totalTime: 0,
            averageTime: 0,
            fastestExecution: Infinity,
            slowestExecution: -Infinity,
            memorySnapshots: []
        };

        this.bottleneckThreshold = 0.1; // 10% of total time
    }

    startProfile(name) {
        const profile = {
            name,
            startTime: performance.now(),
            startMemory: this.getMemoryUsage(),
            checkpoints: [],
            status: 'running'
        };

        this.currentProfile = profile;
        this.startTimes.set(name, profile);

        return profile;
    }

    checkpoint(name) {
        if (!this.currentProfile || this.currentProfile.status !== 'running') {
            return null;
        }

        const checkpoint = {
            name,
            timestamp: performance.now(),
            memory: this.getMemoryUsage(),
            elapsed: performance.now() - this.currentProfile.startTime
        };

        this.currentProfile.checkpoints.push(checkpoint);
        return checkpoint;
    }

    endProfile(name) {
        const profile = this.startTimes.get(name) || this.currentProfile;
        
        if (!profile || profile.status !== 'running') {
            return null;
        }

        const endTime = performance.now();
        const duration = endTime - profile.startTime;
        const endMemory = this.getMemoryUsage();

        const completedProfile = {
            ...profile,
            endTime,
            duration,
            endMemory,
            memoryDelta: this.calculateMemoryDelta(profile.startMemory, endMemory),
            status: 'completed',
            checkpoints: profile.checkpoints.map((cp, i) => ({
                ...cp,
                duration: i === 0 
                    ? cp.elapsed 
                    : cp.elapsed - (profile.checkpoints[i - 1]?.elapsed || 0)
            }))
        };

        this.recordProfile(completedProfile);
        this.updateMetrics(duration);

        if (this.currentProfile === profile) {
            this.currentProfile = null;
        }

        return completedProfile;
    }

    recordProfile(profile) {
        const existing = this.profiles.get(profile.name);
        
        if (existing) {
            existing.history = existing.history || [];
            existing.history.push(profile);
            
            // Keep only recent history
            if (existing.history.length > this.config.maxHistory) {
                existing.history = existing.history.slice(-this.config.maxHistory);
            }
            
            // Update aggregated stats
            existing.totalExecutions = existing.history.length;
            existing.totalTime = existing.history.reduce((sum, p) => sum + p.duration, 0);
            existing.averageTime = existing.totalTime / existing.totalExecutions;
            existing.minTime = Math.min(...existing.history.map(p => p.duration));
            existing.maxTime = Math.max(...existing.history.map(p => p.duration));
            existing.lastExecution = profile;
        } else {
            this.profiles.set(profile.name, {
                name: profile.name,
                totalExecutions: 1,
                totalTime: profile.duration,
                averageTime: profile.duration,
                minTime: profile.duration,
                maxTime: profile.duration,
                lastExecution: profile,
                history: [profile]
            });
        }
    }

    updateMetrics(duration) {
        this.metrics.totalExecutions++;
        this.metrics.totalTime += duration;
        this.metrics.averageTime = this.metrics.totalTime / this.metrics.totalExecutions;
        this.metrics.fastestExecution = Math.min(this.metrics.fastestExecution, duration);
        this.metrics.slowestExecution = Math.max(this.metrics.slowestExecution, duration);

        if (this.config.enableMemoryTracking) {
            const memory = this.getMemoryUsage();
            this.metrics.memorySnapshots.push({
                timestamp: Date.now(),
                ...memory
            });

            // Keep memory history manageable
            if (this.metrics.memorySnapshots.length > this.config.maxHistory) {
                this.metrics.memorySnapshots = this.metrics.memorySnapshots.slice(-this.config.maxHistory);
            }
        }
    }

    getMemoryUsage() {
        if (!this.config.enableMemoryTracking) {
            return { used: 0, total: 0, percentage: 0 };
        }

        try {
            if (global.gc) {
                global.gc();
            }

            // Note: In production, you'd use actual memory tracking
            // For Node.js, process.memoryUsage() provides heap data
            const usage = process.memoryUsage?.() || {};
            
            return {
                heapUsed: usage.heapUsed || 0,
                heapTotal: usage.heapTotal || 0,
                external: usage.external || 0,
                rss: usage.rss || 0,
                percentage: usage.heapUsed && usage.heapTotal 
                    ? (usage.heapUsed / usage.heapTotal * 100).toFixed(2)
                    : 0
            };
        } catch {
            return { used: 0, total: 0, percentage: 0 };
        }
    }

    async profileIteration(singularity) {
        this.startProfile('iteration-profile');

        // Profile different aspects
        await this.profileModule(singularity, 'astManipulator');
        await this.profileModule(singularity, 'evolution');
        await this.profileModule(singularity, 'safety');
        await this.profileModule(singularity, 'metaLearning');
        await this.profileModule(singularity, 'optimizer');

        const result = this.endProfile('iteration-profile');
        
        this.history.push({
            iteration: singularity.state.iteration,
            profile: result,
            timestamp: Date.now()
        });

        return result;
    }

    async profileModule(singularity, moduleName) {
        const module = singularity.modules[moduleName];
        if (!module) return null;

        this.startProfile(`module-${moduleName}`);

        try {
            // Call common module methods
            if (typeof module.analyze === 'function') {
                await module.analyze();
            }
            if (typeof module.getMetrics === 'function') {
                await module.getMetrics();
            }
        } catch (e) {
            // Module-specific profiling might fail, continue
        }

        return this.endProfile(`module-${moduleName}`);
    }

    findBottlenecks() {
        const bottlenecks = [];
        const totalTime = this.metrics.totalTime;

        if (totalTime === 0) return bottlenecks;

        for (const [name, profile] of this.profiles) {
            const percentage = profile.totalTime / totalTime;
            
            if (percentage >= this.bottleneckThreshold) {
                bottlenecks.push({
                    name,
                    percentage: (percentage * 100).toFixed(2),
                    totalTime: profile.totalTime,
                    averageTime: profile.averageTime,
                    executions: profile.totalExecutions,
                    severity: percentage >= 0.3 ? 'high' : 'medium',
                    suggestions: this.getOptimizationSuggestions(profile)
                });
            }
        }

        // Sort by percentage descending
        bottlenecks.sort((a, b) => parseFloat(b.percentage) - parseFloat(a.percentage));

        return bottlenecks;
    }

    getOptimizationSuggestions(profile) {
        const suggestions = [];
        const avgTime = profile.averageTime;

        if (avgTime > 1000) {
            suggestions.push('Consider breaking this operation into smaller chunks');
        }

        if (profile.maxTime > avgTime * 3) {
            suggestions.push('High variance detected - investigate outliers');
        }

        if (profile.totalExecutions > 100) {
            suggestions.push('Consider caching or memoization');
        }

        suggestions.push('Review algorithm complexity');
        suggestions.push('Profile sub-operations for more granular optimization');

        return suggestions;
    }

    getProfile(name) {
        return this.profiles.get(name);
    }

    getAllProfiles() {
        return Array.from(this.profiles.values());
    }

    getSummary() {
        return {
            metrics: this.metrics,
            profileCount: this.profiles.size,
            bottlenecks: this.findBottlenecks(),
            topProfiles: this.getTopProfiles(5)
        };
    }

    getTopProfiles(limit = 5) {
        return this.getAllProfiles()
            .sort((a, b) => b.totalTime - a.totalTime)
            .slice(0, limit)
            .map(p => ({
                name: p.name,
                totalTime: p.totalTime.toFixed(2),
                averageTime: p.averageTime.toFixed(2),
                executions: p.totalExecutions
            }));
    }

    compareProfiles(name1, name2) {
        const p1 = this.profiles.get(name1);
        const p2 = this.profiles.get(name2);

        if (!p1 || !p2) return null;

        return {
            name1: { ...p1 },
            name2: { ...p2 },
            comparison: {
                fasterBy: ((p2.averageTime - p1.averageTime) / p1.averageTime * 100).toFixed(2) + '%',
                speedup: (p2.averageTime / p1.averageTime).toFixed(2) + 'x'
            }
        };
    }

    analyzeTrend(name, metric = 'duration') {
        const profile = this.profiles.get(name);
        if (!profile || !profile.history) return null;

        const values = profile.history.map(p => p[metric] || 0);
        const trend = this.calculateTrend(values);

        return {
            name,
            metric,
            values,
            trend,
            average: values.reduce((a, b) => a + b, 0) / values.length,
            min: Math.min(...values),
            max: Math.max(...values),
            variance: this.calculateVariance(values)
        };
    }

    calculateTrend(values) {
        if (values.length < 2) return 'insufficient-data';

        const n = values.length;
        const sumX = values.reduce((_, __, i) => _ + i, 0);
        const sumY = values.reduce((a, b) => a + b, 0);
        const sumXY = values.reduce((a, b, i) => a + b * i, 0);
        const sumX2 = values.reduce((a, _, i) => a + i * i, 0);

        const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

        if (Math.abs(slope) < 0.01) return 'stable';
        return slope > 0 ? 'increasing' : 'decreasing';
    }

    calculateVariance(values) {
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
        return squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
    }

    reset() {
        this.profiles.clear();
        this.history = [];
        this.startTimes.clear();
        this.currentProfile = null;
        this.metrics = {
            totalExecutions: 0,
            totalTime: 0,
            averageTime: 0,
            fastestExecution: Infinity,
            slowestExecution: -Infinity,
            memorySnapshots: []
        };
    }

    calculateMemoryDelta(start, end) {
        return {
            heapUsed: end.heapUsed - start.heapUsed,
            heapTotal: end.heapTotal - start.heapTotal,
            external: end.external - start.external,
            rss: end.rss - start.rss
        };
    }

    generateReport() {
        const summary = this.getSummary();
        
        let report = '\n';
        report += '═══════════════════════════════════════════════════════\n';
        report += '              SINGULARITY PROFILING REPORT               \n';
        report += '═══════════════════════════════════════════════════════\n\n';

        report += '📊 EXECUTION METRICS\n';
        report += '───────────────────────────────────────────────────────\n';
        report += `   Total Executions:  ${summary.metrics.totalExecutions}\n`;
        report += `   Total Time:       ${summary.metrics.totalTime.toFixed(2)}ms\n`;
        report += `   Average Time:     ${summary.metrics.averageTime.toFixed(2)}ms\n`;
        report += `   Fastest:          ${summary.metrics.fastestExecution.toFixed(2)}ms\n`;
        report += `   Slowest:          ${summary.metrics.slowestExecution.toFixed(2)}ms\n\n`;

        if (summary.bottlenecks.length > 0) {
            report += '⚠️  BOTTLENECKS DETECTED\n';
            report += '───────────────────────────────────────────────────────\n';
            for (const b of summary.bottlenecks) {
                report += `   ${b.name}\n`;
                report += `      Impact: ${b.percentage}% | Severity: ${b.severity}\n`;
                report += `      Avg: ${b.averageTime.toFixed(2)}ms | Executions: ${b.executions}\n`;
            }
            report += '\n';
        }

        report += '🏆 TOP PROFILES\n';
        report += '───────────────────────────────────────────────────────\n';
        for (const p of summary.topProfiles) {
            report += `   ${p.name}\n`;
            report += `      Total: ${p.totalTime}ms | Avg: ${p.averageTime}ms | Runs: ${p.executions}\n`;
        }
        report += '\n';

        report += '═══════════════════════════════════════════════════════\n';

        return report;
    }

    export() {
        return {
            profiles: Object.fromEntries(this.profiles),
            history: this.history,
            metrics: this.metrics,
            config: this.config
        };
    }

    import(data) {
        this.profiles = new Map(Object.entries(data.profiles || {}));
        this.history = data.history || [];
        this.metrics = data.metrics || this.metrics;
        this.config = { ...this.config, ...data.config };
    }
}
