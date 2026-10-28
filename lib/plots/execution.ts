/** Execution permission is separate from the retained technical draft and planner identity. */
export type MrtExecutionBinding =
  | {kind:'plot';revision:number;key:string;routeId:string;pointIds:string[];planId:string}
  | {kind:'advanced';planId:string};

export function acceptsMrtBinding(
  binding:MrtExecutionBinding|null,
  plan:{capabilityId:string;planId:string}|null|undefined,
  plot:{revision:number;key:string},
):boolean {
  return !!binding&&plan?.capabilityId==='mrt-accessibility-v1'&&binding.planId===plan.planId
    &&(binding.kind==='advanced'||binding.revision===plot.revision&&binding.key===plot.key);
}
