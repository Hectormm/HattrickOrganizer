import AsyncStorage from '@react-native-async-storage/async-storage';
import {errorCodes, isErrorWithCode, keepLocalCopy, pick, types} from '@react-native-documents/picker';

const stateKey = 'hattrick-organizer-state';
type PersistedState = Record<string, unknown>;

export async function loadAppState(): Promise<PersistedState | null> {
  const saved = await AsyncStorage.getItem(stateKey);
  return saved ? JSON.parse(saved) as PersistedState : null;
}

export async function saveAppState(state: PersistedState): Promise<void> {
  await AsyncStorage.setItem(stateKey, JSON.stringify(state));
}

export async function pickHrfFile(): Promise<string | null> {
  try {
    const [picked] = await pick({type: [types.allFiles]});
    if (!picked.name?.toLowerCase().endsWith('.hrf')) {
      throw new Error('Selecciona un archivo con extensión .hrf.');
    }

    const [copy] = await keepLocalCopy({
      files: [{uri: picked.uri, fileName: picked.name}],
      destination: 'cachesDirectory',
    });
    if (copy.status !== 'success') throw new Error(copy.copyError);

    const response = await fetch(copy.localUri);
    return response.text();
  } catch (error) {
    if (isErrorWithCode(error) && error.code === errorCodes.OPERATION_CANCELED) return null;
    throw error;
  }
}
