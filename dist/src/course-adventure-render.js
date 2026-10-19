export function buildLongCourseScenery(w) { w.courseAdventure=null; }
export function installCourseAdventures(ui) {
 const w=ui.world,load=w.load.bind(w);
 w.load=h=>{if(w.cameraHold===w.adventureMoment)w.cameraHold=null;w.adventureMoment=null;w.courseAdventure=null;return load(h);};
}
