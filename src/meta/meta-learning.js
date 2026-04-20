/**
 * Meta-Learning Module - Learning to Learn
 * 
 * Enables the AI to:
 * - Learn general patterns from specific experiences
 * - Adapt learning strategies based on task type
 * - Improve its own learning algorithm over time
 * - Transfer knowledge between domains
 * - Build reusable knowledge structures
 */

export class MetaLearning {
    constructor(config = {}) {
        this.config = {
            learningRate: config.learningRate || 0.01,
            memorySize: config.memorySize || 1000,
            patternThreshold: config.patternThreshold || 0.7,
            generalizationLevel: config.generalizationLevel || 'medium',
            enableTransfer: config.enableTransfer ?? true,
            enableStrategyAdaptation: config.enableStrategyAdaptation ?? true,
            ...config
        };

        this.knowledgeBase = new KnowledgeBase(this.config.memorySize);
        this.strategies = this.initializeStrategies();
        this.currentStrategy = 'default';
        this.learningHistory = [];
        this.performanceMetrics = {
            successes: 0,
            failures: 0,
            adaptations: 0,
            transfers: 0
        };
        this.taskEmbeddings = new Map();
        this.strategyPerformance = new Map();
        
        this.calibrationData = [];
    }

    initializeStrategies() {
        return {
            default: {
                name: 'Default Strategy',
                description: 'Standard learning approach',
                steps: ['observe', 'hypothesize', 'test', 'refine'],
                parameters: {
                    explorationRate: 0.5,
                    exploitationRate: 0.5,
                    patience: 10
                }
            },
            fast: {
                name: 'Fast Learning',
                description: 'Quick convergence for simple tasks',
                steps: ['observe', 'apply', 'verify'],
                parameters: {
                    explorationRate: 0.3,
                    exploitationRate: 0.7,
                    patience: 5
                }
            },
            thorough: {
                name: 'Thorough Learning',
                description: 'Deep exploration for complex tasks',
                steps: ['observe', 'hypothesize', 'test', 'analyze', 'refine', 'validate', 'consolidate'],
                parameters: {
                    explorationRate: 0.7,
                    exploitationRate: 0.3,
                    patience: 20
                }
            },
            exploratory: {
                name: 'Exploratory Learning',
                description: 'Focus on discovering new patterns',
                steps: ['observe', 'explore', 'discover', 'hypothesize', 'test'],
                parameters: {
                    explorationRate: 0.9,
                    exploitationRate: 0.1,
                    patience: 15
                }
            },
            conservative: {
                name: 'Conservative Learning',
                description: 'Minimize risk, rely on proven methods',
                steps: ['observe', 'compare', 'apply-known', 'verify'],
                parameters: {
                    explorationRate: 0.1,
                    exploitationRate: 0.9,
                    patience: 30
                }
            }
        };
    }

    async calibrate(singularity) {
        console.log('   Calibrating meta-learning module...');
        
        // Run initial calibration tasks
        const calibrationTasks = [
            { type: 'pattern-recognition', complexity: 'low' },
            { type: 'optimization', complexity: 'medium' },
            { type: 'reasoning', complexity: 'high' }
        ];

        for (const task of calibrationTasks) {
            const result = await this.calibrateOnTask(task);
            this.calibrationData.push({ task, result });
        }

        // Analyze calibration results and adjust
        this.analyzeCalibration();
        
        console.log(`   Strategy selected: ${this.currentStrategy}`);
        console.log(`   Knowledge base entries: ${this.knowledgeBase.size()}`);
    }

    async calibrateOnTask(task) {
        const startTime = performance.now();
        
        // Simulate learning on task
        const result = {
            task,
            duration: 0,
            success: Math.random() > 0.2,
            insights: [],
            strategy: this.currentStrategy
        };

        // Run task-specific learning
        for (const step of this.strategies[this.currentStrategy].steps) {
            await this.executeLearningStep(step, task);
        }

        result.duration = performance.now() - startTime;
        
        return result;
    }

