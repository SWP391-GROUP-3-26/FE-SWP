import { Link } from 'react-router-dom'

const programs = [
  {
    title: 'Yoga & Thien tinh',
    tag: 'Tam tri & thu gian',
    image:
      'https://images.unsplash.com/photo-1599901860904-17e6ed7083a0?auto=format&fit=crop&w=900&q=80',
    meta: '60 phut / ca',
    description:
      'Khong gian tap luyen yen tinh voi cac lop yoga, thien va hoi phuc co the sau gio lam viec.',
  },
  {
    title: 'Pilates Reformer',
    tag: 'Tao dang & cot song',
    image:
      'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=900&q=80',
    meta: '1:1 hoac nhom nho',
    description:
      'Bai tap giup can chinh tu the, tang do deo dai va cai thien suc manh vung co loi.',
  },
  {
    title: 'Functional & Boxing',
    tag: 'Suc ben & but pha',
    image:
      'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?auto=format&fit=crop&w=900&q=80',
    meta: 'Dot 700+ calo',
    description:
      'Khu tap luyen cuong do cao voi bai tap chuc nang, boxing va cac thiet bi hien dai.',
  },
]

export default function Landing() {
  return (
    <div className="site-shell">
      <header className="site-header">
        <Link to="/" className="brand">
          <span className="brand-mark material-symbols-outlined">spa</span>
          <span>
            <strong>SereneDesk</strong>
            <small>Fitness & Sports</small>
          </span>
        </Link>

        <nav className="header-actions" aria-label="Main navigation">
          <Link to="/login" className="ghost-link">
            Member Login
          </Link>
          <Link to="/register" className="primary-link">
            Dang ky
          </Link>
        </nav>
      </header>

      <main>
        <section className="hero-section">
          <div className="hero-copy">
            <span className="eyebrow">
              <span className="material-symbols-outlined">eco</span>
              Tai tao nang luong chuan sinh thai
            </span>
            <h1>Bat dau hanh trinh song khoe cung SereneDesk Sports</h1>
            <p>
              Khong gian tap luyen hien dai, ket hop nang luong thien nhien va
              doi ngu huan luyen vien chuyen nghiep de giup ban can bang the
              luc moi ngay.
            </p>
            <div className="hero-actions">
              <Link to="/register" className="cta-button">
                Dang ky ngay
                <span className="material-symbols-outlined">arrow_forward</span>
              </Link>
            </div>
          </div>

          <div className="hero-panel" aria-label="SereneDesk highlights">
            <div>
              <strong>100%</strong>
              <span>HLV co chung chi quoc te</span>
            </div>
            <div>
              <strong>7 ngay</strong>
              <span>Lich tap linh hoat trong tuan</span>
            </div>
            <div>
              <strong>05:30</strong>
              <span>Mo cua tu sang som den toi</span>
            </div>
          </div>
        </section>

        <section className="program-section">
          <div className="section-heading">
            <span>Chuong trinh tieu bieu</span>
            <h2>Khong gian bo mon chuyen sau</h2>
          </div>

          <div className="program-grid">
            {programs.map((program) => (
              <article className="program-card" key={program.title}>
                <img src={program.image} alt={program.title} />
                <div className="program-body">
                  <span className="program-tag">{program.tag}</span>
                  <h3>{program.title}</h3>
                  <p>{program.description}</p>
                  <div className="program-footer">
                    <span>{program.meta}</span>
                    <button type="button">Xem lich tap</button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <span>SereneDesk Sports Center</span>
        <span>2026</span>
      </footer>
    </div>
  )
}
