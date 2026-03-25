// src/components/AvatarScene.tsx (최종 수정본!)
import  { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stage } from '@react-three/drei'; // 👈 요기서 OrbitControls는 지우셔도 되고, 아래 코드에서 안 써용!
import MyAvatar from './MyAvatar';

function AvatarScene() {
  return (
    <Canvas 
      shadows 
      // 💡 오빠! 코아의 마법: 아까 오빠가 찾은 얼짱 각도 카메라 [좌우, 위아래, 앞뒤]
      camera={{ position: [0, 1.5, 1.5], fov: 50 }}
      style={{ pointerEvents: 'none' }}
    >
      <Stage environment="city" intensity={0.6} shadows="contact" adjustCamera={false}>
        <Suspense fallback={null}>
          <MyAvatar />
        </Suspense>
      </Stage>

      {/* ✅ 마우스 컨트롤 제거: 오빠 요청대로 `<OrbitControls />` 전체를 지웠어용! */}
      <OrbitControls 
        enableRotate={false} 
        enableZoom={false}   
        enablePan={false}    
        target={[0, 1.1, 1]} // 아까 오빠가 찾은 가슴/얼굴 시선 고정 좌표!
      />
    </Canvas>
  );
}

export default AvatarScene;