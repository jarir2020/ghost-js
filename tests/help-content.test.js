import { execFileSync } from 'child_process';
import { join } from 'path';
import {
    buildCommandsCatalogData,
    buildDoctorCatalogData,
    buildHelpEnvelope,
    buildHelpText,
    buildNextCatalogData,
    buildStarterCatalogData,
    renderHelpText,
    resolveHelpTopic,
    HELP_SCHEMA_SUMMARY
} from '../packages/ghost-cli/src/help-content.js';

export function testHelpContent() {
    console.log('--- Testing Help Content ---');

    function assertCommonHelpSchema(payload, topic) {
        if (payload.kind !== 'ghost.help') {
            throw new Error(`help ${topic} --json did not set the shared help kind`);
        }
        if (payload.schemaVersion !== 1) {
            throw new Error(`help ${topic} --json did not set schemaVersion=1`);
        }
        if (payload.topic !== topic) {
            throw new Error(`help ${topic} --json did not return the ${topic} topic`);
        }
        if (typeof payload.title !== 'string' || !payload.title.trim()) {
            throw new Error(`help ${topic} --json did not include a title`);
        }
        if (typeof payload.guided !== 'boolean') {
            throw new Error(`help ${topic} --json did not include a guided flag`);
        }
        if (!Array.isArray(payload.sections)) {
            throw new Error(`help ${topic} --json did not include sections`);
        }
        if (!Object.prototype.hasOwnProperty.call(payload, 'catalog')) {
            throw new Error(`help ${topic} --json did not include a catalog field`);
        }
    }

    const envelope = buildHelpEnvelope({
        guided: true,
        topic: 'commands',
        sections: [{ title: 'Sample', items: ['one'] }],
        catalog: { source: 'test' }
    });
    assertCommonHelpSchema(envelope, 'commands');
    if (envelope.title !== 'Ghost.js Guided Help') {
        throw new Error('shared help envelope builder did not set the guided title');
    }
    if (!Array.isArray(envelope.sections) || envelope.sections[0]?.title !== 'Sample') {
        throw new Error('shared help envelope builder did not preserve sections');
    }
    if (!envelope.catalog || envelope.catalog.source !== 'test') {
        throw new Error('shared help envelope builder did not preserve catalog');
    }

    const rendered = renderHelpText({
        guided: false,
        sections: [
            { title: 'Example', items: ['one', 'two'] }
        ]
    });
    if (!rendered.startsWith('Ghost.js CLI Help')) {
        throw new Error('shared help renderer did not emit the default title block');
    }
    if (!rendered.includes('Example:')) {
        throw new Error('shared help renderer did not render the section title');
    }
    if (!rendered.includes('one') || !rendered.includes('two')) {
        throw new Error('shared help renderer did not render section items');
    }

    const resolvedCommands = resolveHelpTopic('commands');
    if (!Array.isArray(resolvedCommands.sections) || resolvedCommands.sections.length !== 2) {
        throw new Error('help topic resolver did not return the commands section set');
    }
    if (!resolvedCommands.catalog || resolvedCommands.catalog.source !== 'commands.txt') {
        throw new Error('help topic resolver did not return the commands catalog');
    }

    const resolvedDoctor = resolveHelpTopic('doctor');
    if (!Array.isArray(resolvedDoctor.sections) || resolvedDoctor.sections.length !== 1 || resolvedDoctor.sections[0].title !== 'Doctor JSON examples') {
        throw new Error('help topic resolver did not return the doctor topic sections');
    }
    if (!resolvedDoctor.catalog || !Array.isArray(resolvedDoctor.catalog.doctorExamples)) {
        throw new Error('help topic resolver did not return the doctor catalog');
    }

    const resolvedUnknown = resolveHelpTopic('unknown');
    if (!Array.isArray(resolvedUnknown.sections) || !resolvedUnknown.sections.some((section) => section.title === 'Unknown help topic: unknown')) {
        throw new Error('help topic resolver did not include the unknown topic fallback');
    }
    if (resolvedUnknown.catalog !== null) {
        throw new Error('help topic resolver should not provide a catalog for unknown topics');
    }

    const commandsCatalog = buildCommandsCatalogData();
    if (commandsCatalog.source !== 'commands.txt') {
        throw new Error('commands catalog builder did not set the commands source');
    }
    if (!Array.isArray(commandsCatalog.commands) || !commandsCatalog.commands.some((entry) => entry.name === 'ghost watch')) {
        throw new Error('commands catalog builder did not include ghost watch');
    }
    if (!commandsCatalog.commands.some((entry) => entry.name === 'ghost doctor --memory')) {
        throw new Error('commands catalog builder did not include ghost doctor --memory');
    }
    if (!commandsCatalog.commands.some((entry) => entry.name === 'ghost help')) {
        throw new Error('commands catalog builder did not include ghost help');
    }
    if (!commandsCatalog.commands.some((entry) => entry.name === 'ghost make:crud <name>')) {
        throw new Error('commands catalog builder did not include ghost make:crud');
    }
    if (!commandsCatalog.commands.some((entry) => entry.name === 'ghost make:event <name>')) {
        throw new Error('commands catalog builder did not include ghost make:event');
    }
    if (!commandsCatalog.commands.some((entry) => entry.name === 'ghost make:listener <name>')) {
        throw new Error('commands catalog builder did not include ghost make:listener');
    }
    if (!commandsCatalog.commands.some((entry) => entry.name === 'ghost make:job <name>')) {
        throw new Error('commands catalog builder did not include ghost make:job');
    }
    if (!commandsCatalog.commands.some((entry) => entry.name === 'ghost make:events <name> [--with-auth] [--with-crud] [--with-notifications]')) {
        throw new Error('commands catalog builder did not include ghost make:events');
    }
    if (!commandsCatalog.commands.some((entry) => entry.name === 'ghost make:view <name>')) {
        throw new Error('commands catalog builder did not include ghost make:view');
    }
    if (!commandsCatalog.commands.some((entry) => entry.name === 'ghost make:route <name>')) {
        throw new Error('commands catalog builder did not include ghost make:route');
    }
    if (!commandsCatalog.commands.some((entry) => entry.name === 'ghost make:api <name>')) {
        throw new Error('commands catalog builder did not include ghost make:api');
    }
    if (!commandsCatalog.commands.some((entry) => entry.name === 'ghost route:list')) {
        throw new Error('commands catalog builder did not include ghost route:list');
    }
    if (!commandsCatalog.commands.some((entry) => entry.name === 'ghost route:export <name>')) {
        throw new Error('commands catalog builder did not include ghost route:export');
    }
    if (!commandsCatalog.commands.some((entry) => entry.name === 'ghost route:diagnose')) {
        throw new Error('commands catalog builder did not include ghost route:diagnose');
    }
    if (!Array.isArray(commandsCatalog.workspaceScripts) || !commandsCatalog.workspaceScripts.some((entry) => entry.name === 'npm run watch')) {
        throw new Error('commands catalog builder did not include workspace scripts');
    }

    const starterCatalog = buildStarterCatalogData();
    if (starterCatalog.source !== 'starter-templates.js') {
        throw new Error('starter catalog builder did not set the starter source');
    }
    if (!Array.isArray(starterCatalog.templates) || !starterCatalog.templates.some((entry) => entry.name === 'admin-panel')) {
        throw new Error('starter catalog builder did not include admin-panel');
    }

    const nextCatalog = buildNextCatalogData();
    if (nextCatalog.source !== 'help-content.js') {
        throw new Error('next catalog builder did not set the next source');
    }
    if (!Array.isArray(nextCatalog.nextSteps) || !nextCatalog.nextSteps.some((entry) => entry.command === 'ghost doctor --fix')) {
        throw new Error('next catalog builder did not include the doctor fix step');
    }

    const doctorCatalog = buildDoctorCatalogData();
    if (doctorCatalog.source !== 'help-content.js') {
        throw new Error('doctor catalog builder did not set the doctor source');
    }
    if (!Array.isArray(doctorCatalog.doctorExamples) || !doctorCatalog.doctorExamples.some((entry) => entry.command === 'ghost doctor --json --pretty')) {
        throw new Error('doctor catalog builder did not include the pretty example');
    }

    const guided = buildHelpText({ guided: true });
    if (!guided.includes('Ghost.js Guided Help')) {
        throw new Error('guided help heading missing');
    }
    if (!guided.includes('ghost init --guided')) {
        throw new Error('guided help does not mention init');
    }

    const topic = buildHelpText({ guided: false, topic: 'starters' });
    if (!topic.includes('Starter templates:')) {
        throw new Error('starter help missing templates section');
    }
    if (!topic.includes('admin-panel')) {
        throw new Error('starter help missing admin-panel template');
    }
    if (!topic.includes(HELP_SCHEMA_SUMMARY)) {
        throw new Error('starter help missing shared schema summary');
    }

    const cliPath = join(process.cwd(), 'packages', 'ghost-cli', 'src', 'cli.js');

    const commands = buildHelpText({ guided: false, topic: 'commands' });
    if (!commands.includes('Workspace scripts:')) {
        throw new Error('commands help missing workspace scripts section');
    }
    if (!commands.includes('npm run watch')) {
        throw new Error('commands help missing npm run watch');
    }
    if (!commands.includes('npm run db:migrate')) {
        throw new Error('commands help missing npm run db:migrate');
    }
    if (!commands.includes('npm run seed')) {
        throw new Error('commands help missing npm run seed');
    }
    if (!commands.includes(HELP_SCHEMA_SUMMARY)) {
        throw new Error('commands help missing shared schema summary');
    }
    if (!commands.includes('ghost start')) {
        throw new Error('commands help missing ghost start');
    }
    if (!commands.includes('ghost preview')) {
        throw new Error('commands help missing ghost preview');
    }
    if (!commands.includes('ghost serve')) {
        throw new Error('commands help missing ghost serve');
    }
    if (!commands.includes('ghost clean')) {
        throw new Error('commands help missing ghost clean');
    }
    if (!commands.includes('ghost doctor --memory')) {
        throw new Error('commands help missing ghost doctor --memory');
    }
    if (!commands.includes('ghost help')) {
        throw new Error('commands help missing ghost help');
    }
    if (!commands.includes('ghost make:crud <name>')) {
        throw new Error('commands help missing ghost make:crud');
    }
    if (!commands.includes('ghost make:event <name>')) {
        throw new Error('commands help missing ghost make:event');
    }
    if (!commands.includes('ghost make:listener <name>')) {
        throw new Error('commands help missing ghost make:listener');
    }
    if (!commands.includes('ghost make:job <name>')) {
        throw new Error('commands help missing ghost make:job');
    }
    if (!commands.includes('ghost make:events <name> [--with-auth] [--with-crud] [--with-notifications]')) {
        throw new Error('commands help missing ghost make:events');
    }
    if (!commands.includes('ghost make:view <name>')) {
        throw new Error('commands help missing ghost make:view');
    }
    if (!commands.includes('ghost make:route <name>')) {
        throw new Error('commands help missing ghost make:route');
    }
    if (!commands.includes('ghost make:api <name>')) {
        throw new Error('commands help missing ghost make:api');
    }
    if (!commands.includes('ghost route:list')) {
        throw new Error('commands help missing ghost route:list');
    }
    if (!commands.includes('ghost route:export <name>')) {
        throw new Error('commands help missing ghost route:export');
    }
    if (!commands.includes('ghost route:diagnose')) {
        throw new Error('commands help missing ghost route:diagnose');
    }

    const commandsJson = execFileSync('node', [cliPath, 'help', 'commands', '--json'], {
        encoding: 'utf8'
    });
    const commandsParsed = JSON.parse(commandsJson);
    assertCommonHelpSchema(commandsParsed, 'commands');
    if (!commandsParsed.catalog || commandsParsed.catalog.source !== 'commands.txt') {
        throw new Error('help commands --json did not include the commands catalog source');
    }
    if (!Array.isArray(commandsParsed.catalog.commands) || !commandsParsed.catalog.commands.some((entry) => entry.name === 'ghost watch')) {
        throw new Error('help commands --json did not include ghost watch in the structured catalog');
    }
    if (!commandsParsed.catalog.commands.some((entry) => entry.name === 'ghost start')) {
        throw new Error('help commands --json did not include ghost start in the structured catalog');
    }
    if (!commandsParsed.catalog.commands.some((entry) => entry.name === 'ghost clean')) {
        throw new Error('help commands --json did not include ghost clean in the structured catalog');
    }
    if (!Array.isArray(commandsParsed.catalog.workspaceScripts) || !commandsParsed.catalog.workspaceScripts.some((entry) => entry.name === 'npm run watch' && entry.outputDir === 'dist/watch/')) {
        throw new Error('help commands --json did not include isolated workspace script outputs');
    }

    const commandsBriefJson = execFileSync('node', [cliPath, 'help', 'commands', '--json', '--brief'], {
        encoding: 'utf8'
    });
    if (commandsBriefJson.includes('\n')) {
        throw new Error('help commands --json --brief should be compact and single-line');
    }
    const commandsBriefParsed = JSON.parse(commandsBriefJson);
    assertCommonHelpSchema(commandsBriefParsed, 'commands');
    if (!commandsBriefParsed.catalog || !Array.isArray(commandsBriefParsed.catalog.commands) || !commandsBriefParsed.catalog.commands.some((entry) => entry.name === 'ghost make:starter <name>')) {
        throw new Error('help commands --json --brief did not include the structured commands catalog');
    }

    const startersJson = execFileSync('node', [cliPath, 'help', 'starters', '--json'], {
        encoding: 'utf8'
    });
    const startersParsed = JSON.parse(startersJson);
    assertCommonHelpSchema(startersParsed, 'starters');
    if (!startersParsed.catalog || startersParsed.catalog.source !== 'starter-templates.js') {
        throw new Error('help starters --json did not include the starter catalog source');
    }
    if (!Array.isArray(startersParsed.catalog.templates) || !startersParsed.catalog.templates.some((entry) => entry.name === 'blog' && entry.files.includes('src/admin/modules/AdminDashboard.js'))) {
        throw new Error('help starters --json did not include the blog starter metadata');
    }
    if (!startersParsed.catalog.templates.some((entry) => entry.name === 'admin-panel' && entry.adminModules.includes('src/admin/modules/FormBuilder.js'))) {
        throw new Error('help starters --json did not include admin-panel admin module metadata');
    }

    const startersBriefJson = execFileSync('node', [cliPath, 'help', 'starters', '--json', '--brief'], {
        encoding: 'utf8'
    });
    if (startersBriefJson.includes('\n')) {
        throw new Error('help starters --json --brief should be compact and single-line');
    }
    const startersBriefParsed = JSON.parse(startersBriefJson);
    assertCommonHelpSchema(startersBriefParsed, 'starters');
    if (!startersBriefParsed.catalog || !Array.isArray(startersBriefParsed.catalog.templates) || !startersBriefParsed.catalog.templates.some((entry) => entry.name === 'saas')) {
        throw new Error('help starters --json --brief did not include the starter catalog');
    }

    const nextJson = execFileSync('node', [cliPath, 'help', 'next', '--json'], {
        encoding: 'utf8'
    });
    const nextParsed = JSON.parse(nextJson);
    assertCommonHelpSchema(nextParsed, 'next');
    if (!nextParsed.catalog || nextParsed.catalog.source !== 'help-content.js') {
        throw new Error('help next --json did not include the next catalog source');
    }
    if (!Array.isArray(nextParsed.catalog.nextSteps) || !nextParsed.catalog.nextSteps.some((entry) => entry.command === 'ghost init --guided')) {
        throw new Error('help next --json did not include the guided init step');
    }
    if (!nextParsed.catalog.nextSteps.some((entry) => entry.command === 'ghost make:event OrderCreated')) {
        throw new Error('help next --json did not include the event step');
    }
    if (!nextParsed.catalog.nextSteps.some((entry) => entry.command === 'ghost make:listener OrderCreated')) {
        throw new Error('help next --json did not include the listener step');
    }
    if (!nextParsed.catalog.nextSteps.some((entry) => entry.command === 'ghost make:job SendWelcomeEmail')) {
        throw new Error('help next --json did not include the job step');
    }
    if (!nextParsed.catalog.nextSteps.some((entry) => entry.command === 'ghost make:events Order')) {
        throw new Error('help next --json did not include the events bundle step');
    }
    if (!nextParsed.catalog.nextSteps.some((entry) => entry.command === 'ghost make:events Order --with-auth')) {
        throw new Error('help next --json did not include the events auth step');
    }
    if (!nextParsed.catalog.nextSteps.some((entry) => entry.command === 'ghost make:events Order --with-crud')) {
        throw new Error('help next --json did not include the events crud step');
    }
    if (!nextParsed.catalog.nextSteps.some((entry) => entry.command === 'ghost make:events Order --with-notifications')) {
        throw new Error('help next --json did not include the events notifications step');
    }
    if (!nextParsed.catalog.nextSteps.some((entry) => entry.command === 'ghost make:style-inline Button' && entry.category === 'visual-builder')) {
        throw new Error('help next --json did not include the visual builder step metadata');
    }

    const nextBriefJson = execFileSync('node', [cliPath, 'help', 'next', '--json', '--brief'], {
        encoding: 'utf8'
    });
    if (nextBriefJson.includes('\n')) {
        throw new Error('help next --json --brief should be compact and single-line');
    }
    const nextBriefParsed = JSON.parse(nextBriefJson);
    assertCommonHelpSchema(nextBriefParsed, 'next');
    if (!nextBriefParsed.catalog || !Array.isArray(nextBriefParsed.catalog.nextSteps) || !nextBriefParsed.catalog.nextSteps.some((entry) => entry.command === 'ghost doctor --fix')) {
        throw new Error('help next --json --brief did not include the structured next steps catalog');
    }
    const nextHelp = buildHelpText({ guided: false, topic: 'next' });
    if (!nextHelp.includes(HELP_SCHEMA_SUMMARY)) {
        throw new Error('next help missing shared schema summary');
    }

    const doctor = buildHelpText({ guided: false, topic: 'doctor' });
    if (!doctor.includes('Doctor JSON examples:')) {
        throw new Error('doctor help missing JSON examples block');
    }
    if (!doctor.includes(HELP_SCHEMA_SUMMARY)) {
        throw new Error('doctor help missing shared schema summary');
    }
    if (!doctor.includes('ghost doctor --json --source --brief')) {
        throw new Error('doctor help missing source brief example');
    }
    if (!doctor.includes('ghost doctor --json --source --pretty')) {
        throw new Error('doctor help missing source pretty example');
    }
    if (!doctor.includes('ghost doctor --memory --json --brief')) {
        throw new Error('doctor help missing memory brief example');
    }

    const fallback = buildHelpText({ guided: true, topic: 'unknown' });
    if (!fallback.includes('Unknown help topic: unknown')) {
        throw new Error('unknown topic fallback missing');
    }

    const doctorHelp = execFileSync('node', [cliPath, 'doctor', '--help'], {
        encoding: 'utf8'
    });
    if (!doctorHelp.includes('Doctor JSON examples:')) {
        throw new Error('doctor --help did not show the matrix block');
    }
    if (!doctorHelp.includes('ghost doctor --json --source --pretty')) {
        throw new Error('doctor --help did not show the source pretty example');
    }
    if (!doctorHelp.includes('ghost doctor --memory --json --brief')) {
        throw new Error('doctor --help did not show the memory brief example');
    }

    const doctorShortHelp = execFileSync('node', [cliPath, 'doctor', '-h'], {
        encoding: 'utf8'
    });
    if (!doctorShortHelp.includes('Doctor JSON examples:')) {
        throw new Error('doctor -h did not show the matrix block');
    }

    const helpDoctor = execFileSync('node', [cliPath, 'help', 'doctor'], {
        encoding: 'utf8'
    });
    if (!helpDoctor.includes('Doctor JSON examples:')) {
        throw new Error('help doctor did not show the matrix block');
    }

    const helpDoctorShort = execFileSync('node', [cliPath, 'help', 'doctor', '-h'], {
        encoding: 'utf8'
    });
    if (!helpDoctorShort.includes('Doctor JSON examples:')) {
        throw new Error('help doctor -h did not show the matrix block');
    }

    const helpDoctorLong = execFileSync('node', [cliPath, 'help', 'doctor', '--help'], {
        encoding: 'utf8'
    });
    if (!helpDoctorLong.includes('Doctor JSON examples:')) {
        throw new Error('help doctor --help did not show the matrix block');
    }

    const helpDoctorJson = execFileSync('node', [cliPath, 'help', 'doctor', '--json'], {
        encoding: 'utf8'
    });
    const helpDoctorParsed = JSON.parse(helpDoctorJson);
    assertCommonHelpSchema(helpDoctorParsed, 'doctor');
    if (!Array.isArray(helpDoctorParsed.sections) || !helpDoctorParsed.sections.some((section) => section.title === 'Doctor JSON examples')) {
        throw new Error('help doctor --json did not include the doctor matrix section');
    }
    if (!helpDoctorParsed.sections.some((section) => section.items.some((item) => item.includes('ghost doctor --memory --json --brief')))) {
        throw new Error('help doctor --json did not include the memory example');
    }

    const helpDoctorPrettyJson = execFileSync('node', [cliPath, 'help', 'doctor', '--json', '--pretty'], {
        encoding: 'utf8'
    });
    if (!helpDoctorPrettyJson.includes('\n')) {
        throw new Error('help doctor --json --pretty should be multiline');
    }
    const helpDoctorPrettyParsed = JSON.parse(helpDoctorPrettyJson);
    assertCommonHelpSchema(helpDoctorPrettyParsed, 'doctor');
    if (!Array.isArray(helpDoctorPrettyParsed.sections) || !helpDoctorPrettyParsed.sections.some((section) => section.title === 'Doctor JSON examples')) {
        throw new Error('help doctor --json --pretty did not include the doctor matrix section');
    }

    const helpDoctorBriefJson = execFileSync('node', [cliPath, 'help', 'doctor', '--json', '--brief'], {
        encoding: 'utf8'
    });
    if (helpDoctorBriefJson.includes('\n')) {
        throw new Error('help doctor --json --brief should be compact and single-line');
    }
    const helpDoctorBriefParsed = JSON.parse(helpDoctorBriefJson);
    assertCommonHelpSchema(helpDoctorBriefParsed, 'doctor');
    if (!Array.isArray(helpDoctorBriefParsed.sections) || !helpDoctorBriefParsed.sections.some((section) => section.title === 'Doctor JSON examples')) {
        throw new Error('help doctor --json --brief did not include the doctor matrix section');
    }

    console.log('✅ Help content tests passed!');
}
