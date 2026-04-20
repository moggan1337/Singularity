/**
 * Evolution Engine - Evolutionary algorithm for self-improvement
 * 
 * Implements genetic algorithms and evolutionary strategies for:
 * - Generating candidate improvements
 * - Evaluating fitness of candidates
 * - Selection and reproduction
 * - Mutation and crossover
 * - Population management
 */

export class EvolutionEngine {
    constructor(singularity) {
        this.singularity = singularity;
        
        this.config = {
            populationSize: 50,
            eliteCount: 5,
            mutationRate: 0.1,
            crossoverRate: 0.7,
            generations: 100,
            tournamentSize: 3,
            keepBest: true,
            diversityThreshold: 0.1,
            ...singularity?.config?.evolutionConfig
        };

        this.population = [];
        this.generation = 0;
        this.bestFitness = -Infinity;
        this.bestCandidate = null;
        this.history = [];
        this.fitnessCache = new Map();
        
        this.initializePopulation();
    }

    initializePopulation() {
        this.population = [];
        
        // Create initial population with diverse strategies
        for (let i = 0; i < this.config.populationSize; i++) {
            const candidate = this.generateCandidate(i);
            this.population.push(candidate);
        }
    }

    generateCandidate(index) {
        const candidateTypes = [
            'parameter-tuning',
            'algorithm-replacement',
            'code-optimization',
            'structural-change',
            'heuristic-modification'
        ];

        const type = candidateTypes[index % candidateTypes.length];

        return {
            id: `candidate-${this.generation}-${index}`,
            type,
            genes: this.generateGenes(type),
            fitness: null,
            age: 0,
            mutations: 0,
            parent: null
        };
    }

    generateGenes(type) {
        switch (type) {
            case 'parameter-tuning':
                return {
                    learningRate: Math.random() * 0.5 + 0.01,
                    threshold: Math.random() * 0.5 + 0.1,
                    iterations: Math.floor(Math.random() * 100) + 10,
                    decay: Math.random() * 0.1,
                    momentum: Math.random() * 0.9
                };

            case 'algorithm-replacement':
                return {
                    algorithmType: ['greedy', 'dynamic', 'heuristic', 'exact'][Math.floor(Math.random() * 4)],
                    strategy: ['first-best', 'best-first', 'random'][Math.floor(Math.random() * 3)],
                    lookahead: Math.floor(Math.random() * 5) + 1
                };

            case 'code-optimization':
                return {
                    optimizationLevel: Math.floor(Math.random() * 4),
                    inlineThreshold: Math.random() * 0.5 + 0.5,
                    loopUnrollFactor: Math.floor(Math.random() * 4) + 1,
                    cacheSize: Math.floor(Math.random() * 1024) + 256
                };

            case 'structural-change':
                return {
                    maxDepth: Math.floor(Math.random() * 10) + 3,
                    branchFactor: Math.random() * 2 + 1,
                    useMemoization: Math.random() > 0.5,
                    useLazyEvaluation: Math.random() > 0.5
                };

            case 'heuristic-modification':
                return {
                    explorationRate: Math.random(),
                    exploitationRate: Math.random(),
                    temperature: Math.random() * 100 + 1,
                    epsilon: Math.random() * 0.2
                };

            default:
                return {};
        }
    }

    async generateCandidates(singularity) {
        const candidates = [];
        
        // Generate mutation-based candidates
        for (let i = 0; i < this.config.populationSize * 0.4; i++) {
            const parent = this.selectParent();
            const mutated = this.mutate(parent);
            candidates.push(mutated);
        }

        // Generate crossover-based candidates
        for (let i = 0; i < this.config.populationSize * 0.3; i++) {
            const parent1 = this.selectParent();
            const parent2 = this.selectParent();
            const crossed = this.crossover(parent1, parent2);
            candidates.push(crossed);
        }

        // Generate novel candidates
        for (let i = 0; i < this.config.populationSize * 0.3; i++) {
            candidates.push(this.generateCandidate(this.generation * 100 + i));
        }

        this.population = candidates;
        return candidates;
    }

    mutate(candidate) {
        const mutated = {
            ...candidate,
            id: `${candidate.id}-m${candidate.mutations + 1}`,
            genes: { ...candidate.genes },
            parent: candidate.id,
            mutations: candidate.mutations + 1
        };

        // Mutate each gene with probability
        for (const [key, value] of Object.entries(mutated.genes)) {
            if (Math.random() < this.config.mutationRate) {
                mutated.genes[key] = this.mutateGene(value);
            }
        }

        return mutated;
    }

