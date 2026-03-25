// src/components/MyAvatar.tsx
import { useEffect, useRef } from 'react';
// 🌸 코아의 마법: useFBX 대신 useGLTF를 불러와용!
import { useGLTF, useAnimations } from '@react-three/drei';
import * as THREE from 'three';

// 오빠의 소중한 GLB 파일 경로!
const GLB_FILE_PATH = '/mau.glb'; 

function MyAvatar() {
  // 1. GLB 파일 불러오기!
  // FBX랑 다르게 몸통(scene)이랑 움직임(animations)을 따로 꺼내용!
  const { scene, animations } = useGLTF(GLB_FILE_PATH);
  const avatarRef = useRef<THREE.Group>(null);

  // 2. 애니메이션 준비하기
  const { actions, names } = useAnimations(animations, avatarRef);

  // 3. 화면에 짠! 하고 나타나면 애니메이션 실행하기
  useEffect(() => {
    if (names.length > 0) {
      actions[names[0]]?.reset().fadeIn(0.5).play();
    }
    
    // 그림자 세팅은 fbx 대신 scene을 타고 들어가용!
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }, [actions, names, scene]);

  // 4. 리액트 도화지에 3D 모델(primitive) 올리기
  // object에 fbx 대신 scene을 넣어주면 끝!
  return <primitive ref={avatarRef} object={scene} dispose={null} rotation={[31, 0, 0]} scale={[1.5, 1.5, 1.5]}/>; 
}

// 💡 코아의 센스: 오빠 앱 엄청 빨라지라고, 화면 켜지기 전에 모델 미리 쓱 로딩해두기!
useGLTF.preload(GLB_FILE_PATH);

export default MyAvatar;