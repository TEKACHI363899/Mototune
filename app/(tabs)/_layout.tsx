import { Tabs, useRouter } from 'expo-router';
import { Bike, Compass, Home, Map, ShoppingBag, Wrench } from 'lucide-react-native';
import { useEffect, useRef } from 'react';
import { Animated, Dimensions, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { HIGTheme, HIGTouchTarget } from '@/constants/theme';

const { width } = Dimensions.get('window');

// HE THONG MENU TUY CHINH 5 COT VOI NUT CUU HO O CHINH GIUA
function MotoTabBar({ state, descriptors, navigation }: any) {
  const router = useRouter();
  const translateX = useRef(new Animated.Value(0)).current;
  const theme = 'dark';
  const colors = HIGTheme[theme];
  
  // Chia đều chiều rộng cho 5 ô (Garage, Bào Tour, CỨU HỘ [Center], Chợ, Cộng đồng)
  const totalSlots = 5;
  const tabWidth = width / totalSlots;

  const getSlotIndex = (routeIndex: number) => {
    // Route 0 (index) -> Slot 0
    // Route 1 (journey) -> Slot 1
    // Route 2 (marketplace) -> Slot 3
    // Route 3 (explore) -> Slot 4
    return routeIndex < 2 ? routeIndex : routeIndex + 1;
  };

  useEffect(() => {
    const targetSlot = getSlotIndex(state.index);
    Animated.spring(translateX, {
      toValue: targetSlot * tabWidth,
      useNativeDriver: true,
      bounciness: 12,
      speed: 14,
    }).start();
  }, [state.index, tabWidth]);

  const leftRoutes = state.routes.slice(0, 2);
  const rightRoutes = state.routes.slice(2, 4);

  const renderTabItem = (route: any, routeIndex: number) => {
    const { options } = descriptors[route.key];
    const isFocused = state.index === routeIndex;

    const onPress = () => {
      const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
      if (!isFocused && !event.defaultPrevented) {
        navigation.navigate(route.name);
      }
    };

    let Icon = Home;
    let label = 'Garage';
    if (route.name === 'journey') { Icon = Map; label = 'Bào Tour'; }
    if (route.name === 'marketplace') { Icon = ShoppingBag; label = 'Chợ'; }
    if (route.name === 'explore') { Icon = Compass; label = 'Cộng đồng'; }

    if (options.href === null) return null;

    return (
      <TouchableOpacity
        key={route.key}
        onPress={onPress}
        style={styles.tabItem}
        activeOpacity={0.7}
      >
        <Icon
          size={22}
          color={isFocused ? colors.systemRed : colors.secondaryLabel}
          style={{ marginBottom: 3 }}
        />
        <Text
          style={[
            styles.tabLabel,
            { color: colors.secondaryLabel },
            isFocused && { color: colors.systemRed, fontWeight: 'bold' },
          ]}
          numberOfLines={1}
          adjustsFontSizeToFit
          allowFontScaling={false}
        >
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.tabBarContainer, { backgroundColor: colors.systemBackground, borderTopColor: colors.separator }]}>
      
      {/* Chiec xe mo to di chuyen ben tren */}
      <Animated.View style={[styles.indicatorWrapper, { width: tabWidth, transform: [{ translateX }] }]}>
        <Bike size={20} color={colors.systemRed} style={styles.bikeIcon} />
        <View style={[styles.indicatorLine, { backgroundColor: colors.systemRed, shadowColor: colors.systemRed }]} />
      </Animated.View>

      {/* 2 Tabs Ben Trai (Garage, Bao Tour) */}
      {leftRoutes.map((route: any, i: number) => renderTabItem(route, i))}

      {/* NUT CUU HO & TRAM DICH VU O CHINH GIUA (NOI BAT, TO HON) */}
      <View style={styles.centerSlot}>
        <TouchableOpacity
          style={[styles.centerFab, { backgroundColor: colors.systemRed, shadowColor: colors.systemRed }]}
          onPress={() => router.push('/repair-shops' as any)}
          activeOpacity={0.85}
        >
          <Wrench size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={[styles.centerTabLabel, { color: colors.systemRed }]}>
          Cứu Hộ
        </Text>
      </View>

      {/* 2 Tabs Ben Phai (Cho, Cong dong) */}
      {rightRoutes.map((route: any, i: number) => renderTabItem(route, i + 2))}
    </View>
  );
}

// KHAI BAO ROUTER CHINH
export default function TabLayout() {
  return (
    <Tabs 
      screenOptions={{ headerShown: false }} 
      tabBar={(props) => <MotoTabBar {...props} />}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="journey" />
      <Tabs.Screen name="marketplace" />
      <Tabs.Screen name="explore" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    flexDirection: 'row',
    height: Platform.OS === 'ios' ? 88 : 72,
    paddingBottom: Platform.OS === 'ios' ? 22 : 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    position: 'relative',
    alignItems: 'flex-end',
  },
  tabItem: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 10,
    minHeight: HIGTouchTarget.min,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  centerSlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    position: 'relative',
    height: '100%',
    paddingTop: 0,
  },
  centerFab: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -20,
    borderWidth: 3,
    borderColor: '#1C1C1E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  centerTabLabel: {
    fontSize: 10,
    fontWeight: '800',
    marginTop: 3,
    letterSpacing: 0.3,
  },
  indicatorWrapper: {
    position: 'absolute',
    top: -12,
    left: 0,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  bikeIcon: {
    marginBottom: 2,
  },
  indicatorLine: {
    width: 28,
    height: 3,
    borderRadius: 3,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 5,
  },
});
