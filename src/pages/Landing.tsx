import { Link } from 'react-router-dom'
import type { MouseEvent } from 'react'
import { useEffect, useRef } from 'react'

const programs = [
  {
    title: 'Yoga & Thiền tĩnh',
    tag: 'Tâm trí & thư giãn',
    image:
      'https://images.unsplash.com/photo-1599901860904-17e6ed7083a0?auto=format&fit=crop&w=900&q=80',
    description:
      'Không gian tập luyện yên tĩnh với các lớp yoga, thiền và hồi phục cơ thể sau giờ làm việc.',
  },
  {
    title: 'Pilates Reformer',
    tag: 'Tạo dáng & cột sống',
    image:
      'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=900&q=80',
    description:
      'Bài tập giúp căn chỉnh tư thế, tăng độ dẻo dai và cải thiện sức mạnh vùng cơ lõi.',
  },
  {
    title: 'Functional & Boxing',
    tag: 'Sức bền & bứt phá',
    image:
      'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?auto=format&fit=crop&w=900&q=80',
    description:
      'Khu tập luyện cường độ cao với bài tập chức năng, boxing và các thiết bị hiện đại.',
  },
]

export default function Landing() {
  const scrollFrameRef = useRef<number | null>(null)

  useEffect(() => () => {
    if (scrollFrameRef.current !== null) window.cancelAnimationFrame(scrollFrameRef.current)
  }, [])

  const scrollToPrograms = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault()
    const target = document.getElementById('programs')
    if (!target) return

    if (scrollFrameRef.current !== null) window.cancelAnimationFrame(scrollFrameRef.current)

    const targetTop = Math.max(
      0,
      window.scrollY + target.getBoundingClientRect().top - Number.parseFloat(getComputedStyle(target).scrollMarginTop || '0'),
    )
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      window.scrollTo(0, targetTop)
      return
    }

    const startTop = window.scrollY
    const distance = targetTop - startTop
    const duration = 5000
    let startTime: number | null = null

    const animateScroll = (time: number) => {
      startTime ??= time
      const progress = Math.min((time - startTime) / duration, 1)
      const easedProgress = progress < 0.5
        ? 4 * progress ** 3
        : 1 - ((-2 * progress + 2) ** 3) / 2
      window.scrollTo(0, startTop + distance * easedProgress)
      if (progress < 1) scrollFrameRef.current = window.requestAnimationFrame(animateScroll)
      else scrollFrameRef.current = null
    }

    scrollFrameRef.current = window.requestAnimationFrame(animateScroll)
  }

  return (
    <div className="site-shell">
      <header className="site-header">
        <Link to="/" className="brand">
          <span className="brand-mark material-symbols-outlined">spa</span>
          <span>
            <strong>UniSports</strong>
            <small>Fitness & Sports</small>
          </span>
        </Link>

      </header>

      <main>
        <section className="hero-section">
          <div className="hero-copy">
            <span className="eyebrow">
              <span className="material-symbols-outlined">eco</span>
              Tái tạo năng lượng chuẩn sinh thái
            </span>
            <h1>Bắt đầu hành trình sống khỏe cùng UniSports</h1>
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

          <nav className="hero-panel" aria-label="Truy cập và tìm hiểu UniSports">
            <Link to="/login" className="hero-panel-action">
              <strong>Đăng nhập</strong>
              <span>Truy cập tài khoản UniSports</span>
            </Link>
            <Link to="/register" className="hero-panel-action">
              <strong>Đăng ký</strong>
              <span>Tạo tài khoản hội viên mới</span>
            </Link>
            <a href="#programs" className="hero-panel-action hero-panel-scroll-link" onClick={scrollToPrograms}>
              <strong>Tìm hiểu thêm về trung tâm</strong>
              <span>Khám phá các bộ môn và không gian tập luyện</span>
            </a>
          </nav>
        </section>

        <section className="program-section" id="programs">
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
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <span>UniSports Center</span>
        <span>2026</span>
      </footer>
    </div>
  )
}