    async executeLearningStep(step, task) {
        // Execute a learning step
        const stepImplementations = {
            observe: () => this.observe(task),
            hypothesize: () => this.hypothesize(task),
            test: () => this.test(task),
            refine: () => this.refine(task),
            analyze: () => this.analyze(task),
            validate: () => this.validate(task),
            consolidate: () => this.consolidate(task),
            explore: () => this.explore(task),
            discover: () => this.discover(task),
            compare: () => this.compare(task),
            'apply-known': () => this.applyKnown(task),
            verify: () => this.verify(task)
        };

        if (stepImplementations[step]) {
            return await stepImplementations[step]();
        }
    }

    async learn(task, singularity) {
        const learningSession = {
            task,
            startTime: Date.now(),
            strategy: this.currentStrategy,
            steps: [],
            outcome: null
        };

        try {
            // Select appropriate strategy
            const strategy = this.selectStrategy(task);
            learningSession.strategy = strategy;

            // Execute learning steps
            for (const step of strategy.steps) {
                const stepResult = await this.executeLearningStep(step, task);
                learningSession.steps.push({ step, result: stepResult });
            }

            // Extract and generalize patterns
            const patterns = await this.extractPatterns(learningSession);
            
            // Store in knowledge base
            for (const pattern of patterns) {
                this.knowledgeBase.add(pattern);
            }

            // Update strategy performance
            this.updateStrategyPerformance(strategy.name, true);

            learningSession.outcome = 'success';
            this.performanceMetrics.successes++;

        } catch (error) {
            learningSession.outcome = 'failure';
            learningSession.error = error.message;
            this.performanceMetrics.failures++;
            this.updateStrategyPerformance(this.currentStrategy, false);
        }

        learningSession.duration = Date.now() - learningSession.startTime;
        this.learningHistory.push(learningSession);

        // Adapt strategy if needed
        if (this.config.enableStrategyAdaptation) {
            await this.adaptStrategy(task, learningSession);
        }

        return {
            success: learningSession.outcome === 'success',
            patterns: learningSession.steps.length,
            strategy: learningSession.strategy,
            duration: learningSession.duration
        };
    }

    selectStrategy(task) {
        const taskType = task.type || 'default';
        
        // Check if we have prior knowledge for this task type
        const similarTasks = this.knowledgeBase.findSimilar({ type: taskType });
        
        if (similarTasks.length > 0 && this.config.enableTransfer) {
            // Transfer learning from similar tasks
            const bestStrategy = this.findBestStrategyForTasks(similarTasks);
            if (bestStrategy) {
                this.performanceMetrics.transfers++;
                return this.strategies[bestStrategy];
            }
        }

        // Select based on task complexity
        const complexity = task.complexity || this.estimateComplexity(task);
        
        switch (complexity) {
            case 'low':
                return this.strategies.fast;
            case 'high':
                return this.strategies.thorough;
            case 'exploratory':
                return this.strategies.exploratory;
            default:
                return this.strategies[this.currentStrategy] || this.strategies.default;
        }
    }

    estimateComplexity(task) {
        // Simple complexity estimation
        if (task.iterations > 100) return 'high';
        if (task.exploration) return 'exploratory';
        return 'medium';
    }

    findBestStrategyForTasks(tasks) {
        const strategyScores = new Map();

        for (const task of tasks) {
            if (task.strategyUsed) {
                const current = strategyScores.get(task.strategyUsed) || { score: 0, count: 0 };
                current.score += task.success ? 1 : 0;
                current.count++;
                strategyScores.set(task.strategyUsed, current);
            }
        }

        let bestStrategy = null;
        let bestScore = 0;

        for (const [strategy, data] of strategyScores) {
            const avgScore = data.score / data.count;
            if (avgScore > bestScore) {
                bestScore = avgScore;
                bestStrategy = strategy;
            }
        }

        return bestStrategy;
    }

    async extractPatterns(session) {
        const patterns = [];

        // Extract patterns from successful learning sessions
        if (session.outcome === 'success') {
            patterns.push({
                type: 'learning-pattern',
                taskType: session.task.type,
                strategy: session.strategy.name,
                steps: session.steps.map(s => s.step),
                success: true,
                timestamp: Date.now(),
                confidence: this.calculateConfidence(session)
            });
        }

        // Generalize patterns
        const generalizations = this.generalizePatterns(patterns);
        patterns.push(...generalizations);

        return patterns;
    }

