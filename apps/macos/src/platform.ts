import {NativeModules} from 'react-native';

type PersistedState = Record<string, unknown>;

export async function loadAppState(): Promise<PersistedState | null> {
  const nativeStorage = NativeModules?.HOStorage;
  if (nativeStorage) return nativeStorage.loadState();
  if (typeof window === 'undefined') return null;

  const saved = window.localStorage.getItem('hattrick-organizer-state');
  return saved ? JSON.parse(saved) as PersistedState : null;
}

export async function saveAppState(state: PersistedState): Promise<void> {
  const nativeStorage = NativeModules?.HOStorage;
  if (nativeStorage) {
    await nativeStorage.saveState(state);
    return;
  }
  if (typeof window !== 'undefined') window.localStorage.setItem('hattrick-organizer-state', JSON.stringify(state));
}

export async function pickHrfFile(): Promise<string | null> {
  const nativePicker = NativeModules?.HODocumentPicker;
  if (nativePicker) return nativePicker.pickHRF();
  if (typeof document === 'undefined') return null;

  return new Promise(resolve => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.hrf,text/plain';
    input.onchange = async () => {
      const file = input.files?.[0];
      resolve(file ? file.text() : null);
    };
    input.oncancel = () => resolve(null);
    input.click();
  });
}
