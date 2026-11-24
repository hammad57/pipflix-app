import {Pressable, ScrollView, View} from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Slider from '../components/Slider';
import ScreenSafeArea from '../components/ui/ScreenSafeArea';
import React, {useEffect, useState, useRef, useCallback, useMemo} from 'react';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {SearchStackParamList} from '../App';
import {providerManager} from '../lib/services/ProviderManager';
import useContentStore from '../lib/zustand/contentStore';
import AppText from '../components/ui/Text';
import LoadingIndicator from '../components/ui/LoadingIndicator';
import IconButton from '../components/ui/IconButton';
import Button from '../components/ui/Button';
import {TVFocusGuide, TVFocusable} from '../components/tv';
import {isTV} from '../lib/tv';
import {useM3Colors} from '../theme/M3PaletteContext';
import {runProviderSearches} from '../lib/search/runProviderSearches';
import type {Post} from '../lib/providers/types';
import type {GenreProviderEntry} from '../lib/search/getAllGenres';
import {
  ProviderStatusStrip,
  type ProviderStatus,
} from '../components/search/ProviderStatusStrip';

type Props = NativeStackScreenProps<SearchStackParamList, 'CategoryResults'>;

interface CategoryPageData {
  title: string;
  Posts: Post[];
  filter: string;
  providerValue: string;
  value: string;
  name: string;
}

type CategoryProvider = GenreProviderEntry & {filterForSlider: string};

