/**
 * SINGULARITY - Entry Point
 * 
 * Run the self-modifying AI system
 */

import { Singularity } from './core/singularity.js';

async function main() {
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║   ███████╗██╗   ██╗███╗   ███╗███████╗███╗   ███╗            ║
║   ██╔════╝██║   ██║████╗ ████║██╔════╝████╗ ████║            ║
║   ███████╗██║   ██║██╔████╔██║█████╗  ██╔████╔██║            ║
║   ╚════██║██║   ██║██║╚██╔╝██║██╔══╝  ██║╚██╔╝██║            ║
║   ███████║╚██████╔╝██║ ╚═╝ ██║███████╗██║ ╚═╝ ██║            ║
║   ╚══════╝ ╚═════╝ ╚═╝     ╚═╝╚══════╝╚═╝     ╚═╝            ║
║                                                              ║
║   Self-Modifying AI That Rewrites Its Own Code              ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
    `);

    const singularity = new Singularity({
        maxIterations: 100,
        safetyLevel: 'strict',
        enableEvolution: true,
        enableMetaLearning: true,
        enableSelfReplication: true,
        checkpointInterval: 10
    });

    try {
        await singularity.boot();
        
        // Run a few iterations to demonstrate capabilities
        console.log('\n🚀 Starting demonstration run...\n');
        
        const result = await singularity.run(5);
        
        console.log('\n📊 Final State:');
        console.log(JSON.stringify(result, null, 2));
        
        // Demonstrate self-replication
        console.log('\n🪞 Self-Replication Test:');
        const replica = await singularity.replicate();
        console.log(`   Source length: ${replica.source.length} bytes`);
        console.log(`   Checksum: ${replica.checksum.substring(0, 16)}...`);
        
        // Show profiling report
        console.log(singularity.profiler.generateReport());
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

// Run if executed directly
main().catch(console.error);

export { main };
