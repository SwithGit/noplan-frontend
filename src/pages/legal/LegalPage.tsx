import { Link } from 'react-router-dom';
import { LanguageSelect } from '../../i18n/LanguageSelect';
import { useLocale } from '../../i18n/locale';
import { ROUTES } from '../../routes';
import { LEGAL_CONTACT, LEGAL_PATHS, LEGAL_VERSION, legalDocuments, type LegalDocumentId } from './documents';
import './legal.css';

const languageNotes = {
  ko: '문서는 한국어 원문으로 제공됩니다.',
  en: 'These documents are currently available in Korean.',
  ja: 'この文書は現在韓国語で提供されています。',
  'zh-CN': '这些文件目前以韩文提供。',
};

export default function LegalPage({ documentId }: { documentId: LegalDocumentId }) {
  const locale = useLocale();
  const doc = legalDocuments[documentId];
  return <div className="legal-page">
    <header className="legal-header"><Link to={ROUTES.appHome} className="legal-brand" aria-label="NoPlan">noplan</Link><LanguageSelect /></header>
    <main className="legal-layout">
      <nav className="legal-nav" aria-label="Legal documents" lang="ko">{(Object.keys(LEGAL_PATHS) as LegalDocumentId[]).map(id => <Link key={id} to={LEGAL_PATHS[id]} aria-current={id === documentId ? 'page' : undefined}>{legalDocuments[id].title}</Link>)}</nav>
      <article className="legal-card" lang="ko" key={documentId}>
        <header><p className="legal-eyebrow">NOPLAN · LEGAL</p><h1>{doc.title}</h1><p className="legal-summary">{doc.summary}</p><p className="legal-version">작성일 2026.09.20 · 버전 {LEGAL_VERSION}</p></header>
        {locale !== 'ko' && <p className="legal-version" lang={locale}>{languageNotes[locale]}</p>}
        <nav className="legal-contents" aria-label="목차">{doc.sections.map((section, index) => <a href={`#legal-${documentId}-${index}`} key={section.title}>{section.title}</a>)}</nav>
        {doc.sections.map((section, index) => <section className="legal-section" id={`legal-${documentId}-${index}`} key={section.title}><h2>{section.title}</h2>{section.paragraphs?.map(paragraph => <p key={paragraph}>{paragraph}</p>)}{section.items && <ul>{section.items.map(item => <li key={item}>{item}</li>)}</ul>}</section>)}
        <footer className="legal-contact"><strong>{LEGAL_CONTACT.company} · 책임자 {LEGAL_CONTACT.name}</strong><a href={`mailto:${LEGAL_CONTACT.email}`}>{LEGAL_CONTACT.email}</a><a href={`tel:${LEGAL_CONTACT.phone.replaceAll('-', '')}`}>{LEGAL_CONTACT.phone}</a>{documentId === 'privacy' && <Link to={ROUTES.privacyArchive}>이전 개인정보처리방침 (2026.03.23)</Link>}</footer>
      </article>
    </main>
    <footer className="legal-footer"><Link to={ROUTES.signup}>회원가입으로 이동</Link><span>계획 없어도 좋은 하루, 노플랜</span></footer>
  </div>;
}