const CategoryResults = ({route, navigation}: Props): React.ReactElement => {
  const colors = useM3Colors();
  const {title, entries, searchQuery} = route.params;
  const storeProviders = useContentStore(state => state.installedProviders);

  // Search mode (e.g. 18+): every installed provider. Posts mode: only the
  // providers that declare this category, each with its own filter.
  const providers: CategoryProvider[] = useMemo(() => {
    if (searchQuery) {
      return storeProviders.map(provider => ({
        providerValue: provider.value,
        displayName: provider.display_name || provider.value,
        filter: searchQuery,
        filterForSlider: searchQuery,
      }));
    }
    return entries.map(entry => ({
      ...entry,
      filterForSlider: entry.filter,
    }));
  }, [entries, searchQuery, storeProviders]);

  const [searchData, setSearchData] = useState<CategoryPageData[]>([]);
  const [emptyResults, setEmptyResults] = useState<CategoryPageData[]>([]);
  const [showEmptyResults, setShowEmptyResults] = useState(false);
  const [loading, setLoading] = useState(
    providers.map(item => ({
      name: item.displayName,
      value: item.providerValue,
      isLoading: true,
      error: undefined as string | undefined,
    })),
  );
  const abortController = useRef<AbortController | null>(null);

  const searchDataRef = useRef<CategoryPageData[]>([]);
  const emptyResultsRef = useRef<CategoryPageData[]>([]);

  const updateSearchData = useCallback((newData: CategoryPageData) => {
    searchDataRef.current = [...searchDataRef.current, newData];
    setSearchData(searchDataRef.current);
  }, []);

  const updateEmptyResults = useCallback((newData: CategoryPageData) => {
    emptyResultsRef.current = [...emptyResultsRef.current, newData];
    setEmptyResults(emptyResultsRef.current);
  }, []);

  const updateLoading = useCallback(
    (value: string, updates: Partial<{isLoading: boolean; error: string}>) => {
      setLoading(prev =>
        prev.map(i => (i.value === value ? {...i, ...updates} : i)),
      );
    },
    [],
  );

  const isAllLoaded = useMemo(
    () => loading.every(i => !i.isLoading),
    [loading],
  );

  const failed = useMemo(() => loading.filter(i => i.error), [loading]);

  const statuses: ProviderStatus[] = useMemo(
    () =>
      providers.map(provider => {
        const load = loading.find(i => i.value === provider.providerValue);
        const found = searchData.find(
          i => i.providerValue === provider.providerValue,
        );
        const empty = emptyResults.find(
          i => i.providerValue === provider.providerValue,
        );
        if (load?.error) {
          return {
            value: provider.providerValue,
            displayName: provider.displayName,
            state: 'failed' as const,
          };
        }
        if (found) {
          return {
            value: provider.providerValue,
            displayName: provider.displayName,
            state: 'results' as const,
            count: found.Posts.length,
          };
        }
        if (empty) {
          return {
            value: provider.providerValue,
            displayName: provider.displayName,
            state: 'empty' as const,
          };
        }
        return {
          value: provider.providerValue,
          displayName: provider.displayName,
          state: 'loading' as const,
        };
      }),
    [providers, loading, searchData, emptyResults],
  );

  const fetchProviders = useCallback(
    (targets: CategoryProvider[], signal: AbortSignal) =>
      runProviderSearches({
        providers: targets,
        signal,
        search: (item, providerSignal) =>
          searchQuery
            ? providerManager.getSearchPosts({
                searchQuery,
                page: 1,
                providerValue: item.providerValue,
                signal: providerSignal,
              })
            : providerManager.getPosts({
                filter: item.filter,
                page: 1,
                providerValue: item.providerValue,
                signal: providerSignal,
              }),
        onSettled: (item, outcome) => {
          if ('error' in outcome) {
            console.error(
              `Error fetching category for ${item.displayName}:`,
              outcome.error,
            );
            updateLoading(item.providerValue, {
              isLoading: false,
              error: outcome.error,
            });
            return;
          }
          const newData: CategoryPageData = {
            title: item.displayName,
            Posts: outcome.posts,
            filter: item.filterForSlider,
            providerValue: item.providerValue,
            value: item.providerValue,
            name: item.displayName,
          };
          if (newData.Posts.length > 0) {
            updateSearchData(newData);
          } else {
            updateEmptyResults(newData);
          }
          updateLoading(item.providerValue, {isLoading: false});
        },
      }),
    [searchQuery, updateSearchData, updateEmptyResults, updateLoading],
  );

  const retryFailed = useCallback(() => {
    const signal = abortController.current?.signal;
    if (!signal) {
      return;
    }
    const values = new Set(failed.map(i => i.value));
    failed.forEach(i =>
      updateLoading(i.value, {isLoading: true, error: undefined}),
    );
    fetchProviders(
      providers.filter(p => values.has(p.providerValue)),
      signal,
    );
  }, [failed, providers, fetchProviders, updateLoading]);

  const retryProvider = useCallback(
    (value: string) => {
      const signal = abortController.current?.signal;
      if (!signal) {
        return;
      }
      const provider = providers.find(p => p.providerValue === value);
      if (!provider) {
        return;
      }
      updateLoading(value, {isLoading: true, error: undefined});
      fetchProviders([provider], signal);
    },
    [providers, fetchProviders, updateLoading],
  );

  useEffect(() => {
    if (abortController.current) {
      abortController.current.abort();
    }
    abortController.current = new AbortController();
    const signal = abortController.current.signal;

    searchDataRef.current = [];
    emptyResultsRef.current = [];
    setSearchData([]);
    setEmptyResults([]);
    setShowEmptyResults(false);
    setLoading(
      providers.map(item => ({
        name: item.displayName,
        value: item.providerValue,
        isLoading: true,
        error: undefined as string | undefined,
      })),
    );

    fetchProviders(providers, signal);

    return () => {
      if (abortController.current) {
        abortController.current.abort();
        abortController.current = null;
      }
    };
    // Re-run when the category or its provider set changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, searchQuery]);

  const renderSlider = useCallback(
    (
      item: Pick<CategoryPageData, 'name' | 'value'>,
      isEmptyResult: boolean = false,
    ) => {
      const loadingState = loading.find(i => i.value === item.value);
      const posts = isEmptyResult
        ? emptyResults.find(i => i.providerValue === item.value)?.Posts || []
        : searchData.find(i => i.providerValue === item.value)?.Posts || [];
      const filter =
        searchData.find(i => i.providerValue === item.value)?.filter ||
        emptyResults.find(i => i.providerValue === item.value)?.filter ||
        searchQuery ||
        '';
      return (
        <Slider
          isLoading={loadingState?.isLoading || false}
          key={`${item.value}-${isEmptyResult ? 'empty' : 'data'}`}
          title={item.name}
          posts={posts}
          filter={filter}
          providerValue={item.value}
          isSearch={Boolean(searchQuery)}
          error={loadingState?.error}
        />
      );
    },
    [loading, searchData, emptyResults, searchQuery],
  );

  const searchSliders = useMemo(
    () => searchData.map(item => renderSlider(item, false)),
    [searchData, renderSlider],
  );

  const emptySliders = useMemo(
    () => emptyResults.map(item => renderSlider(item, true)),
    [emptyResults, renderSlider],
  );

  const failedSliders = useMemo(
    () => failed.map(item => renderSlider(item, true)),
    [failed, renderSlider],
  );

  const EmptyResultsButton = isTV ? TVFocusable : Pressable;
  const emptyCount = emptyResults.length + failed.length;

  return (
    <ScreenSafeArea className="h-full w-full bg-m3-background">
      <ScrollView showsVerticalScrollIndicator={false}>
        <View className="mt-6 px-4 flex flex-row items-center gap-x-3">
          {isTV ? (
            <TVFocusable
              accessibilityLabel="Go back"
              accessibilityRole="button"
              hasTVPreferredFocus
              focusScale={1}
              borderRadius={12}
              style={{
                width: 64,
                height: 64,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 12,
              }}
              onPress={() => navigation.goBack()}>
              <MaterialCommunityIcons
                name="arrow-left"
                size={30}
                color={colors.primary}
              />
            </TVFocusable>
          ) : (
            <IconButton
              icon="arrow-left"
              label="Back"
              onPress={() => navigation.goBack()}
            />
          )}
          <AppText
            role="headlineMediumEmphasized"
            className="flex-1 text-m3-on-background"
            numberOfLines={1}>
            {title}
          </AppText>
          {!isAllLoaded && (
            <View className="flex justify-center items-center h-12">
              <LoadingIndicator size={28} />
            </View>
          )}
        </View>

        <ProviderStatusStrip statuses={statuses} onRetry={retryProvider} />

        {isAllLoaded && failed.length > 0 && (
          <View className="px-4 mt-4">
            <Button variant="tonal" compact onPress={retryFailed}>
              {`Retry failed (${failed.length})`}
            </Button>
          </View>
        )}

        <TVFocusGuide autoFocus={false} style={{paddingHorizontal: 16}}>
          {searchSliders}
          {emptyCount > 0 && (
            <EmptyResultsButton
              accessibilityRole="button"
              accessibilityLabel={
                showEmptyResults ? 'Hide empty results' : 'Show empty results'
              }
              accessibilityHint="Providers with no results or errors"
              accessibilityState={{expanded: showEmptyResults}}
              onPress={() => setShowEmptyResults(previous => !previous)}
              style={{
                minHeight: 48,
                padding: 14,
                marginVertical: 12,
                borderRadius: 16,
                backgroundColor: colors.surfaceContainer,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
              }}>
              <AppText
                role="labelLarge"
                style={{flex: 1, color: colors.primary}}>
                {showEmptyResults ? 'Hide empty results' : 'Show empty results'}{' '}
                ({emptyCount})
              </AppText>
              <MaterialCommunityIcons
                name={showEmptyResults ? 'chevron-up' : 'chevron-down'}
                size={24}
                color={colors.primary}
              />
            </EmptyResultsButton>
          )}
          {showEmptyResults && (
            <>
              {emptySliders}
              {failedSliders}
            </>
          )}
        </TVFocusGuide>

        {isAllLoaded &&
          searchData.every(d => !d.Posts || d.Posts.length === 0) && (
            <View className="items-center justify-center py-20 px-8">
              <AppText
                role="titleLargeEmphasized"
                className="text-center text-m3-on-surface-variant">
                {failed.length > 0 && failed.length === loading.length
                  ? 'Could not load this category from any provider'
                  : `No ${title} titles found`}
              </AppText>
              {failed.length > 0 && (
                <AppText
                  role="bodyMedium"
                  className="mt-2 text-center text-m3-on-surface-variant">
                  {failed.length === 1
                    ? '1 source failed to load.'
                    : `${failed.length} sources failed to load.`}
                </AppText>
              )}
            </View>
          )}
        <View className="h-16" />
      </ScrollView>
    </ScreenSafeArea>
  );
};

export default CategoryResults;