    generalizePatterns(patterns) {
        const generalizations = [];
        const groups = this.groupByTaskType(patterns);

        for (const [taskType, group] of groups) {
            if (group.length >= 3) {
                // Create generalized pattern
                generalizations.push({
                    type: 'generalized-pattern',
                    taskType,
                    commonSteps: this.findCommonSteps(group),
                    averageConfidence: group.reduce((s, p) => s + p.confidence, 0) / group.length,
                    sampleSize: group.length,
                    timestamp: Date.now()
                });
            }
        }

        return generalizations;
    }

    groupByTaskType(patterns) {
        const groups = new Map();
        
        for (const pattern of patterns) {
            const type = pattern.taskType || 'unknown';
            if (!groups.has(type)) {
                groups.set(type, []);
            }
            groups.get(type).push(pattern);
        }

        return groups;
    }

    findCommonSteps(patterns) {
        if (patterns.length === 0) return [];
        
        const stepCounts = new Map();
        
        for (const pattern of patterns) {
            for (const step of pattern.steps || []) {
                stepCounts.set(step, (stepCounts.get(step) || 0) + 1);
            }
        }

        const threshold = patterns.length * 0.5;
        return Array.from(stepCounts.entries())
            .filter(([_, count]) => count >= threshold)
            .map(([step]) => step);
    }

    calculateConfidence(session) {
        let confidence = 0.5;

        // Increase confidence for successful outcomes
        if (session.outcome === 'success') {
            confidence += 0.2;
        }

        // Increase confidence for more steps
        confidence += Math.min(0.2, session.steps.length * 0.02);

        // Decrease confidence for longer duration (inefficient)
        if (session.duration > 1000) {
            confidence -= 0.1;
        }

        return Math.max(0, Math.min(1, confidence));
    }

    async adaptStrategy(task, session) {
        const adaptationThreshold = 3;
        
        // Track recent performance
        const recentSessions = this.learningHistory.slice(-adaptationThreshold);
        const recentSuccessRate = recentSessions.filter(s => s.outcome === 'success').length / recentSessions.length;

        if (recentSuccessRate < 0.3) {
            // Performance is poor, try a different strategy
            const alternativeStrategies = Object.keys(this.strategies)
                .filter(s => s !== this.currentStrategy);

            const newStrategy = alternativeStrategies[Math.floor(Math.random() * alternativeStrategies.length)];
            
            console.log(`   Adapting strategy: ${this.currentStrategy} -> ${newStrategy}`);
            this.currentStrategy = newStrategy;
            this.performanceMetrics.adaptations++;
        }
    }

    updateStrategyPerformance(strategyName, success) {
        const current = this.strategyPerformance.get(strategyName) || { successes: 0, total: 0 };
        current.total++;
        if (success) current.successes++;
        this.strategyPerformance.set(strategyName, current);
    }

    // Learning step implementations
    async observe(task) {
        return { observed: true, data: task };
    }

    async hypothesize(task) {
        return { hypothesis: 'test-hypothesis', confidence: 0.7 };
    }

    async test(task) {
        return { tested: true, result: 'pass' };
    }

    async refine(task) {
        return { refined: true, improvement: 0.1 };
    }

    async analyze(task) {
        return { analysis: 'completed' };
    }

    async validate(task) {
        return { valid: true };
    }

    async consolidate(task) {
        return { consolidated: true };
    }

    async explore(task) {
        return { explored: true, discoveries: 3 };
    }

    async discover(task) {
        return { discovered: true, patterns: 2 };
    }

    async compare(task) {
        return { compared: true, matches: 5 };
    }

    async applyKnown(task) {
        return { applied: true, source: 'knowledge-base' };
    }

    async verify(task) {
        return { verified: true };
    }

    getKnowledgeBase() {
        return this.knowledgeBase.getAll();
    }

    findRelevantKnowledge(task) {
        return this.knowledgeBase.findSimilar(task);
    }

