import { Tabs, useRouter } from 'expo-router';
import { Bike, Compass, Home, Map, ShoppingBag, Wrench } from 'lucide-react-native';
import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HIGTheme, HIGTouchTarget } from '@/constants/theme';

const { width } = Dimensions.get('window');

// HỆ THỐNG MENU TÙY CHỈNH 5 CỘT VỚI NÚT CỨU HỘ Ở CHÍNH GIỮA (SAFE AREA RESPONSIVE)
function MotoTabBar({ state, descriptors, navigation }: any) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const translateX = useRef(new Animated.Value(0)).current;
  const theme = 'dark';
  const colors = HIGTheme[theme];
  
  // Chia đều chiều rộng cho 5 ô (Garage, Bào Tour, CỨU HỘ [Center], Chợ, Cộng đồng)
  const totalSlots = 5;
  const tabWidth = width / totalSlots;

  const getSlotIndex = (routeIndex: number) => {
    return routeIndex < 2 ? routeIndex : routeIndex + 1;
  };

  useEffect(() => {
    const targetSlot = getSlotIndex(state.index);
    Animated.spring(translateX, {
      toValue: targetSlot * tabWidth,
      useNativeDriver: true,
      bounciness: 10,
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
          size={21}
          color={isFocused ? colors.systemRed : colors.secondaryLabel}
          style={{ marginBottom: 3 }}
        />
        <Text
          style={[
            styles.tabLabel,
            { color: isFocused ? colors.systemRed : colors.secondaryLabel },
            isFocused && { fontWeight: '700' },
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

  const bottomPadding = Math.max(insets.bottom, Platform.OS === 'ios' ? 18 : 8);
  const tabHeight = 54 + bottomPadding;

  return (
    <View
      style={[
        styles.tabBarContainer,
        {
          backgroundColor: '#0D0F12',
          borderTopColor: 'rgba(255, 255, 255, 0.08)',
          height: tabHeight,
          paddingBottom: bottomPadding,
        },
      ]}
    >
      {/* Chiếc xe mô tô di chuyển bên trên indicator */}
      <Animated.View
        style={[
          styles.indicatorWrapper,
          { width: tabWidth, transform: [{ translateX }] },
        ]}
      >
        <Bike size={18} color={colors.systemRed} style={styles.bikeIcon} />
        <View
          style={[
            styles.indicatorLine,
            { backgroundColor: colors.systemRed, shadowColor: colors.systemRed },
          ]}
        />
      </Animated.View>

      {/* 2 Tabs Bên Trái (Garage, Bào Tour) */}
      {leftRoutes.map((route: any, i: number) => renderTabItem(route, i))}

      {/* NÚT CỨU HỘ & TRẠM DỊCH VỤ Ở CHÍNH GIỮA */}
      <View style={styles.centerSlot}>
        <TouchableOpacity
          style={[
            styles.centerFab,
            { backgroundColor: colors.systemRed, shadowColor: colors.systemRed },
          ]}
          onPress={() => router.push('/repair-shops' as any)}
          activeOpacity={0.85}
        >
          <Wrench size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={[styles.centerTabLabel, { color: colors.systemRed }]}>
          Cứu Hộ
        </Text>
      </View>

      {/* 2 Tabs Bên Phải (Chợ, Cộng đồng) */}
      {rightRoutes.map((route: any, i: number) => renderTabItem(route, i + 2))}
    </View>
  );
}

// KHAI BÁO ROUTER CHÍNH
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
    borderTopWidth: StyleSheet.hairlineWidth,
    position: 'relative',
    alignItems: 'flex-end',
  },
  tabItem: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 8,
    minHeight: HIGTouchTarget.min,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.2,
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
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -20,
    borderWidth: 3,
    borderColor: '#0D0F12',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  centerTabLabel: {
    fontSize: 10,
    fontWeight: '800',
    marginTop: 2,
    letterSpacing: 0.3,
  },
  indicatorWrapper: {
    position: 'absolute',
    top: -11,
    left: 0,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  bikeIcon: {
    marginBottom: 2,
  },
  indicatorLine: {
    width: 24,
    height: 3,
    borderRadius: 3,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 5,
  },
});
