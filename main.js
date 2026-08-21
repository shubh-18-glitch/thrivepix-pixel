const menuToggle = document.querySelector('.menu-toggle')
const mobileMenu = document.querySelector('.mobile-menu')
const mobileMenuSheet = document.querySelector('.mobile-menu-sheet')
const mobileLinks = document.querySelectorAll('.mobile-menu-sheet a')

function setMenu(open) {
  menuToggle.setAttribute('aria-expanded', String(open))
  menuToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu')
  mobileMenu.hidden = !open
  document.body.classList.toggle('menu-open', open)
}

menuToggle.addEventListener('click', () => {
  setMenu(menuToggle.getAttribute('aria-expanded') !== 'true')
})
mobileMenu.addEventListener('click', () => setMenu(false))
mobileMenuSheet.addEventListener('click', (event) => event.stopPropagation())
mobileLinks.forEach((link) => link.addEventListener('click', () => setMenu(false)))

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && menuToggle.getAttribute('aria-expanded') === 'true') {
    setMenu(false)
    menuToggle.focus()
  }
})

window.addEventListener('resize', () => {
  if (window.innerWidth > 720 && menuToggle.getAttribute('aria-expanded') === 'true') setMenu(false)
})

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

const sectionReveals = [...document.querySelectorAll('.section-reveal')]

if (prefersReducedMotion || !('IntersectionObserver' in window)) {
  sectionReveals.forEach((element) => element.classList.add('is-visible'))
} else {
  const sectionObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return
        entry.target.classList.add('is-visible')
        observer.unobserve(entry.target)
      })
    },
    { threshold: 0.14 },
  )
  sectionReveals.forEach((element) => sectionObserver.observe(element))
}
