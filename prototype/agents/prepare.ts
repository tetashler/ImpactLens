export const AGE_GROUPS = ['0_4','5_9','10_14','15_19','20_24','25_29','30_34','35_39','40_44','45_49','50_54','55_59','60_64','65_69','70_74','75_79','80_84','85_89','90andOver'] as const;
import { createHash } from 'node:crypto';
import { parseCsv } from '../mrt/csv.ts';
import type { DemographicDistribution, SourceMetadata, DemographicCell, TotalDiscrepancy } from './types.ts';

export const CENSUS_SOURCE: SourceMetadata = {
  kind: 'government-statistics', datasetId: 'd_d95ae740c0f8961a0b10435836660ce0',
  agency: 'Singapore Department of Statistics', referenceYear: 2020, updated: '2021-06-18',
  sourceUrl: 'https://data.gov.sg/datasets/d_d95ae740c0f8961a0b10435836660ce0/view',
  licenceUrl: 'https://data.gov.sg/open-data-licence',
};
export function normaliseGeography(value: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error('Missing geographic category');
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
export function prepareCensus(csv: string, metadata: SourceMetadata = CENSUS_SOURCE): DemographicDistribution {
  if (!metadata || !['government-statistics','synthetic-fixture'].includes(metadata.kind) || !Number.isInteger(metadata.referenceYear) || metadata.referenceYear < 1900 || !metadata.datasetId?.trim()) throw new Error('Invalid source metadata');
  const { columns, rows } = parseCsv(csv);
  const countColumns = ['Total','Males','Females'].flatMap(s => ['Total',...AGE_GROUPS].map(a => `${s}_${a}`));
  for (const c of ['Number',...countColumns]) if (!columns.includes(c)) throw new Error(`Missing required column: ${c}`);
  if (!rows.length) throw new Error('Empty census input');
  let nilOrNegligibleCells = 0;
  const parsed = rows.map(r => ({ row: r.row, label: r.values.Number.trim(), counts: Object.fromEntries(countColumns.map(c => {
    const v = r.values[c].trim();
    if (v === '-') { nilOrNegligibleCells++; return [c,0]; }
    if (!/^\d+$/.test(v) || !Number.isSafeInteger(Number(v))) throw new Error(`Invalid population count at row ${r.row}, ${c}`);
    return [c,Number(v)];
  })) }));
  const discrepancies: TotalDiscrepancy[] = [];
  const compare = (row: number, column: string, published: number, parts: number[]) => {
    const calculated = parts.reduce((a,b)=>a+b,0), difference = calculated-published;
    // Diagnostic rounding check; nil/negligible totals can exceed this bound.
    // Report discrepancies without treating the check as a confidence interval.
    const tolerance = (parts.length+1)*10;
    if (!Number.isSafeInteger(calculated)) throw new Error(`Unsafe population total at row ${row}, ${column}`);
    if (difference) discrepancies.push({row,column,published,calculated,difference,tolerance});
  };
  const cells: DemographicCell[] = [], areas = new Set<string>(), zones = new Set<string>();
  let national: typeof parsed[number] | undefined, area: typeof parsed[number] | undefined;
  let areaName = '', areaId = '', children: typeof parsed = [];
  const areaRows: typeof parsed = [];
  const closeArea = () => {
    if (!area) return;
    if (!children.length) throw new Error(`Planning area without subzones at row ${area.row}`);
    for (const c of countColumns) compare(area.row,c,area.counts[c],children.map(x=>x.counts[c]));
  };
  for (const r of parsed) {
    if (!r.label) throw new Error(`Missing geographic category at row ${r.row}`);
    for (const sex of ['Total','Males','Females']) compare(r.row,`${sex}_Total`,r.counts[`${sex}_Total`],AGE_GROUPS.map(a=>r.counts[`${sex}_${a}`]));
    for (const a of ['Total',...AGE_GROUPS]) compare(r.row,`Total_${a}`,r.counts[`Total_${a}`],[r.counts[`Males_${a}`],r.counts[`Females_${a}`]]);
    if (r.label === 'Total') {
      if (national || area) throw new Error('Duplicate or misplaced national total');
      national = r; continue;
    }
    if (/\s*-\s*Total$/i.test(r.label)) {
      closeArea(); area = r; children = [];
      areaName = r.label.replace(/\s*-\s*Total$/i,'').trim(); areaId = normaliseGeography(areaName);
      if (areas.has(areaId)) throw new Error(`Duplicate planning area ${areaId}`);
      areas.add(areaId); areaRows.push(r); continue;
    }
    if (!area || !national) throw new Error(`Subzone without preceding hierarchy at row ${r.row}`);
    const subzone = normaliseGeography(r.label), key = `${areaId}/${subzone}`;
    if (zones.has(key)) throw new Error(`Duplicate subzone ${key}`);
    zones.add(key); children.push(r);
    for (const [prefix,sex] of [['Males','male'],['Females','female']] as const) for (const ageGroup of AGE_GROUPS) cells.push({planningArea:areaId,planningAreaName:areaName,subzone,subzoneName:r.label,ageGroup,sex,count:r.counts[`${prefix}_${ageGroup}`],sourceRow:r.row});
  }
  closeArea();
  if (!national || !areas.size) throw new Error('Missing national/planning area hierarchy');
  for (const c of countColumns) compare(national.row,c,national.counts[c],areaRows.map(x=>x.counts[c]));
  const population = cells.reduce((s,c)=>s+c.count,0);
  if (!Number.isSafeInteger(population)) throw new Error('Population total exceeds safe integer range');
  return {schemaVersion:1,source:{...metadata,rawSha256:createHash('sha256').update(csv).digest('hex'),assumptionIds:['nil-negligible-as-zero']},cells,population,
    audit:{rawRows:rows.length,columns,planningAreas:areas.size,subzones:zones.size,nilOrNegligibleCells,missingValues:0,zeroJointCells:cells.filter(c=>c.count===0).length,publishedNationalTotal:national.counts.Total_Total,discrepancies}};
}
