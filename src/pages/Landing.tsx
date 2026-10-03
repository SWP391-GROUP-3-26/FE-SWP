import { Link } from 'react-router-dom'

const programs = [
  {
    title: 'Yoga & Thiền tĩnh',
    tag: 'Tâm trí & thư giãn',
    image:
      'https://images.unsplash.com/photo-1599901860904-17e6ed7083a0?auto=format&fit=crop&w=900&q=80',
    meta: '60 phút / ca',
    description:
      'Không gian tập luyện yên tĩnh với các lớp yoga, thiền và hồi phục cơ thể sau giờ làm việc.',
  },
  {
    title: 'Pilates Reformer',
    tag: 'Tạo dáng & cột sống',
    image:
      'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=900&q=80',
    meta: '1:1 hoặc nhóm nhỏ',
    description:
      'Bài tập giúp cân chỉnh tư thế, tăng độ dẻo dai và cải thiện sức mạnh vùng cơ lõi.',
  },
  {
    title: 'Functional & Boxing',
    tag: 'Sức bền & bứt phá',
    image:
      'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?auto=format&fit=crop&w=900&q=80',
    meta: 'Đốt 700+ calo',
    description:
      'Khu tập luyện cường độ cao với bài tập chức năng, boxing và các thiết bị hiện đại.',
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
            Đăng nhập
          </Link>
          <Link to="/register" className="primary-link">
            Đăng ký
          </Link>
        </nav>
      </header>

      <main>
        <section className="hero-section">
          <div className="hero-copy">
            <span className="eyebrow">
              <span className="material-symbols-outlined">eco</span>
              Tái tạo năng lượng chuẩn sinh thái
            </span>
            <h1>Bắt đầu hành trình sống khỏe cùng SereneDesk Sports</h1>
            <p>
              Không gian tập luyện hiện đại, kết hợp năng lượng thiên nhiên và
              đội ngũ huấn luyện viên chuyên nghiệp để giúp bạn cân bằng thể
              lực mỗi ngày.
            </p>
            <div className="hero-actions">
              <Link to="/register" className="cta-button">
                Đăng ký ngay
                <span className="material-symbols-outlined">arrow_forward</span>
              </Link>
            </div>
          </div>

          <div className="hero-panel" aria-label="SereneDesk highlights">
            <div>
              <strong>100%</strong>
              <span>HLV có chứng chỉ quốc tế</span>
            </div>
            <div>
              <strong>7 ngày</strong>
              <span>Lịch tập linh hoạt trong tuần</span>
            </div>
            <div>
              <strong>05:30</strong>
              <span>Mở cửa từ sáng sớm đến tối</span>
            </div>
          </div>
        </section>

        <section className="program-section">
          <div className="section-heading">
            <span>Chương trình tiêu biểu</span>
            <h2>Không gian bộ môn chuyên sâu</h2>
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
                    <button type="button">Xem lịch tập</button>
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