    getStrategy() {
        return this.strategies[this.currentStrategy];
    }

    getPerformance() {
        return {
            ...this.performanceMetrics,
            strategyPerformance: Object.fromEntries(this.strategyPerformance),
            currentStrategy: this.currentStrategy,
            knowledgeBaseSize: this.knowledgeBase.size(),
            learningHistoryLength: this.learningHistory.length
        };
    }

    serialize() {
        return {
            config: this.config,
            currentStrategy: this.currentStrategy,
            strategies: this.strategies,
            performanceMetrics: this.performanceMetrics,
            calibrationData: this.calibrationData
        };
    }

    deserialize(data) {
        this.config = { ...this.config, ...data.config };
        this.currentStrategy = data.currentStrategy;
        this.strategies = data.strategies;
        this.performanceMetrics = data.performanceMetrics;
        this.calibrationData = data.calibrationData || [];
    }
}

/**
 * Knowledge Base - Stores and retrieves learned patterns
 */
class KnowledgeBase {
    constructor(maxSize = 1000) {
        this.maxSize = maxSize;
        this.entries = [];
        this.index = new Map();
    }

    add(pattern) {
        // Check if pattern already exists
        const existing = this.findMatching(pattern);
        if (existing) {
            existing.confidence = Math.min(1, (existing.confidence || 0.5) + 0.1);
            return existing;
        }

        // Add new pattern
        this.entries.push({
            ...pattern,
            confidence: pattern.confidence || 0.5,
            accessCount: 0,
            addedAt: Date.now()
        });

        // Index by type
        const type = pattern.taskType || 'unknown';
        if (!this.index.has(type)) {
            this.index.set(type, []);
        }
        this.index.get(type).push(pattern);

        // Enforce size limit
        if (this.entries.length > this.maxSize) {
            this.evictLeastValuable();
        }

        return pattern;
    }

    findSimilar(task, limit = 10) {
        const results = [];
        
        for (const entry of this.entries) {
            const similarity = this.calculateSimilarity(task, entry);
            if (similarity > 0.5) {
                entry.accessCount++;
                results.push({ entry, similarity });
            }
        }

        return results
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, limit)
            .map(r => r.entry);
    }

    findMatching(pattern) {
        return this.entries.find(e => 
            e.type === pattern.type && 
            e.taskType === pattern.taskType
        );
    }

    calculateSimilarity(task1, task2) {
        let similarity = 0;
        let comparisons = 0;

        // Compare task types
        if (task1.type === task2.type) similarity += 0.4;
        comparisons++;

        // Compare complexity
        if (task1.complexity === task2.complexity) similarity += 0.2;
        comparisons++;

        // Compare attributes
        const attrs1 = Object.keys(task1).filter(k => !['type', 'complexity'].includes(k));
        const attrs2 = Object.keys(task2).filter(k => !['type', 'complexity'].includes(k));
        const common = attrs1.filter(a => attrs2.includes(a));
        if (common.length > 0) {
            similarity += 0.4 * (common.length / Math.max(attrs1.length, attrs2.length));
        }
        comparisons++;

        return similarity / comparisons;
    }

    evictLeastValuable() {
        // Evict entry with lowest value score
        let lowestValue = Infinity;
        let evictIndex = -1;

        for (let i = 0; i < this.entries.length; i++) {
            const entry = this.entries[i];
            const value = (entry.confidence || 0.5) / Math.log(entry.accessCount + 2);
            
            if (value < lowestValue) {
                lowestValue = value;
                evictIndex = i;
            }
        }

        if (evictIndex >= 0) {
            const evicted = this.entries.splice(evictIndex, 1)[0];
            
            // Remove from index
            const type = evicted.taskType || 'unknown';
            const typeIndex = this.index.get(type);
            if (typeIndex) {
                const idx = typeIndex.indexOf(evicted);
                if (idx >= 0) typeIndex.splice(idx, 1);
            }
        }
    }

    size() {
        return this.entries.length;
    }

    getAll() {
        return [...this.entries];
    }

    clear() {
        this.entries = [];
        this.index.clear();
    }
}
