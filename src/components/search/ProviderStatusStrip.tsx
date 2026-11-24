import React from 'react';
import {ScrollView, Text, TouchableOpacity} from 'react-native';
import {useM3Colors} from '../../theme/M3PaletteContext';

export type ProviderStatusState = 'loading' | 'results' | 'empty' | 'failed';

export interface ProviderStatus {
  value: string;
  displayName: string;
  state: ProviderStatusState;
  count?: number;
}

/**
 * One chip per provider, so the user can see at a glance that every ticked
 * provider was searched and which one has the title. Failed chips are
 * tappable to retry just that provider.
 */
export const ProviderStatusStrip = ({
  statuses,
  onRetry,
}: {
  statuses: ProviderStatus[];
  onRetry?: (value: string) => void;
}) => {
  const colors = useM3Colors();
  if (statuses.length === 0) {
    return null;
  }
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{marginTop: 12}}
      contentContainerStyle={{gap: 8, paddingHorizontal: 16}}>
      {statuses.map(status => {
        const label =
          status.state === 'loading'
            ? 'searching…'
            : status.state === 'results'
              ? `${status.count ?? 0} found`
              : status.state === 'empty'
                ? 'no results'
                : 'failed • tap to retry';
        const backgroundColor =
          status.state === 'results'
            ? colors.primaryContainer
            : status.state === 'failed'
              ? colors.errorContainer
              : colors.surfaceContainerHigh;
        const color =
          status.state === 'results'
            ? colors.onPrimaryContainer
            : status.state === 'failed'
              ? colors.onErrorContainer
              : colors.onSurfaceVariant;
        return (
          <TouchableOpacity
            key={status.value}
            disabled={status.state !== 'failed' || !onRetry}
            onPress={() => onRetry?.(status.value)}
            accessibilityRole="button"
            accessibilityLabel={`${status.displayName}: ${label}`}
            style={{
              backgroundColor,
              borderRadius: 16,
              paddingHorizontal: 12,
              paddingVertical: 7,
            }}>
            <Text style={{color, fontSize: 12, fontWeight: '700'}}>
              {status.displayName} • {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};
