import test from 'node:test';
import assert from 'node:assert/strict';
import {reportDownloadFilename,reportToMarkdown,reportToPrintHtml} from '../../report-detailed/export.ts';
import type {DetailedReport} from '../../report-detailed/contract.ts';

const report:DetailedReport={version:1,runId:'run-1',snapshotKey:'a'.repeat(64),generatedAt:'2026-11-02T08:30:00.000Z',question:'Should <schools> & buses change?',runStatus:'paused',sections:{assessment:'Assessment <script>alert("x")</script>',impacts:'Impacts & effects',perspectives:'Perspectives from participants',tradeoffs:'Trade-offs to consider',developments:'Developments across the run',nextSteps:'Next steps to investigate'}};

test('Markdown includes the question, time, partial state and every chapter without interpreting input',()=>{
 const markdown=reportToMarkdown(report);
 assert.match(markdown,/2026-11-02T08:30:00.000Z/);
 assert.match(markdown,/paused.*partial/i);
 assert.match(markdown,/Should \\<schools\\> & buses change\?/);
 for(const text of ['Assessment','Impacts & effects','Perspectives from participants','Trade-offs to consider','Developments across the run','Next steps to investigate'])assert.ok(markdown.includes(text));
 assert.doesNotMatch(markdown,/<script>|<schools>/);
 assert.doesNotMatch(markdown,/snapshotKey|Bearer|access.token|raw.source/i);
});

test('print document escapes all untrusted text and contains all chapters in a standalone readable document',()=>{
 const html=reportToPrintHtml(report);
 assert.match(html,/^<!doctype html>/i);
 assert.match(html,/&lt;schools&gt; &amp; buses/);
 assert.match(html,/&lt;script&gt;alert\(&quot;x&quot;\)&lt;\/script&gt;/);
 assert.match(html,/paused.*partial/i);
 assert.equal((html.match(/<h2>/g)||[]).length,6);
 for(const text of ['Impacts &amp; effects','Perspectives from participants','Trade-offs to consider','Developments across the run','Next steps to investigate'])assert.ok(html.includes(text));
 assert.doesNotMatch(html,/<script|<iframe|https?:|snapshotKey|Bearer/i);
 assert.match(html,/@media print/);
});

test('download filenames stay bounded and cannot introduce paths or HTML',()=>{
 const filename=reportDownloadFilename({...report,runId:'../../evil\\name:<script>\r\n'},'md');
 assert.match(filename,/^impactlens-detailed-[a-zA-Z0-9._-]+-2026-11-02\.md$/);
 assert.doesNotMatch(filename,/\.\.|[\\/<>:\r\n]/);
 assert.ok(reportDownloadFilename({...report,runId:'a'.repeat(1000)},'html').length<160);
});
