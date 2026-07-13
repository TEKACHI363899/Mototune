import { OrbitControls, Stage, useGLTF } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { Bike } from 'lucide-react-native';
import React, { Suspense } from 'react';
import { StyleSheet, Text, View } from 'react-native';

// BỘ CẢM BIẾN THEO DÕI ÁNH NHÌN
import { useIsFocused } from '@react-navigation/native';

function Model({ url }: { url: any }) {
  const gltf = useGLTF(url) as any;
  return <primitive object={gltf.scene} scale={1} />;
}

function ComingSoonFallback({ modelName }: { modelName: string }) {
  return (
    <View style={styles.comingSoonContainer}>
      <Bike size={80} color="#333" style={styles.shadowIcon} />
      <Text style={styles.comingSoonTitle}>MÔ HÌNH 3D ĐANG CẬP NHẬT</Text>
      <Text style={styles.comingSoonSub}>{modelName}</Text>
    </View>
  );
}

const Bike3d = ({ modelName }: { modelName: string }) => {
  // Lấy trạng thái xem màn hình này có đang được mở hay không
  const isFocused = useIsFocused(); 

  const ModelRegistry: Record<string, any> = {
    'Exciter 155 VVA': require('../assets/models/exciter.glb'), 
  };

  const modelSource = ModelRegistry[modelName];

  React.useEffect(() => {
    return () => {
      // Giải phóng bộ nhớ RAM/VRAM của mô hình 3D khi component bị huỷ (unmount)
      if (modelSource) {
        try {
          useGLTF.clear(modelSource);
        } catch (e) {
          console.log("Error clearing 3D model cache:", e);
        }
      }
    };
  }, [modelSource]);

  if (!modelSource) return <ComingSoonFallback modelName={modelName} />;

  // 🛑 LƯỚI BẢO VỆ: Nếu người dùng sang trang khác -> Hiển thị hộp đen, ngắt điện 3D
  if (!isFocused) {
    return <View style={styles.canvasContainer} />;
  }

  return (
    <View style={styles.canvasContainer}>
      <Canvas 
        shadows 
        camera={{ position: [4, 2, 5], fov: 50 }}
        gl={{ preserveDrawingBuffer: true }}
      >
        <Suspense fallback={null}>
          <Stage environment="city" intensity={0.5}>
            <Model url={modelSource} />
          </Stage>
        </Suspense>
        <OrbitControls enablePan={false} enableZoom={true} minPolarAngle={Math.PI / 4} maxPolarAngle={Math.PI / 2} />
      </Canvas>
    </View>
  );
};

export default React.memo(Bike3d);

const styles = StyleSheet.create({
  canvasContainer: { width: '100%', height: 250, borderRadius: 15, overflow: 'hidden', backgroundColor: '#111' },
  comingSoonContainer: { width: '100%', height: 250, borderRadius: 15, backgroundColor: '#1A1A1A', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#333' },
  shadowIcon: { opacity: 0.5, marginBottom: 15 },
  comingSoonTitle: { color: '#E31B23', fontWeight: '900', fontSize: 16, letterSpacing: 1 },
  comingSoonSub: { color: '#A0A0A0', fontSize: 14, marginTop: 5, fontStyle: 'italic' }
});