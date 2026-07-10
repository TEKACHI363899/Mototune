import React from 'react';
import MapView, { Polyline, UrlTile } from 'react-native-maps';

// Trình biên dịch của iOS/Android sẽ tự động gọi file này
export default function Map({ routeCoords, COLORS }: any) {
  if (!routeCoords || routeCoords.length === 0) return null;

  return (
    <MapView 
      style={{ width: '100%', height: '100%' }}
      region={{
        latitude: routeCoords[routeCoords.length - 1].latitude,
        longitude: routeCoords[routeCoords.length - 1].longitude,
        latitudeDelta: 0.01, longitudeDelta: 0.01
      }}
      showsUserLocation={true}
      followsUserLocation={true}
    >
      <UrlTile
        urlTemplate="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        maximumZ={19}
        flipY={false}
      />
      <Polyline coordinates={routeCoords} strokeColor={COLORS.primary} strokeWidth={5} />
    </MapView>
  );
}