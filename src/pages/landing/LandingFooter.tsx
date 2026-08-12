export function LandingFooter() {
  return (
    <footer className="landing-footer">
      <div className="landing-container landing-footer-inner">
        <a className="landing-wordmark" href="#top" aria-label="NoPlan 랜딩페이지 맨 위로 이동">
          <span aria-hidden="true">N</span>
          noplan
        </a>
        <nav aria-label="푸터 메뉴">
          <a href="#how-it-works">서비스 소개</a>
          <a href="/privacy">개인정보처리방침</a>
        </nav>
        <small>© {new Date().getFullYear()} NoPlan. All rights reserved.</small>
      </div>
    </footer>
  );
}
