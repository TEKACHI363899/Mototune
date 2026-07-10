import { MapPin } from 'lucide-react-native';
import React from 'react';
import { Text, View } from 'react-native';

// Trình biên dịch Web sẽ tự động gọi file này và BỎ QUA hoàn toàn react-native-maps
export default function Map({ routeCoords, COLORS }: any) {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#222' }}>
      <MapPin size={40} color={COLORS.textDim} />
      <Text style={{ color: COLORS.textDim, marginTop: 10 }}>Bản đồ OSM sẽ hiển thị trên App Mobile</Text>
    </View>
  );
}