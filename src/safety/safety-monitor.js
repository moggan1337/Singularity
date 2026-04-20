/**
 * Safety Monitor - Safety constraints and rollback capabilities
 * 
 * Ensures self-modifications are safe through:
 * - Validation of code changes
 * - Sandbox execution
 * - Rollback mechanisms
 * - Constraint checking
 * - Audit logging
 */

export class SafetyMonitor {
    constructor(level = 'strict') {
        this.level = level;
        
        this.config = {
            maxIterationsWithoutCheckpoint: 100,
            maxRollbacks: 10,
            maxCodeSize: 1000000, // 1MB
            maxExecutionTime: 5000, // 5 seconds
            allowFileSystemAccess: false,
            allowNetworkAccess: false,
            allowProcessExecution: false,
            allowedModules: ['./ast', './profiling', './evolution', './meta'],
            forbiddenPatterns: [
                /eval\s*\(/,
                /Function\s*\(/,
                /require\s*\(\s*['"]child_process['"]/,
                /require\s*\(\s*['"]fs['"]/,
                /require\s*\(\s*['"]net['"]/,
                /require\s*\(\s*['"]http['"]/,
                /process\.exit/,
                /global\.gc/,
                /__dirname/,
                /__filename/
            ],
            requiredPatterns: [],
            ...this.getLevelConfig(level)
        };

        this.checkpoints = [];
        this.auditLog = [];
        this.rollbacksPerformed = 0;
        this.validationFailures = [];
        this.stats = {
            totalValidations: 0,
            passedValidations: 0,
            failedValidations: 0,
            totalRollbacks: 0,
            safetyViolations: 0
        };
    }

    getLevelConfig(level) {
        const configs = {
            strict: {
                maxIterationsWithoutCheckpoint: 50,
                maxRollbacks: 5,
                allowFileSystemAccess: false,
                allowNetworkAccess: false,
                allowProcessExecution: false
            },
            moderate: {
                maxIterationsWithoutCheckpoint: 100,
                maxRollbacks: 10,
                allowFileSystemAccess: true,
                allowNetworkAccess: false,
                allowProcessExecution: false
            },
            permissive: {
                maxIterationsWithoutCheckpoint: 200,
                maxRollbacks: 20,
                allowFileSystemAccess: true,
                allowNetworkAccess: true,
                allowProcessExecution: true
            }
        };

        return configs[level] || configs.strict;
    }

    async initialize(singularity) {
        this.singularity = singularity;
        
        console.log(`   Safety level: ${this.level}`);
        console.log(`   Max rollbacks: ${this.config.maxRollbacks}`);
        console.log(`   File access: ${this.config.allowFileSystemAccess}`);
        console.log(`   Network access: ${this.config.allowNetworkAccess}`);
        
        return true;
    }

    async validateChange(change) {
        this.stats.totalValidations++;

        const validations = [
            this.validateChangeStructure(change),
            this.validateCodeSafety(change),
            this.validateASTSafety(change),
            this.validateResourceLimits(change),
            this.validateConstraints(change)
        ];

        const results = await Promise.all(validations);
        const passed = results.every(r => r.valid);

        if (passed) {
            this.stats.passedValidations++;
            await this.logAudit('validation_passed', change);
        } else {
            this.stats.failedValidations++;
            const failedReasons = results.filter(r => !r.valid).map(r => r.reason);
            this.validationFailures.push({ change, reasons: failedReasons });
            await this.logAudit('validation_failed', { change, reasons: failedReasons });
        }

        return { valid: passed, results };
    }

    validateChangeStructure(change) {
        if (!change) {
            return { valid: false, reason: 'Change is null or undefined' };
        }

        if (!change.type) {
            return { valid: false, reason: 'Change missing type property' };
        }

        const validTypes = ['code', 'parameter', 'algorithm', 'structural'];
        if (!validTypes.includes(change.type)) {
            return { valid: false, reason: `Invalid change type: ${change.type}` };
        }

        switch (change.type) {
            case 'code':
                if (!change.code && !change.ast) {
                    return { valid: false, reason: 'Code change missing code or ast' };
                }
                break;
            case 'parameter':
                if (!change.path || change.value === undefined) {
                    return { valid: false, reason: 'Parameter change missing path or value' };
                }
                break;
            case 'algorithm':
                if (!change.name || !change.algorithm) {
                    return { valid: false, reason: 'Algorithm change missing name or algorithm' };
                }
                break;
        }

        return { valid: true };
    }

    validateCodeSafety(change) {
        if (change.type !== 'code' || !change.code) {
            return { valid: true };
        }

        const code = change.code;

        // Check forbidden patterns
        for (const pattern of this.config.forbiddenPatterns) {
            if (pattern.test(code)) {
                this.stats.safetyViolations++;
                return { 
                    valid: false, 
                    reason: `Code contains forbidden pattern: ${pattern}` 
                };
            }
        }

        // Check code size
        if (code.length > this.config.maxCodeSize) {
            return { 
                valid: false, 
                reason: `Code size (${code.length}) exceeds limit (${this.config.maxCodeSize})` 
            };
        }

        // Check required patterns
        for (const pattern of this.config.requiredPatterns) {
            if (!pattern.test(code)) {
                return { 
                    valid: false, 
                    reason: `Code missing required pattern: ${pattern}` 
                };
            }
        }

        return { valid: true };
    }

    async validateASTSafety(change) {
        if (change.type !== 'code' || !change.ast) {
            return { valid: true };
        }

        // Additional AST-specific safety checks
        const dangerousNodes = this.findDangerousNodes(change.ast);
        
        if (dangerousNodes.length > 0) {
            return { 
                valid: false, 
                reason: `Found ${dangerousNodes.length} potentially dangerous AST nodes` 
            };
        }

        return { valid: true };
    }

    findDangerousNodes(ast) {
        const dangerous = [];
        const dangerousTypes = [
            'CallExpression',
            'NewExpression'
        ];

        // Traverse and find dangerous patterns
        const traverse = (node) => {
            if (dangerousTypes.includes(node.type)) {
                if (this.isDangerousCall(node)) {
                    dangerous.push(node);
                }
            }
            
            if (node.body) {
                const body = Array.isArray(node.body) ? node.body : [node.body];
                for (const child of body) {
                    if (child && typeof child === 'object') {
                        traverse(child);
                    }
                }
            }
        };

        if (ast && typeof ast === 'object') {
            traverse(ast);
        }

        return dangerous;
    }

    isDangerousCall(node) {
        if (node.callee?.type === 'Identifier') {
            const dangerousGlobals = ['eval', 'Function', 'require', 'import'];
            if (dangerousGlobals.includes(node.callee.name)) {
                return true;
            }
        }
        return false;
    }

    validateResourceLimits(change) {
        // Check execution time limits
        if (change.estimatedTime && change.estimatedTime > this.config.maxExecutionTime) {
            return { 
                valid: false, 
                reason: `Estimated execution time exceeds limit` 
            };
        }

        return { valid: true };
    }

    validateConstraints(change) {
        // Check custom constraints
        const constraintResults = this.checkConstraints(change);
        
        if (!constraintResults.passed) {
            return { 
                valid: false, 
                reason: `Constraint violation: ${constraintResults.violation}` 
            };
        }

        return { valid: true };
    }

    checkConstraints(change) {
        // Override in subclasses or add custom constraints
        return { passed: true };
    }

    async createCheckpoint(singularity) {
        const checkpoint = {
            id: `checkpoint-${Date.now()}`,
            timestamp: Date.now(),
            iteration: singularity.state.iteration,
            version: singularity.state.version,
            state: this.sanitizeState(singularity.state),
            modules: {},
            code: singularity.quine?.getCurrentSource?.() || null
        };

        // Capture module states
        for (const [name, module] of Object.entries(singularity.modules)) {
            if (module.serialize) {
                checkpoint.modules[name] = module.serialize();
            }
        }

        // Store checkpoint
        this.checkpoints.push(checkpoint);

        // Limit checkpoint history
        if (this.checkpoints.length > this.config.maxRollbacks + 5) {
            this.checkpoints = this.checkpoints.slice(-this.config.maxRollbacks - 5);
        }

        await this.logAudit('checkpoint_created', checkpoint);

        return checkpoint;
    }

    sanitizeState(state) {
        // Remove non-serializable or sensitive data
        const sanitized = { ...state };
        
        // Remove functions
        for (const [key, value] of Object.entries(sanitized)) {
            if (typeof value === 'function') {
                delete sanitized[key];
            }
            if (value instanceof Set) {
                sanitized[key] = Array.from(value);
            }
        }

        return JSON.parse(JSON.stringify(sanitized));
    }

    async rollback(singularity, checkpoint) {
        if (this.rollbacksPerformed >= this.config.maxRollbacks) {
            throw new Error(`Maximum rollbacks (${this.config.maxRollbacks}) reached`);
        }

        if (!checkpoint) {
            checkpoint = this.checkpoints[this.checkpoints.length - 1];
        }

        if (!checkpoint) {
            throw new Error('No checkpoint available for rollback');
        }

        await this.logAudit('rollback_start', {
            checkpointId: checkpoint.id,
            iteration: checkpoint.iteration
        });

        try {
            // Restore state
            singularity.state = { ...singularity.state, ...checkpoint.state };
            
            // Restore modules
            for (const [name, data] of Object.entries(checkpoint.modules)) {
                if (singularity.modules[name]?.deserialize) {
                    singularity.modules[name].deserialize(data);
                }
            }

            this.rollbacksPerformed++;
            this.stats.totalRollbacks++;

            await this.logAudit('rollback_complete', {
                checkpointId: checkpoint.id,
                rollbacksPerformed: this.rollbacksPerformed
            });

            return true;
        } catch (error) {
            await this.logAudit('rollback_failed', {
                checkpointId: checkpoint.id,
                error: error.message
            });
            throw error;
        }
    }

    async logAudit(event, data) {
        const entry = {
            timestamp: Date.now(),
            event,
            data,
            safetyLevel: this.level
        };

        this.auditLog.push(entry);

        // Limit audit log size
        if (this.auditLog.length > 10000) {
            this.auditLog = this.auditLog.slice(-5000);
        }

        // Log to console in debug mode
        if (process.env.DEBUG_SAFETY) {
            console.log(`[SAFETY] ${event}:`, JSON.stringify(data, null, 2));
        }
    }

    getCheckpoints() {
        return this.checkpoints.map(c => ({
            id: c.id,
            timestamp: c.timestamp,
            iteration: c.iteration
        }));
    }

    getAuditLog(filter = {}) {
        let filtered = this.auditLog;

        if (filter.event) {
            filtered = filtered.filter(e => e.event === filter.event);
        }

        if (filter.since) {
            filtered = filtered.filter(e => e.timestamp >= filter.since);
        }

        if (filter.until) {
            filtered = filtered.filter(e => e.timestamp <= filter.until);
        }

        return filtered;
    }

    getStats() {
        return {
            ...this.stats,
            rollbacksPerformed: this.rollbacksPerformed,
            checkpointCount: this.checkpoints.length,
            validationFailureCount: this.validationFailures.length,
            auditLogSize: this.auditLog.length
        };
    }

    addForbiddenPattern(pattern) {
        if (pattern instanceof RegExp) {
            this.config.forbiddenPatterns.push(pattern);
        }
    }

    addRequiredPattern(pattern) {
        if (pattern instanceof RegExp) {
            this.config.requiredPatterns.push(pattern);
        }
    }

    setLevel(level) {
        this.level = level;
        const levelConfig = this.getLevelConfig(level);
        this.config = { ...this.config, ...levelConfig };
    }

    clearCheckpoints() {
        this.checkpoints = [];
    }

    clearAuditLog() {
        this.auditLog = [];
    }

    export() {
        return {
            level: this.level,
            config: this.config,
            stats: this.stats,
            checkpoints: this.checkpoints.map(c => ({
                id: c.id,
                timestamp: c.timestamp,
                iteration: c.iteration
            })),
            validationFailures: this.validationFailures.length,
            rollbacksPerformed: this.rollbacksPerformed
        };
    }

    import(data) {
        this.level = data.level;
        this.config = { ...this.config, ...data.config };
        this.stats = data.stats;
        this.rollbacksPerformed = data.rollbacksPerformed;
    }

    async testChange(change) {
        // Sandbox test execution
        const result = {
            executed: false,
            output: null,
            errors: [],
            safe: false
        };

        try {
            if (change.type === 'code' && change.code) {
                // Create sandbox environment
                const sandbox = this.createSandbox();
                
                // Execute with timeout
                result.output = await this.executeSandboxed(
                    change.code,
                    sandbox,
                    this.config.maxExecutionTime
                );
                result.executed = true;
                result.safe = true;
            }
        } catch (error) {
            result.errors.push(error.message);
        }

        return result;
    }

    createSandbox() {
        return {
            console: {
                log: () => {},
                error: () => {},
                warn: () => {}
            },
            Math,
            JSON,
            Date,
            Array,
            Object,
            String,
            Number,
            Boolean,
            Map,
            Set,
            Promise,
            Symbol
        };
    }

    async executeSandboxed(code, sandbox, timeout) {
        // In production, use a proper sandbox like vm2 or isolate
        // This is a simplified implementation
        const fn = new Function(
            ...Object.keys(sandbox),
            `"use strict";\n${code}`
        );

        return Promise.race([
            fn(...Object.values(sandbox)),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Execution timeout')), timeout)
            )
        ]);
    }
}
