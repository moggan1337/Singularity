/**
 * SINGULARITY - Evolution Engine Tests
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';

import { EvolutionEngine } from '../src/evolution/evolution-engine.js';

describe('EvolutionEngine', () => {
    let engine;

    before(() => {
        engine = new EvolutionEngine(null);
    });

    after(() => {
        engine.reset();
    });

    describe('initializePopulation()', () => {
        it('should create initial population', () => {
            assert.ok(engine.population.length > 0, 'Should have population');
            assert.ok(engine.population.length <= engine.config.populationSize);
        });

        it('should have diverse candidate types', () => {
            const types = new Set(engine.population.map(c => c.type));
            assert.ok(types.size > 1, 'Should have multiple types');
        });
    });

    describe('generateCandidate()', () => {
        it('should generate valid candidates', () => {
            const candidate = engine.generateCandidate(0);
            
            assert.ok(candidate.id, 'Should have ID');
            assert.ok(candidate.type, 'Should have type');
            assert.ok(candidate.genes, 'Should have genes');
            assert.strictEqual(candidate.fitness, null);
        });

        it('should generate different types', () => {
            const typeCounts = {};
            for (let i = 0; i < 10; i++) {
                const candidate = engine.generateCandidate(i);
                typeCounts[candidate.type] = (typeCounts[candidate.type] || 0) + 1;
            }
            
            assert.ok(Object.keys(typeCounts).length > 1);
        });
    });

    describe('mutate()', () => {
        it('should mutate genes', () => {
            const original = engine.generateCandidate(0);
            original.genes = {
                learningRate: 0.5,
                threshold: 0.3,
                name: 'test'
            };
            
            const mutated = engine.mutate(original);
            
            assert.ok(mutated.genes, 'Should have genes');
            assert.notStrictEqual(mutated.id, original.id);
            assert.strictEqual(mutated.mutations, 1);
        });

        it('should preserve some gene values', () => {
            const original = engine.generateCandidate(0);
            original.genes = { value: 0.5 };
            
            const mutated = engine.mutate(original);
            
            // Some values should be similar or preserved
            assert.ok(typeof mutated.genes.value === 'number');
        });
    });

    describe('crossover()', () => {
        it('should combine parent genes', () => {
            const parent1 = engine.generateCandidate(0);
            parent1.genes = { a: 1, b: 2, c: 3 };
            
            const parent2 = engine.generateCandidate(1);
            parent2.genes = { a: 10, b: 20, d: 40 };
            
            const child = engine.crossover(parent1, parent2);
            
            assert.ok(child.genes, 'Child should have genes');
            assert.ok('a' in child.genes, 'Should have gene a');
        });
    });

    describe('selectParent()', () => {
        it('should select from population', () => {
            const parent = engine.selectParent();
            assert.ok(parent, 'Should return parent');
            assert.ok(parent.id, 'Should have ID');
        });
    });

    describe('calculateDiversity()', () => {
        it('should calculate population diversity', () => {
            const diversity = engine.calculateDiversity();
            assert.ok(typeof diversity === 'number');
            assert.ok(diversity >= 0);
        });
    });

    describe('getStatistics()', () => {
        it('should return valid statistics', () => {
            const stats = engine.getStatistics();
            
            assert.ok('generation' in stats);
            assert.ok('populationSize' in stats);
            assert.ok('bestFitness' in stats);
            assert.strictEqual(stats.generation, 0);
        });
    });

    describe('exportPopulation() / importPopulation()', () => {
        it('should export and import population', () => {
            const exported = engine.exportPopulation();
            
            assert.ok(exported.population, 'Should export population');
            assert.ok(exported.generation !== undefined);
            
            engine.importPopulation(exported);
            
            const stats = engine.getStatistics();
            assert.strictEqual(stats.generation, exported.generation);
        });
    });

    describe('reset()', () => {
        it('should reset engine state', () => {
            engine.generation = 10;
            engine.bestFitness = 100;
            
            engine.reset();
            
            assert.strictEqual(engine.generation, 0);
            assert.strictEqual(engine.bestFitness, -Infinity);
            assert.ok(engine.population.length > 0);
        });
    });
});
