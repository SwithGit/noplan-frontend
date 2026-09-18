export function SignupDemographics({ birthdate, gender, onBirthdate, onGender }: {
  birthdate: string; gender: string; onBirthdate: (value: string) => void; onGender: (value: string) => void;
}) {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' });
  const earliest = `${Number(today.slice(0, 4)) - 120}-01-01`;
  const input = { width: '100%', padding: '11px', border: '1px solid #ddd5e8', borderRadius: 8, boxSizing: 'border-box' as const, marginTop: 6 };
  return <fieldset style={{ border: 0, padding: 0, margin: '0 0 18px' }}>
    <legend style={{ fontSize: 14, fontWeight: 600 }}>관광지 맞춤 추천 <small style={{ fontWeight: 400 }}>(선택)</small></legend>
    <p style={{ fontSize: 12, color: '#777', lineHeight: 1.6 }}>생년월일로 계산한 연령대와 성별을 관광지 추천에 참고해요. 입력하지 않아도 가입할 수 있어요.</p>
    <label style={{ fontSize: 13 }}>생년월일<input aria-label="생년월일" type="date" min={earliest} max={today} value={birthdate} onChange={e => onBirthdate(e.target.value)} style={input} /></label>
    <label style={{ display: 'block', fontSize: 13, marginTop: 10 }}>성별<select aria-label="성별" value={gender} onChange={e => onGender(e.target.value)} style={input}>
      <option value="">선택 안 함</option><option value="male">남성</option><option value="female">여성</option>
    </select></label>
  </fieldset>;
}
