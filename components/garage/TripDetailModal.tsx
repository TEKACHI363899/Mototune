import React, { memo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  SafeAreaView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { X, Navigation, Clock, Compass } from 'lucide-react-native';
import { IFriendTrip } from '../../interfaces/social';
import Map from '../Map';
import { HIGTheme } from '../../constants/theme';

interface ITripDetailModalProps {
  visible: boolean;
  trip: IFriendTrip | null;
  onClose: () => void;
}

const formatDuration = (seconds: number): string => {
  if (!seconds || isNaN(seconds)) return '00:00:00';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const TripDetailModal = memo(({
  visible,
  trip,
  onClose,
}: ITripDetailModalProps) => {
  const theme = 'dark';
  const colors = HIGTheme[theme];

  if (!trip) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: colors.systemBackground }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.separator }]}>
          <Text style={[styles.headerTitle, { color: colors.label }]}>CHI TIẾT HÀNH TRÌNH</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <X size={24} color={colors.label} />
          </TouchableOpacity>
        </View>

        {/* Map View */}
        <View style={styles.mapContainer}>
          {trip.coordinates && trip.coordinates.length > 0 ? (
            <Map routeCoords={trip.coordinates} />
          ) : (
            <View style={styles.noMapPlaceholder}>
              <Compass size={40} color={colors.secondaryLabel} />
              <Text style={[styles.noMapText, { color: colors.secondaryLabel }]}>
                Không có dữ liệu GPS chi tiết cho chuyến đi này
              </Text>
            </View>
          )}
        </View>

        {/* Details Card */}
        <View style={[styles.infoCard, { backgroundColor: colors.secondarySystemBackground, borderTopColor: colors.separator }]}>
          <View style={styles.riderRow}>
            <Text style={[styles.riderName, { color: colors.label }]}>{trip.userName}</Text>
            <View style={[styles.bikeBadge, { backgroundColor: 'rgba(227, 27, 35, 0.15)' }]}>
              <Text style={[styles.bikeText, { color: colors.systemRed }]}>{trip.bikeModel}</Text>
            </View>
          </View>

          <Text style={[styles.routeCaption, { color: colors.secondaryLabel }]}>
            {trip.routeCaption}
          </Text>

          {/* Metrics */}
          <View style={styles.metricsGrid}>
            <View style={styles.metricBox}>
              <Navigation size={18} color={colors.systemRed} />
              <Text style={[styles.metricVal, { color: colors.label }]}>
                {trip.distanceKm.toFixed(2)} KM
              </Text>
              <Text style={[styles.metricLbl, { color: colors.secondaryLabel }]}>QUÃNG ĐƯỜNG</Text>
            </View>

            <View style={styles.metricBox}>
              <Clock size={18} color={colors.systemRed} />
              <Text style={[styles.metricVal, { color: colors.label }]}>
                {formatDuration(trip.durationSeconds)}
              </Text>
              <Text style={[styles.metricLbl, { color: colors.secondaryLabel }]}>THỜI GIAN CHẠY</Text>
            </View>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
  },
  closeBtn: {
    padding: 4,
  },
  mapContainer: {
    flex: 1,
    backgroundColor: '#111',
  },
  noMapPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    padding: 20,
  },
  noMapText: {
    fontSize: 13,
    textAlign: 'center',
  },
  infoCard: {
    padding: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 14,
  },
  riderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  riderName: {
    fontSize: 18,
    fontWeight: '900',
  },
  bikeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  bikeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  routeCaption: {
    fontSize: 14,
    lineHeight: 20,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 6,
  },
  metricBox: {
    flex: 1,
    backgroundColor: '#141416',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#222224',
  },
  metricVal: {
    fontSize: 16,
    fontWeight: '900',
  },
  metricLbl: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});

export default TripDetailModal;
