import React, { memo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ActivityIndicator,
} from 'react-native';
import { IProfileStats } from '../../interfaces/social';
import { HIGTheme } from '../../constants/theme';

interface IProfileStatsRowProps {
  stats: IProfileStats;
  loading?: boolean;
}

const ProfileStatsRow = memo(({ stats, loading = false }: IProfileStatsRowProps) => {
  const theme = 'dark';
  const colors = HIGTheme[theme];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={colors.systemRed} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { borderTopColor: colors.separator, borderBottomColor: colors.separator }]}>
      <View style={styles.statBox}>
        <Text style={[styles.statNumber, { color: colors.label }]}>{stats.postsCount || 0}</Text>
        <Text style={[styles.statLabel, { color: colors.secondaryLabel }]}>Bài viết</Text>
      </View>

      <View style={[styles.divider, { backgroundColor: colors.separator }]} />

      <View style={styles.statBox}>
        <Text style={[styles.statNumber, { color: colors.label }]}>{stats.friendsCount || 0}</Text>
        <Text style={[styles.statLabel, { color: colors.secondaryLabel }]}>Bạn bè</Text>
      </View>

      <View style={[styles.divider, { backgroundColor: colors.separator }]} />

      <View style={styles.statBox}>
        <Text style={[styles.statNumber, { color: colors.label }]}>{stats.tripsCount || 0}</Text>
        <Text style={[styles.statLabel, { color: colors.secondaryLabel }]}>Hành trình</Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginVertical: 12,
  },
  loadingContainer: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  divider: {
    width: 1,
    height: 24,
  },
});

export default ProfileStatsRow;
