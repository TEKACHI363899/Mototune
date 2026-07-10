import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { Wrench } from 'lucide-react-native';
import { IBike } from '../../interfaces/bike';
import { MAINTENANCE_PARTS } from '../../constants/garage';
import { COLORS } from '../../constants/colors';

interface IMaintenanceStatusProps {
  bikeObj: IBike;
  onOpenPartResetModal: (partId: string, partName: string) => void;
}

export default function MaintenanceStatus({ bikeObj, onOpenPartResetModal }: IMaintenanceStatusProps) {
  const currentOdo = bikeObj.odo || 0;

  return (
    <View style={styles.healthDashboardCard}>
      <View style={styles.dashHeader}>
        <Wrench size={24} color={COLORS.textDim} />
        <Text style={styles.dashTitle}>TÌNH TRẠNG HAO MÒN</Text>
      </View>
      <View style={styles.partsContainer}>
        {MAINTENANCE_PARTS.map((part) => { 
          const Icon = part.icon; 
          // Default fallbacks to prevent errors if maintenance object or property is undefined
          const maintenanceObj = bikeObj.maintenance || { oil: 0, airFilter: 0, sparkPlug: 0, coolant: 0, chain: 0, brakes: 0 };
          const lastService = maintenanceObj[part.id] ?? (part.id === 'oil' ? bikeObj.lastOilChangeOdo || 0 : 0); 
          const kmPassed = currentOdo - lastService; 
          const kmLeft = part.interval - kmPassed; 
          const progress = Math.min(Math.max(kmPassed / part.interval, 0), 1) * 100; 
          const isDanger = kmLeft <= 0; 
          const isWarning = kmLeft > 0 && kmLeft <= (part.interval * 0.15); 
          const barColor = isDanger ? COLORS.primary : isWarning ? COLORS.warning : COLORS.safe; 
          
          return (
            <View key={part.id} style={styles.partItem}>
              <View style={styles.partHeader}>
                <View style={styles.partInfoRow}>
                  <Icon size={18} color={barColor} />
                  <Text style={styles.partName}>{part.name}</Text>
                </View>
                <Text style={[styles.partStatus, { color: barColor }]}>
                  {isDanger ? 'THAY NGAY!' : `Còn ${kmLeft.toLocaleString('vi-VN')} km`}
                </Text>
              </View>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${progress}%`, backgroundColor: barColor }]} />
              </View>
              
              <TouchableOpacity 
                style={styles.resetPartBtn} 
                onPress={() => onOpenPartResetModal(part.id, part.name)}
              >
                <Text style={styles.resetPartText}>Ghi nhận thay mới</Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  healthDashboardCard: { backgroundColor: COLORS.card, borderRadius: 15, padding: 20, borderWidth: 1, borderColor: '#333', marginBottom: 15 },
  dashHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 15 },
  dashTitle: { color: 'white', fontWeight: 'bold', fontSize: 16, letterSpacing: 1 },
  partsContainer: { gap: 20 },
  partItem: { borderBottomWidth: 1, borderBottomColor: '#222', paddingBottom: 15 },
  partHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  partInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  partName: { color: 'white', fontWeight: 'bold', fontSize: 15 },
  partStatus: { fontSize: 13, fontWeight: 'bold' },
  progressBarBg: { height: 8, backgroundColor: '#222', borderRadius: 4, overflow: 'hidden', marginBottom: 12 },
  progressBarFill: { height: '100%', borderRadius: 4 },
  resetPartBtn: { alignSelf: 'flex-end', paddingHorizontal: 15, paddingVertical: 6, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, borderWidth: 1, borderColor: '#333' },
  resetPartText: { color: COLORS.textDim, fontSize: 12, fontWeight: 'bold' }
});
