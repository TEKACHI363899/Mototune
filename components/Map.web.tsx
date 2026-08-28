import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { Compass, Navigation } from 'lucide-react-native';
import { COLORS as APP_COLORS } from '../constants/colors';

interface IMapProps {
  routeCoords?: { latitude: number; longitude: number }[];
  COLORS?: {
    primary: string;
    [key: string]: string;
  };
}

export default function Map({ routeCoords = [], COLORS = APP_COLORS }: IMapProps) {
  const hasCoords = routeCoords && routeCoords.length > 0;
  const lastCoord = hasCoords ? routeCoords[routeCoords.length - 1] : { latitude: 10.7769, longitude: 106.7009 };

  // Generate OpenStreetMap embed iframe URL
  const osmUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${lastCoord.longitude - 0.01}%2C${lastCoord.latitude - 0.01}%2C${lastCoord.longitude + 0.01}%2C${lastCoord.latitude + 0.01}&layer=mapnik&marker=${lastCoord.latitude}%2C${lastCoord.longitude}`;

  return (
    <View style={styles.container}>
      <iframe
        title="MotoTune Web Map"
        src={osmUrl}
        style={{
          width: '100%',
          height: '100%',
          border: 0,
          borderRadius: 12,
        }}
      />
      {hasCoords && (
        <View style={styles.badge}>
          <Navigation size={14} color="#FFFFFF" />
          <Text style={styles.badgeText}>{routeCoords.length} điểm GPS</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 12,
    backgroundColor: '#121214',
  },
  badge: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
});
