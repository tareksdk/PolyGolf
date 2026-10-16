import {readFile} from 'node:fs/promises';
import {setTimeout as delay} from 'node:timers/promises';

// macOS can cancel a read in a Desktop/iCloud checkout. Do not turn a
// temporary read failure into a false missing-asset response.
export async function readLocalFile(path, encoding, read = readFile) {
  for (let attempt = 0; ; attempt++) {
    try { return await read(path, encoding); }
    catch (error) {
      if (attempt >= 3 || !['ECANCELED','EAGAIN','EBUSY'].includes(error.code)) throw error;
      await delay(30 * (attempt + 1));
    }
  }
}
