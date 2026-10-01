import { useEffect, useRef, useState } from 'react';
import { EventDialog } from './EventDialog';
import { scannedStampId } from './eventModel';

export function EventScanner({ onClose, onScan }: { onClose: () => void; onScan: (id: number) => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const onScanRef = useRef(onScan);
  const [message, setMessage] = useState('카메라에 노피 QR코드를 비춰 주세요.');
  useEffect(() => { onScanRef.current = onScan; }, [onScan]);
  useEffect(() => {
    let cancelled = false, found = false;
    let stream: MediaStream | undefined;
    let controls: { stop: () => void } | undefined;
    const start = async () => {
      try {
        const { BrowserQRCodeReader } = await import('@zxing/browser');
        if (cancelled) return;
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
        if (cancelled) { stream.getTracks().forEach(track => track.stop()); return; }
        const reader = new BrowserQRCodeReader();
        controls = await reader.decodeFromStream(stream, video.current!, result => {
          if (!result || cancelled || found) return;
          const id = scannedStampId(result.getText());
          if (id === null) { setMessage('노플랜 행사장의 노피 QR코드를 찍어 주세요.'); return; }
          found = true;
          controls?.stop();
          stream?.getTracks().forEach(track => track.stop());
          onScanRef.current(id);
        });
        if (cancelled || found) { controls.stop(); stream.getTracks().forEach(track => track.stop()); }
      } catch {
        stream?.getTracks().forEach(track => track.stop());
        if (!cancelled) setMessage('카메라를 열지 못했어요. 브라우저의 카메라 권한을 허용하거나 휴대폰 기본 카메라로 QR코드를 찍어 주세요.');
      }
    };
    void start();
    return () => { cancelled = true; controls?.stop(); stream?.getTracks().forEach(track => track.stop()); };
  }, []);
  return <EventDialog title="다음 노피 QR 찍기" onClose={onClose}>
    <video ref={video} className="ne-camera" muted playsInline autoPlay aria-label="QR 스캔 카메라" />
    <p className="ne-camera-message" role="status">{message}</p>
    <p className="ne-note">기록을 이어 모으려면 처음 참여한 브라우저를 계속 이용해 주세요.</p>
    <button className="ne-secondary" type="button" onClick={onClose}>스탬프 카드로 돌아가기</button>
  </EventDialog>;
}
