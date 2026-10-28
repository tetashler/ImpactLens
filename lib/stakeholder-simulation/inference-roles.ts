import type {StakeholderRoleDefinition} from './contract.ts';
const role=(id:string,title:string,interest:string):StakeholderRoleDefinition=>({id,title,description:`Fictional analytical perspective: ${title}. No real individual or organisation is represented.`,interests:[interest],constraints:['No authority to represent an actual institution or population.'],expertise:['Hypothetical planning questions within the assigned role only.'],uncertainties:['Real behaviour, policy details and future outcomes remain unknown.'],classification:'fictional-role'});
export function getInferenceRoles():StakeholderRoleDefinition[]{return [
 role('sg-consumer','Singapore consumer','Clarify product coverage and household planning uncertainties.'),
 role('sg-importer','Singapore importer','Examine declared tax assumptions and commercial planning.'),
 role('local-retailer','Singapore retailer','Consider possible sourcing choices without predicting prices.'),
 role('foreign-supplier','Foreign supplier','Explore cross-border commercial questions from outside Singapore.'),
 role('sg-commuter','Singapore commuter','Consider supplied modelled accessibility separately from hypothetical preferences.'),
 role('station-resident','Resident near a proposed station','Explore local access questions without assuming an observed home address.'),
 role('local-business','Local business operator','Consider neighbourhood planning questions without forecasting revenue.'),
 role('transport-observer','Transport planning observer','Distinguish actual route calculations from fictional reactions.')];}
