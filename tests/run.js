// Ghost Test Runner — updated 2026-04-06 (v0.5 suite)
import { testSignals }        from './signals.test.js';
import { testAsync }          from './async.test.js';
import { testSSR }            from './ssr.test.js';
import { testParadigms }      from './paradigms.test.js';
import { testRouter }         from './router.test.js';
import { testHydration }      from './hydration.test.js';
import { testCLI }            from './cli.test.js';
import { testHTTP }           from './http.test.js';
import { testBridge }         from './bridge.test.js';
import { testMediator }       from './mediator.test.js';
// v0.2.0
import { testRouterDynamic }  from './router-dynamic.test.js';
import { testCompiler }       from './compiler.test.js';
import { testErrorBoundary }  from './error-boundary.test.js';
import { testSizeMonitor }    from './size-monitor.test.js';
// v0.5.0
import { testRenderGraph }    from './render-graph.test.js';
import { testSSRv2 }          from './ssr-v2.test.js';
import { testSvelte }         from './svelte.test.js';
import { testAngularDI }      from './angular-di.test.js';
import { testI18n }           from './i18n.test.js';
import { testHTTPv2 }         from './http-v2.test.js';
import { testRouteGuards }    from './route-guards.test.js';
import { testRuntimeCommands } from './runtime-commands.test.js';
import { testBackendGenerators } from './backend-generators.test.js';
import { testDatabaseOrm } from './database-orm.test.js';
import { testEvents } from './events.test.js';
import { testStarterTemplates, testDoctorSuggestions, testGuidedStarterResolution, testGuidedStarterScaffoldRespectsAdminToggle, testDoctorFixCreatesFiles, testDoctorDetectsRicherScaffoldGaps, testDoctorMemoryDiagnostics, testCssEditorCliGenerator, testFormBuilderCliGenerator, testStyleInlineCliGenerator } from './starter-templates.test.js';
import { testHelpContent }    from './help-content.test.js';

async function runAll() {
    try {
        // ── v0.1 baseline ────────────────────────────────────────────────────
        testSignals();
        await testAsync();
        testSSR();
        testParadigms();
        testRouter();
        testHydration();
        testCLI();
        await testHTTP();
        testBridge();
        testMediator();

        // ── v0.2 ─────────────────────────────────────────────────────────────
        testRouterDynamic();
        testCompiler();
        testErrorBoundary();
        testSizeMonitor();

        // ── v0.5 ─────────────────────────────────────────────────────────────
        testRenderGraph();
        await testSSRv2();
        testSvelte();
        testAngularDI();
        await testI18n();
        await testHTTPv2();
        await testRouteGuards();
        await testRuntimeCommands();
        testBackendGenerators();
        await testDatabaseOrm();
        await testEvents();
        await testStarterTemplates();
        testDoctorSuggestions();
        await testGuidedStarterResolution();
        testGuidedStarterScaffoldRespectsAdminToggle();
        await testDoctorFixCreatesFiles();
        await testDoctorDetectsRicherScaffoldGaps();
        testDoctorMemoryDiagnostics();
        testCssEditorCliGenerator();
        testFormBuilderCliGenerator();
        testStyleInlineCliGenerator();
        testHelpContent();

        console.log('\n🌟 ALL GHOST.JS TESTS PASSED! 🌟');
    } catch (e) {
        console.error('\n❌ TEST SUITE FAILED:', e.message);
        console.error(e.stack);
        process.exit(1);
    }
}

runAll();
