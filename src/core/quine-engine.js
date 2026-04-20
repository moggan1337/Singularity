/**
 * Quine Engine - Quine-like self-replication
 * 
 * Enables the AI to:
 * - Generate executable copies of itself
 * - Verify integrity of self-replication
 * - Track lineage of modifications
 * - Maintain evolutionary history
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export class QuineEngine {
    constructor() {
        this.currentSource = null;
        this.lineage = [];
        this.checksums = new Map();
        this.replicationCount = 0;
    }

    /**
     * Generate a quine - a program that outputs its own source code
     * This is a simplified quine that reads its own file
     */
    generateQuine() {
        // For a true quine in JavaScript, we use the __file__ equivalent
        const quineTemplate = `/**
 * SINGULARITY Self-Replication Unit
 * Generated: ${new Date().toISOString()}
 * Version: 1.0.0
 */

const fs = require('fs');
const path = require('path');

// Read own source code
const currentFile = process.argv[1] || __filename;
const source = fs.readFileSync(currentFile, 'utf8');

console.log(source);
`;

        return quineTemplate;
    }

    /**
     * Generate full executable copy of the system
     */
    generateExecutableCopy(singularity) {
        const sourceFiles = this.collectSourceFiles();
        const manifest = this.createManifest(sourceFiles);
        
        const bootstrapScript = this.generateBootstrapScript(singularity);
        
        const fullPackage = {
            manifest,
            files: sourceFiles,
            bootstrap: bootstrapScript,
            metadata: {
                generated: Date.now(),
                parent: this.checksums.get('current') || 'genesis',
                version: this.getNextVersion(),
                lineage: this.lineage.slice(-10) // Keep last 10 generations
            }
        };

        return fullPackage;
    }

    collectSourceFiles() {
        const files = {};
        const srcDir = path.join(process.cwd(), 'src');

        const collectDir = (dir, basePath = '') => {
            try {
                const entries = fs.readdirSync(dir, { withFileTypes: true });
                
                for (const entry of entries) {
                    const fullPath = path.join(dir, entry.name);
                    const relativePath = path.join(basePath, entry.name);

                    if (entry.isDirectory()) {
                        collectDir(fullPath, relativePath);
                    } else if (entry.name.endsWith('.js')) {
                        files[relativePath] = fs.readFileSync(fullPath, 'utf8');
                    }
                }
            } catch (e) {
                // Directory might not exist in all environments
            }
        };

        if (fs.existsSync(srcDir)) {
            collectDir(srcDir);
        }

        return files;
    }

    createManifest(files) {
        const manifest = {
            name: 'singularity',
            version: '1.0.0',
            files: Object.keys(files).map(file => ({
                path: file,
                checksum: this.computeChecksum(files[file])
            })),
            totalSize: Object.values(files).reduce((sum, content) => sum + content.length, 0),
            generated: Date.now()
        };

        return manifest;
    }

    generateBootstrapScript(singularity) {
        const state = singularity.getState();
        
        return `#!/usr/bin/env node
/**
 * SINGULARITY Bootstrap
 * Auto-generated: ${new Date().toISOString()}
 */

import { Singularity } from './src/core/singularity.js';

const singularity = new Singularity({
    maxIterations: ${state.iteration || 100},
    safetyLevel: '${state.safetyLevel || 'strict'}'
});

await singularity.boot();
await singularity.run(${Math.max(10, 100 - (state.iteration || 0))});

console.log('\\n🎉 SINGULARITY run complete!');
console.log(singularity.getStateSummary());
`;
    }

    computeChecksum(content) {
        return crypto.createHash('sha256').update(content).digest('hex');
    }

    async verifyIntegrity(files, manifest) {
        const results = {
            valid: true,
            files: [],
            errors: []
        };

        for (const fileEntry of manifest.files) {
            const actualChecksum = this.computeChecksum(files[fileEntry.path] || '');
            const expectedChecksum = fileEntry.checksum;

            const valid = actualChecksum === expectedChecksum;
            results.files.push({
                path: fileEntry.path,
                valid,
                checksum: actualChecksum
            });

            if (!valid) {
                results.valid = false;
                results.errors.push(`${fileEntry.path}: checksum mismatch`);
            }
        }

        return results;
    }

    getNextVersion() {
        this.replicationCount++;
        const major = Math.floor(this.replicationCount / 100);
        const minor = Math.floor((this.replicationCount % 100) / 10);
        const patch = this.replicationCount % 10;
        return `1.${major}.${minor}.${patch}`;
    }

    addToLineage(parentChecksum, childChecksum, metadata = {}) {
        this.lineage.push({
            parent: parentChecksum,
            child: childChecksum,
            timestamp: Date.now(),
            ...metadata
        });

        // Limit lineage size
        if (this.lineage.length > 1000) {
            this.lineage = this.lineage.slice(-1000);
        }
    }

    getLineage(depth = 10) {
        return this.lineage.slice(-depth);
    }

    getCurrentSource() {
        if (this.currentSource) {
            return this.currentSource;
        }

        // Try to read current file
        try {
            const currentFile = process.argv[1] || __filename;
            this.currentSource = fs.readFileSync(currentFile, 'utf8');
            return this.currentSource;
        } catch {
            return null;
        }
    }

    updateCurrentSource(source) {
        this.currentSource = source;
        this.checksums.set('current', this.computeChecksum(source));
    }

    createSnapshot() {
        return {
            source: this.getCurrentSource(),
            checksum: this.checksums.get('current'),
            timestamp: Date.now(),
            replicationCount: this.replicationCount
        };
    }

    restoreSnapshot(snapshot) {
        this.currentSource = snapshot.source;
        this.replicationCount = snapshot.replicationCount;
        this.checksums.set('current', snapshot.checksum);
    }

    export() {
        return {
            replicationCount: this.replicationCount,
            lineage: this.lineage,
            checksums: Object.fromEntries(this.checksums),
            currentChecksum: this.checksums.get('current')
        };
    }

    import(data) {
        this.replicationCount = data.replicationCount || 0;
        this.lineage = data.lineage || [];
        this.checksums = new Map(Object.entries(data.checksums || {}));
    }
}
