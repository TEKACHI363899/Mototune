import React, { memo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Activity, Check, RefreshCw, AlertCircle, Play } from 'lucide-react-native';
import { ILastJourneyData } from '../../interfaces/social';
import { HIGTheme, HIGSpacing, HIGTypography } from '../../constants/theme';

interface ILastJourneyCardProps {
  journey: ILastJourneyData | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onStartNewJourney: () => void;
}

const formatDuration = (seconds: number): string => {
  if (!seconds || isNaN(seconds)) return '00:00:00';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const formatTimeLabel = (timestamp: number): string => {
  if (!timestamp) return 'GẦN ĐÂY';
  const date = new Date(timestamp);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const timeStr = date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

  if (isToday) {
    return `HÔM NAY / ${timeStr}`;
  }
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return `HÔM QUA / ${timeStr}`;
  }
  return `${date.toLocaleDateString('vi-VN')} / ${timeStr}`;
};

const LastJourneyCard = memo(({
  journey,
  loading,
  error,
  onRetry,
  onStartNewJourney,
}: ILastJourneyCardProps) => {
  const theme = 'dark';
  const colors = HIGTheme[theme];

  return (
    <View style={[styles.card, { backgroundColor: '#141416', borderColor: '#222224' }]}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.headerTitleGroup}>
          <View style={styles.iconBox}>
            <Activity size={18} color="#E31B23" />
          </View>
          <Text style={styles.headerTitle}>LAST JOURNEY</Text>
        </View>
        <Text style={styles.headerTime}>
          {journey?.startTime ? formatTimeLabel(journey.startTime) : '--/--'}
        </Text>
      </View>

      {/* Body State Handling */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="small" color="#E31B23" />
          <Text style={styles.stateText}>Đang tải dữ liệu hành trình...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <AlertCircle size={20} color="#E31B23" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={onRetry}>
            <RefreshCw size={14} color="#FFFFFF" />
            <Text style={styles.retryText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      ) : !journey ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Chưa có hành trình nào được ghi lại</Text>
          <Text style={styles.emptySubText}>Bắt đầu chuyến đi đầu tiên để theo dõi thông số</Text>
        </View>
      ) : (
        <View style={styles.contentBody}>
          {/* Progress Timeline Bar */}
          <View style={styles.timelineWrapper}>
            <View style={styles.startDot} />
            <View style={styles.trackLine}>
              <View style={[styles.activeTrack, { width: `${Math.min(Math.max(journey.progressRatio * 100, 10), 100)}%` }]} />
            </View>
            <View style={styles.endDot} />
          </View>

          {/* Large Numbers Row */}
          <View style={styles.statsRow}>
            <View style={styles.statCol}>
              <Text style={styles.statNumber}>{journey.distanceKm.toFixed(1)} KM</Text>
              <Text style={styles.statLabel}>DISTANCE</Text>
            </View>
            <View style={styles.statCol}>
              <Text style={styles.statNumber}>{formatDuration(journey.durationSeconds)}</Text>
              <Text style={styles.statLabel}>RIDE TIME</Text>
            </View>
          </View>
        </View>
      )}

      {/* Start New Journey CTA Button */}
      <TouchableOpacity
        style={styles.startJourneyBtn}
        onPress={onStartNewJourney}
        activeOpacity={0.85}
      >
        <Check size={18} color="#FFFFFF" strokeWidth={3} />
        <Text style={styles.startJourneyText}>START NEW JOURNEY</Text>
      </TouchableOpacity>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  headerTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(227, 27, 35, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(227, 27, 35, 0.3)',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  headerTime: {
    color: '#8E8E93',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  contentBody: {
    marginBottom: 18,
  },
  timelineWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0A0A0C',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1C1C1E',
  },
  startDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#E31B23',
    shadowColor: '#E31B23',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  trackLine: {
    flex: 1,
    height: 3,
    backgroundColor: '#2C2C2E',
    marginHorizontal: 8,
    borderRadius: 2,
    overflow: 'hidden',
  },
  activeTrack: {
    height: '100%',
    backgroundColor: '#E31B23',
  },
  endDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statCol: {
    flex: 1,
  },
  statNumber: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  statLabel: {
    color: '#8E8E93',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  startJourneyBtn: {
    backgroundColor: '#E31B23',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    shadowColor: '#E31B23',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  startJourneyText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  centerContainer: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  stateText: {
    color: '#8E8E93',
    fontSize: 13,
  },
  errorText: {
    color: '#E31B23',
    fontSize: 13,
    textAlign: 'center',
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#2C2C2E',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 4,
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyContainer: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  emptyText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  emptySubText: {
    color: '#8E8E93',
    fontSize: 12,
  },
});

export default LastJourneyCard;
