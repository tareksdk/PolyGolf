import { getHole } from './courses.js';
import { getGolfHole } from './golf-courses.js';
import { planRoomBotHole } from './room-bots.js';

let hole;
let key;

self.onmessage = ({ data }) => {
  try {
    const layout = [data.mode,data.course,data.index].join(':');
    if (layout !== key) {
      hole = (data.mode === 'golf' ? getGolfHole : getHole)(data.course,data.index);
      key = layout;
    }
    self.postMessage({ key:data.key, plan:planRoomBotHole(data.member,hole,data.index) });
  } catch {
    self.postMessage({ key:data.key });
  }
};