    mutateGene(value) {
        const type = typeof value;

        switch (type) {
            case 'number':
                // Gaussian mutation
                const sigma = 0.1 * Math.abs(value);
                return value + this.gaussianRandom() * sigma;

            case 'string':
                // Random selection from alternatives
                const options = ['greedy', 'dynamic', 'heuristic', 'exact', 'first-best', 'best-first', 'random'];
                return options[Math.floor(Math.random() * options.length)];

            case 'boolean':
                return !value;

            default:
                return value;
        }
    }

    gaussianRandom() {
        let u = 0, v = 0;
        while (u === 0) u = Math.random();
        while (v === 0) v = Math.random();
        return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    }

    crossover(parent1, parent2) {
        if (Math.random() > this.config.crossoverRate) {
            return Math.random() > 0.5 ? this.mutate(parent1) : this.mutate(parent2);
        }

        const child = {
            id: `${parent1.id}-x-${parent2.id}`,
            type: Math.random() > 0.5 ? parent1.type : parent2.type,
            genes: { ...parent1.genes },
            parent: parent1.id,
            mutations: 0
        };

        // Uniform crossover
        for (const key of Object.keys(parent2.genes)) {
            if (Math.random() > 0.5) {
                child.genes[key] = parent2.genes[key];
            }
        }

        return child;
    }

    selectParent() {
        // Tournament selection
        const tournament = [];
        const indices = new Set();
        
        while (tournament.length < this.config.tournamentSize) {
            const idx = Math.floor(Math.random() * this.population.length);
            if (!indices.has(idx)) {
                indices.add(idx);
                tournament.push(this.population[idx]);
            }
        }

        // Return the best from tournament
        return tournament.sort((a, b) => (b.fitness || 0) - (a.fitness || 0))[0];
    }

    async evaluateCandidates(candidates, targetMetric = 'performance') {
        const fitnessScores = [];

        for (const candidate of candidates) {
            const fitness = await this.evaluateFitness(candidate, targetMetric);
            candidate.fitness = fitness;
            fitnessScores.push({ candidate, fitness });
        }

        // Sort by fitness
        fitnessScores.sort((a, b) => b.fitness - a.fitness);

        // Update best
        if (fitnessScores[0]?.fitness > this.bestFitness) {
            this.bestFitness = fitnessScores[0].fitness;
            this.bestCandidate = fitnessScores[0].candidate;
        }

        return fitnessScores;
    }

    async evaluateFitness(candidate, targetMetric) {
        // Check cache
        const cacheKey = this.getCacheKey(candidate);
        if (this.fitnessCache.has(cacheKey)) {
            return this.fitnessCache.get(cacheKey);
        }

        let fitness = 0;

        switch (targetMetric) {
            case 'performance':
                fitness = await this.evaluatePerformance(candidate);
                break;
            case 'efficiency':
                fitness = await this.evaluateEfficiency(candidate);
                break;
            case 'accuracy':
                fitness = await this.evaluateAccuracy(candidate);
                break;
            case 'combined':
                fitness = (
                    await this.evaluatePerformance(candidate) * 0.4 +
                    await this.evaluateEfficiency(candidate) * 0.3 +
                    await this.evaluateAccuracy(candidate) * 0.3
                );
                break;
            default:
                fitness = Math.random();
        }

        // Age penalty - older candidates should show improvement
        fitness -= candidate.age * 0.01;

        // Penalize excessive mutations
        if (candidate.mutations > 20) {
            fitness *= 0.9;
        }

        // Cache the result
        this.fitnessCache.set(cacheKey, fitness);

        return fitness;
    }

    async evaluatePerformance(candidate) {
        // Simulate performance evaluation
        // In real implementation, this would run actual benchmarks
        
        const basePerformance = 100;
        const geneImpact = Object.values(candidate.genes).reduce((acc, val) => {
            if (typeof val === 'number') {
                return acc + (1 - val) * 0.1;
            }
            return acc;
        }, 0);

        // Add some noise
        const noise = (Math.random() - 0.5) * 10;

        return basePerformance - geneImpact * 10 + noise;
    }

    async evaluateEfficiency(candidate) {
        // Evaluate resource efficiency
        let efficiency = 100;

        if (candidate.genes.cacheSize) {
            efficiency += Math.log(candidate.genes.cacheSize) * 5;
        }

        if (candidate.genes.useMemoization) {
            efficiency += 20;
        }

        if (candidate.genes.useLazyEvaluation) {
            efficiency += 15;
        }

        return efficiency + (Math.random() - 0.5) * 5;
    }

