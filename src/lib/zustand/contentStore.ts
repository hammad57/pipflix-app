import {create} from 'zustand';
import {persist, createJSONStorage} from 'zustand/middleware';
import {MMKVLoader} from 'react-native-mmkv-storage';
// import {ProvidersList, providersList} from '../constants';
import {extensionStorage, ProviderExtension} from '../storage/extensionStorage';
import {settingsStorage} from '../storage/SettingsStorage';
import {sortInstalledProviders} from '../providerOrder';

const storage = new MMKVLoader().initialize();

export interface Content {
  provider: ProviderExtension;
  setProvider: (type: ProviderExtension) => void;
  // Providers ticked in the provider drawer. Search runs only over these.
  // null = never chosen yet, which means every installed provider.
  selectedProviderValues: string[] | null;
  toggleSelectedProvider: (value: string) => void;
  selectAllProviders: () => void;
  // Extension-based provider management
  installedProviders: ProviderExtension[];
  availableProviders: ProviderExtension[];
  setInstalledProviders: (providers: ProviderExtension[]) => void;
  setAvailableProviders: (providers: ProviderExtension[]) => void;
  activeExtensionProvider: ProviderExtension | null;
  setActiveExtensionProvider: (provider: ProviderExtension | null) => void;
}

const useContentStore = create<Content>()(
  persist(
    (set, _get) => ({
      provider: {
        value: '',
        display_name: '',
        type: 'global',
        installed: false,
        disabled: false,
        version: '0.0.1',
        icon: '',
        source: {author: '', url: ''},
        installedAt: 0,
        lastUpdated: 0,
      },
      installedProviders: sortInstalledProviders(
        extensionStorage.getInstalledProviders(),
        settingsStorage.getProviderOrder(),
      ),
      availableProviders: [],
      activeExtensionProvider: null,

      setProvider: (provider: ProviderExtension) => set({provider}),

      selectedProviderValues: null,

      toggleSelectedProvider: (value: string) =>
        set(state => {
          // Resolve the effective set first: null means "all installed".
          const effective =
            state.selectedProviderValues ??
            state.installedProviders.map(p => p.value);
          const next = effective.includes(value)
            ? effective.filter(v => v !== value)
            : [...effective, value];
          return {selectedProviderValues: next};
        }),

      selectAllProviders: () =>
        set(state => ({
          selectedProviderValues: state.installedProviders.map(p => p.value),
        })),

      // Kept in the order the user dragged them to in the provider drawer.
      setInstalledProviders: (providers: ProviderExtension[]) =>
        set({
          installedProviders: sortInstalledProviders(
            providers,
            settingsStorage.getProviderOrder(),
          ),
        }),

      setAvailableProviders: (providers: ProviderExtension[]) =>
        set({availableProviders: providers}),

      setActiveExtensionProvider: (provider: ProviderExtension | null) =>
        set({activeExtensionProvider: provider}),
    }),
    {
      name: 'content-storage',
      storage: createJSONStorage(() => storage as any), // Only persist certain fields
      partialize: state => ({
        provider: state.provider,
        selectedProviderValues: state.selectedProviderValues,
        activeExtensionProvider: state.activeExtensionProvider,
      }),
    },
  ),
);

export default useContentStore;

/**
 * Provider values a search runs over: the ticked ones. null (never chosen)
 * means every installed provider; values of uninstalled providers are
 * ignored. Returns [] only when the user unticked every provider.
 */
export const getSearchProviderValues = (
  installed: ProviderExtension[],
  selected: string[] | null,
): string[] => {
  if (selected === null) return installed.map(p => p.value);
  const wanted = new Set(selected);
  return installed.filter(p => wanted.has(p.value)).map(p => p.value);
};
