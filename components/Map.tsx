import React from 'react';
import { View, StyleSheet } from 'react-native';
import MapView, { Polyline, UrlTile, Marker } from 'react-native-maps';
import { COLORS as APP_COLORS } from '../constants/colors';

interface IMapProps {
  routeCoords?: { latitude: number; longitude: number }[];
  COLORS?: {
    primary: string;
    [key: string]: string;
  };
}

const DEFAULT_REGION = {
  latitude: 10.7769,
  longitude: 106.7009,
  latitudeDelta: 0.015,
  longitudeDelta: 0.015,
};

export default function Map({ routeCoords = [], COLORS = APP_COLORS }: IMapProps) {
  const hasCoords = routeCoords && routeCoords.length > 0;
  const lastCoord = hasCoords ? routeCoords[routeCoords.length - 1] : null;

  const currentRegion = lastCoord
    ? {
        latitude: lastCoord.latitude,
        longitude: lastCoord.longitude,
        latitudeDelta: 0.012,
        longitudeDelta: 0.012,
      }
    : DEFAULT_REGION;

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        region={currentRegion}
        showsUserLocation={true}
        followsUserLocation={!hasCoords}
        showsMyLocationButton={true}
        showsCompass={true}
      >
        <UrlTile
          urlTemplate="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maximumZ={19}
          flipY={false}
        />
        {hasCoords && (
          <>
            <Polyline
              coordinates={routeCoords}
              strokeColor={COLORS?.primary || '#E31B23'}
              strokeWidth={5}
            />
            {routeCoords[0] && (
              <Marker
                coordinate={routeCoords[0]}
                title="Điểm xuất phát"
                pinColor="#34C759"
              />
            )}
            {lastCoord && (
              <Marker
                coordinate={lastCoord}
                title="Vị trí hiện tại"
                pinColor="#E31B23"
              />
            )}
          </>
        )}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    borderRadius: 12,
  },
  map: {
    width: '100%',
    height: '100%',
  },
});
