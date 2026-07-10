import { Tabs } from 'expo-router';
import { Bike, Compass, Home, Map, ShoppingBag } from 'lucide-react-native';
import { useEffect, useRef } from 'react';
import { Animated, Dimensions, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const { width } = Dimensions.get('window');
const COLORS = { bg: '#000000', card: '#121212', primary: '#E31B23', text: '#FFFFFF', textDim: '#A0A0A0' };

// 🧠 HỆ THỐNG MENU TÙY CHỈNH KẾT HỢP ANIMATION CHÍNH XÁC TUYỆT ĐỐI
function MotoTabBar({ state, descriptors, navigation }: any) {
  // Biến lưu trữ tọa độ X của chiếc xe
  const translateX = useRef(new Animated.Value(0)).current;
  
  // Tự động chia đều chiều rộng màn hình cho tổng số Tab (Hiện tại là 4)
  const tabWidth = width / state.routes.length;

  useEffect(() => {
    // Hiệu ứng phuộc nhún (Spring) khi xe chạy sang Tab mới
    Animated.spring(translateX, {
      toValue: state.index * tabWidth,
      useNativeDriver: true,
      bounciness: 12, // Độ nhún
      speed: 14,      // Tốc độ lướt
    }).start();
  }, [state.index, tabWidth]);

  return (
    <View style={styles.tabBarContainer}>
      
      {/* 🏍️ CHIẾC XE MÔ TÔ DI CHUYỂN BÊN TRÊN */}
      <Animated.View style={[styles.indicatorWrapper, { width: tabWidth, transform: [{ translateX }] }]}>
        <Bike size={22} color={COLORS.primary} style={styles.bikeIcon} />
        <View style={styles.indicatorLine} />
      </Animated.View>

      {/* CÁC NÚT BẤM (ROUTES) */}
      {state.routes.map((route: any, index: number) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        // Gán Icon và Tên tùy theo Route
        let Icon = Home;
        let label = "Garage";
        if (route.name === 'journey') { Icon = Map; label = "Bào Tour"; }
        if (route.name === 'marketplace') { Icon = ShoppingBag; label = "Chợ"; }
        if (route.name === 'explore') { Icon = Compass; label = "Cộng đồng"; }

        // Bỏ qua các tab ẩn (nếu có)
        if (options.href === null) return null;

        return (
          <TouchableOpacity key={route.key} onPress={onPress} style={styles.tabItem} activeOpacity={0.7}>
            <Icon size={24} color={isFocused ? COLORS.primary : "#666"} style={{ marginBottom: 4 }} />
            <Text 
              style={[styles.tabLabel, isFocused && { color: COLORS.primary, fontWeight: 'bold' }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              allowFontScaling={false}
            >
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// 🛑 KHAI BÁO ROUTER CHÍNH
export default function TabLayout() {
  return (
    <Tabs 
      screenOptions={{ headerShown: false }} 
      tabBar={(props) => <MotoTabBar {...props} />} // Sử dụng Menu Tùy chỉnh ở trên
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
    backgroundColor: '#0A0A0A',
    height: Platform.OS === 'ios' ? 85 : 70,
    paddingBottom: Platform.OS === 'ios' ? 20 : 0,
    borderTopWidth: 1,
    borderTopColor: '#222',
    position: 'relative', // Để xe có thể đè lên
  },
  tabItem: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 15,
  },
  tabLabel: {
    fontSize: 10,
    color: '#666',
  },
  // Style cho hiệu ứng xe chạy
  indicatorWrapper: {
    position: 'absolute',
    top: -12, // Đẩy xe nổi hẳn lên trên thanh menu
    left: 0,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  bikeIcon: {
    marginBottom: 2,
  },
  indicatorLine: {
    width: 30,
    height: 3,
    backgroundColor: COLORS.primary,
    borderRadius: 3,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 5,
  }
});