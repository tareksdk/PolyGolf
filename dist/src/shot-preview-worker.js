import { previewTask } from './shot-preview.js';
let hole;
self.onmessage = ({data}) => {
  if (data.hole) hole = data.hole;
  const task = previewTask(hole, data.ball, data.dir, data.power, data.options);
  while (!task.step(512)) {}
  const points = task.result();
  self.postMessage({id:data.id, points}, [points.buffer]);
};
