import {parseStakeholderInput,object,ensure,type StakeholderSimulationInputV1,type SimulationOptionsV1} from './contract.ts';
import {getStakeholderRoles} from './roles.ts';
/** Independent proposed Phase 7E boundary; does not import or define its application-wide contract. */
export function convertExperimentSnapshot(value:unknown,options:{stakeholderRoleIds:string[];simulationOptions:SimulationOptionsV1}):StakeholderSimulationInputV1 {
  const experiment=object(value,['version','experimentId','scenarioIdentity','configurationIdentity','configuration','evidence']);ensure(experiment.version===1,'Unsupported experiment compatibility version');
  const configuration=object(experiment.configuration,['question','assumptions','horizonYears']);
  ensure(Array.isArray(options.stakeholderRoleIds)&&new Set(options.stakeholderRoleIds).size===options.stakeholderRoleIds.length);const catalogue=getStakeholderRoles();const stakeholderRoles=options.stakeholderRoleIds.map(id=>{const role=catalogue.find(r=>r.id===id);ensure(role,'Unknown compatible stakeholder role');return role;});
  return parseStakeholderInput({version:1,experimentId:experiment.experimentId,scenarioIdentity:experiment.scenarioIdentity,configurationIdentity:experiment.configurationIdentity,question:configuration.question,assumptions:configuration.assumptions,horizonYears:configuration.horizonYears,evidence:experiment.evidence,stakeholderRoles,simulationOptions:options.simulationOptions});
}
