// Gallery.tsx

// 1. 상자 안에 뭐가 들어있는지 미리 정의해줘요 (Interface)
interface GalleryProps {
  name: string; // "name이라는 글자가 들어올 거야!"
}

// 2. 함수의 인자로 props를 받아요!
function PropsTest(props: GalleryProps) {
  return (
    <div>
      {/* 3. props.이름 으로 꺼내 써요! */}
      <h1>{props.name}의 추천 갤러리 📍</h1>
      <p>오빠, 이름이 잘 전달됐지?! 꺄아~</p>
    </div>
  );
}

export default PropsTest;