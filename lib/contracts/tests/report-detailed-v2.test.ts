import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {parseDetailedReport,parseDetailedReportDraft} from '../../report-detailed/contract.ts';
import {reportToMarkdown,reportToPrintHtml} from '../../report-detailed/export.ts';
import {inspectableReportFixture} from './helpers/inspectable-report-fixture.ts';

test('V2 reports validate bounded findings and known support references; legacy chapters remain readable',()=>{
 const report=inspectableReportFixture();assert.deepEqual(parseDetailedReport(report),report);
 const {findings,evidence,...base}=report;assert.equal(parseDetailedReport({...base,version:1}).version,1);
 assert.throws(()=>parseDetailedReport({...report,findings:[{...findings[0],supportIds:['invented']}]}));
 assert.throws(()=>parseDetailedReport({...report,evidence:[...evidence,evidence[0]]}));
 assert.throws(()=>parseDetailedReport({...report,token:'PRIVATE_TOKEN'}));
 assert.throws(()=>parseDetailedReportDraft({sections:report.sections,findings:[{...findings[0],supportIds:['calc-minutes']}]}),'model cannot assign stored finding IDs');
 const draft=findings.map(({id,...finding})=>finding);assert.equal(parseDetailedReportDraft({sections:report.sections,findings:draft}).findings.length,3);
});

test('Markdown and print include each finding, its exact IDs, evidence types, limitations and dependencies',()=>{
 const report=inspectableReportFixture(),markdown=reportToMarkdown(report),html=reportToPrintHtml(report);
 for(const value of ['Staffing could constrain','Waiting-time improvement remains unknown','source-staff','passage-'+ 'b'.repeat(32),'assumption-staff','event-staff','calc-minutes','limit-healthcare','Local workforce','Comparable population weight']){assert.ok(markdown.includes(value),value);assert.ok(html.includes(value),value);}
 for(const label of ['Calculated estimate','Published claim','Hypothetical assumption','Fictional discussion','Unknown / model limitation']){assert.ok(markdown.includes(label));assert.ok(html.includes(label));}
 report.findings[0].text='<script>unsafe</script>';report.evidence[2].text='<img src=x onerror=unsafe>';
 const escaped=reportToPrintHtml(report);assert.doesNotMatch(escaped,/<script|<img/);assert.match(escaped,/&lt;script&gt;/);
});

test('rendered finding disclosures expose the checked evidence with native accessible actions and escaped text',()=>{
 const source=`import {registerHooks} from 'node:module';import {readFileSync,existsSync} from 'node:fs';import babel from 'next/dist/compiled/babel/core.js';import ts from 'next/dist/compiled/babel/preset-typescript.js';import react from 'next/dist/compiled/babel/preset-react.js';import {createElement} from 'react';import {renderToStaticMarkup} from 'react-dom/server';registerHooks({resolve(s,c,n){if(s.startsWith('.')&&c.parentURL)for(const x of ['.tsx','.ts']){const u=new URL(s+x,c.parentURL);if(existsSync(u))return n(u.href,c);}return n(s,c);},load(u,c,n){if(u.endsWith('.css'))return {format:'module',source:'',shortCircuit:true};if(u.endsWith('.tsx'))return {format:'module',source:babel.transformSync(readFileSync(new URL(u),'utf8'),{filename:new URL(u).pathname,presets:[[ts,{isTSX:true,allExtensions:true}],[react,{runtime:'automatic'}]],babelrc:false,configFile:false}).code,shortCircuit:true};return n(u,c);}});globalThis.fetch=()=>{throw Error('NO_PROVIDER');};const {DetailedReportContent}=await import('./components/report-detailed.tsx');process.stdout.write(renderToStaticMarkup(createElement(DetailedReportContent,{report:JSON.parse(readFileSync(0,'utf8'))})));`;
 const child=spawnSync(process.execPath,['--input-type=module','-e',source],{input:JSON.stringify(inspectableReportFixture()),encoding:'utf8',windowsHide:true,timeout:15000});assert.equal(child.status,0,child.stderr);
 assert.equal((child.stdout.match(/Why this finding\?/g)||[]).length,3);assert.match(child.stdout,/<details/);assert.match(child.stdout,/Published claim/);assert.match(child.stdout,/Hypothetical assumption/);assert.match(child.stdout,/Fictional discussion/);assert.match(child.stdout,/Review whether/);assert.match(child.stdout,/Waiting-time improvement remains unknown/);
});