    async evaluateAccuracy(candidate) {
        // Evaluate decision-making accuracy
        let accuracy = 70;

        if (candidate.genes.explorationRate !== undefined) {
            accuracy += candidate.genes.explorationRate * 20;
        }

        if (candidate.genes.algorithmType === 'exact') {
            accuracy += 15;
        } else if (candidate.genes.algorithmType === 'heuristic') {
            accuracy += 5;
        }

        return Math.min(100, accuracy) + (Math.random() - 0.5) * 5;
    }

    getCacheKey(candidate) {
        return JSON.stringify({
            genes: candidate.genes,
            type: candidate.type
        });
    }

    async selectBest(candidates, fitnessScores) {
        // Elitism: Keep the best candidates
        const elite = fitnessScores.slice(0, this.config.eliteCount);
        
        // Check if best is better than current
        if (elite[0] && elite[0].fitness > this.bestFitness) {
            this.bestFitness = elite[0].fitness;
            this.bestCandidate = elite[0].candidate;
        }

        // Record history
        this.history.push({
            generation: this.generation,
            bestFitness: this.bestFitness,
            averageFitness: fitnessScores.reduce((s, f) => s + f.fitness, 0) / fitnessScores.length,
            populationDiversity: this.calculateDiversity()
        });

        // Age the population
        for (const c of candidates) {
            c.age++;
        }

        this.generation++;

        return elite[0]?.candidate || null;
    }

    calculateDiversity() {
        if (this.population.length < 2) return 0;

        let totalDifference = 0;
        let comparisons = 0;

        for (let i = 0; i < this.population.length; i++) {
            for (let j = i + 1; j < this.population.length; j++) {
                totalDifference += this.geneDifference(this.population[i], this.population[j]);
                comparisons++;
            }
        }

        return totalDifference / comparisons;
    }

    geneDifference(c1, c2) {
        let diff = 0;
        const keys = new Set([...Object.keys(c1.genes), ...Object.keys(c2.genes)]);

        for (const key of keys) {
            const v1 = c1.genes[key];
            const v2 = c2.genes[key];

            if (typeof v1 === 'number' && typeof v2 === 'number') {
                diff += Math.abs(v1 - v2);
            } else if (v1 !== v2) {
                diff += 1;
            }
        }

        return diff / keys.size;
    }

    getImprovement() {
        if (!this.bestCandidate) return null;

        return {
            type: 'parameter' in this.bestCandidate.genes ? 'parameter' : 'algorithm',
            description: `Evolved ${this.bestCandidate.type} with fitness ${this.bestFitness.toFixed(2)}`,
            candidate: this.bestCandidate,
            genes: this.bestCandidate.genes,
            metric: this.bestFitness
        };
    }

    evolveUntil(targetFitness, maxGenerations = 1000) {
        return new Promise(async (resolve) => {
            for (let i = 0; i < maxGenerations; i++) {
                await this.generateCandidates(this.singularity);
                const scores = await this.evaluateCandidates(this.population);
                await this.selectBest(this.population, scores);

                if (this.bestFitness >= targetFitness) {
                    resolve({
                        success: true,
                        generations: i,
                        bestFitness: this.bestFitness,
                        bestCandidate: this.bestCandidate
                    });
                    return;
                }
            }

            resolve({
                success: false,
                generations: maxGenerations,
                bestFitness: this.bestFitness,
                bestCandidate: this.bestCandidate
            });
        });
    }

    getStatistics() {
        return {
            generation: this.generation,
            populationSize: this.population.length,
            bestFitness: this.bestFitness,
            averageFitness: this.history.length > 0 
                ? this.history[this.history.length - 1].averageFitness 
                : 0,
            diversity: this.calculateDiversity(),
            historyLength: this.history.length,
            cacheSize: this.fitnessCache.size
        };
    }

    exportPopulation() {
        return {
            population: this.population,
            generation: this.generation,
            bestFitness: this.bestFitness,
            bestCandidate: this.bestCandidate,
            history: this.history
        };
    }

    importPopulation(data) {
        this.population = data.population;
        this.generation = data.generation;
        this.bestFitness = data.bestFitness;
        this.bestCandidate = data.bestCandidate;
        this.history = data.history || [];
    }

    reset() {
        this.generation = 0;
        this.bestFitness = -Infinity;
        this.bestCandidate = null;
        this.history = [];
        this.fitnessCache.clear();
        this.initializePopulation();
    }
}
