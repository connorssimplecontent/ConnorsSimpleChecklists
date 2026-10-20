// Picks the right store: Firestore when signed in, localStorage in guest mode.
import { isFirebaseConfigured } from '../config/firebase';
import * as cloud from './dbService';
import * as local from './localStore';

export function getStore(me) {
  return me && isFirebaseConfigured ? cloud : local;
}

export { cloud, local };
