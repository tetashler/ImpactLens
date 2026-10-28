export const SINGAPORE_BOUNDS:[[number,number],[number,number]]=[[103.62,1.235],[104.03,1.465]];
export const LANDING_CAMERA={center:[103.829,1.285] as [number,number],zoom:15.65,pitch:52,bearing:-22};
export interface CameraCommand {id:number;target:'singapore'|'landing'}
export interface CameraPort {stop():unknown;fitBounds(bounds:[[number,number],[number,number]],options:Record<string,unknown>):unknown;easeTo(options:Record<string,unknown>):unknown}
export class CameraCoordinator {
  private latest:CameraCommand|null=null;
  private applied=new WeakMap<CameraPort,number>();
  request(command:CameraCommand):void {
    if(!Number.isSafeInteger(command.id)||command.id<0||!['singapore','landing'].includes(command.target))throw new Error('Invalid map camera command');
    if(!this.latest||command.id>this.latest.id)this.latest={...command};
  }
  apply(map:CameraPort|null,loaded:boolean,reducedMotion:boolean):boolean {
    if(!map||!loaded||!this.latest||this.applied.get(map)===this.latest.id)return false;
    if(this.latest.target==='singapore')fitSingapore(map,reducedMotion);
    else {map.stop();map.easeTo({...LANDING_CAMERA,center:[...LANDING_CAMERA.center],duration:reducedMotion||this.latest.id===0?0:650});}
    this.applied.set(map,this.latest.id);return true;
  }
}
export function fitSingapore(map:CameraPort,reducedMotion:boolean):void {
  map.stop();map.fitBounds(structuredClone(SINGAPORE_BOUNDS),{padding:45,pitch:15,bearing:0,duration:reducedMotion?0:650});
}
