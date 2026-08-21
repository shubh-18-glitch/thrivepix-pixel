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

async function initHeroBackgroundVideo() {
  const video = document.querySelector('.bg-video[data-hls-src]')
  if (!video || prefersReducedMotion || window.location.protocol === 'file:') return

  const videoSource = video.dataset.hlsSrc
  const playVideo = () => video.play().catch(() => {})

  const { default: Hls } = await import('hls.js')
  if (Hls.isSupported()) {
    const hls = new Hls({
      enableWorker: true,
      lowLatencyMode: false,
    })

    hls.loadSource(videoSource)
    hls.attachMedia(video)
    hls.on(Hls.Events.MANIFEST_PARSED, playVideo)
    window.addEventListener('pagehide', () => hls.destroy(), { once: true })
  } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
    video.src = videoSource
    video.addEventListener('loadedmetadata', playVideo, { once: true })
  }
}

initHeroBackgroundVideo()

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

function initContactGhostCursor() {
  const section = document.querySelector('.contact-section')
  const canvas = section?.querySelector('.contact-ghost-cursor')

  if (!section || !canvas || prefersReducedMotion) return

  const gl = canvas.getContext('webgl', {
    alpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    premultipliedAlpha: false,
    powerPreference: 'high-performance',
  })

  if (!gl) {
    canvas.hidden = true
    return
  }

  const trailLength = 24
  const vertexSource = `
    attribute vec2 aPosition;

    void main() {
      gl_Position = vec4(aPosition, 0.0, 1.0);
    }
  `
  const fragmentSource = `
    precision highp float;

    #define TRAIL_LENGTH ${trailLength}

    uniform float uTime;
    uniform vec2 uResolution;
    uniform vec2 uMouse;
    uniform vec2 uTrail[TRAIL_LENGTH];
    uniform float uOpacity;
    uniform float uScale;

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
    }

    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      f *= f * (3.0 - 2.0 * f);
      return mix(
        mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
        mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0)), f.x),
        f.y
      );
    }

    float fbm(vec2 p) {
      float value = 0.0;
      float amplitude = 0.5;
      mat2 rotation = mat2(0.87758, 0.47943, -0.47943, 0.87758);

      for (int i = 0; i < 5; i++) {
        value += amplitude * noise(p);
        p = rotation * p * 2.0;
        amplitude *= 0.5;
      }

      return value;
    }

    vec4 ghostBlob(vec2 point, vec2 position, float intensity) {
      vec2 q = vec2(
        fbm(point * uScale + uTime * 0.10),
        fbm(point * uScale + vec2(5.2, 1.3) + uTime * 0.10)
      );
      vec2 r = vec2(
        fbm(point * uScale + q * 1.5 + uTime * 0.15),
        fbm(point * uScale + q * 1.5 + vec2(8.3, 2.8) + uTime * 0.15)
      );

      float smoke = fbm(point * uScale + r * 0.8);
      float radius = 0.42 + 0.22 / uScale;
      float distanceMask = 1.0 - smoothstep(0.0, radius, length(point - position));
      float alpha = pow(smoke, 2.55) * distanceMask * intensity;
      vec3 lilac = vec3(0.706, 0.592, 0.812);
      vec3 pearl = vec3(0.88, 0.82, 0.95);
      vec3 color = mix(lilac, pearl, sin(uTime * 0.5) * 0.18 + 0.26);

      return vec4(color * alpha, alpha);
    }

    void main() {
      vec2 aspect = vec2(uResolution.x / uResolution.y, 1.0);
      vec2 point = (gl_FragCoord.xy / uResolution * 2.0 - 1.0) * aspect;
      vec2 mouse = (uMouse * 2.0 - 1.0) * aspect;
      vec3 color = vec3(0.0);
      float alpha = 0.0;

      vec4 head = ghostBlob(point, mouse, 1.0);
      color += head.rgb;
      alpha += head.a;

      for (int i = 0; i < TRAIL_LENGTH; i++) {
        vec2 trailPoint = (uTrail[i] * 2.0 - 1.0) * aspect;
        float strength = 1.0 - float(i) / float(TRAIL_LENGTH);
        strength = strength * strength * 0.72;
        vec4 trailBlob = ghostBlob(point, trailPoint, strength);
        color += trailBlob.rgb;
        alpha += trailBlob.a;
      }

      float grain = hash(gl_FragCoord.xy + uTime * 60.0) - 0.5;
      color += grain * 0.025 * color;
      gl_FragColor = vec4(color * uOpacity, clamp(alpha * uOpacity, 0.0, 0.86));
    }
  `

  const compileShader = (type, source) => {
    const shader = gl.createShader(type)
    gl.shaderSource(shader, source)
    gl.compileShader(shader)

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      gl.deleteShader(shader)
      return null
    }

    return shader
  }

  const vertexShader = compileShader(gl.VERTEX_SHADER, vertexSource)
  const fragmentShader = compileShader(gl.FRAGMENT_SHADER, fragmentSource)

  if (!vertexShader || !fragmentShader) {
    canvas.hidden = true
    return
  }

  const program = gl.createProgram()
  gl.attachShader(program, vertexShader)
  gl.attachShader(program, fragmentShader)
  gl.linkProgram(program)
  gl.deleteShader(vertexShader)
  gl.deleteShader(fragmentShader)

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program)
    canvas.hidden = true
    return
  }

  const positionBuffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)

  const positionLocation = gl.getAttribLocation(program, 'aPosition')
  const uniforms = {
    time: gl.getUniformLocation(program, 'uTime'),
    resolution: gl.getUniformLocation(program, 'uResolution'),
    mouse: gl.getUniformLocation(program, 'uMouse'),
    trail: gl.getUniformLocation(program, 'uTrail[0]'),
    opacity: gl.getUniformLocation(program, 'uOpacity'),
    scale: gl.getUniformLocation(program, 'uScale'),
  }

  const pointer = { x: 0.5, y: 0.5 }
  const current = { x: 0.5, y: 0.5 }
  const velocity = { x: 0, y: 0 }
  const trail = Array.from({ length: trailLength }, () => ({ x: 0.5, y: 0.5 }))
  const flatTrail = new Float32Array(trailLength * 2)
  const startTime = performance.now()
  let lastMoveTime = startTime
  let frameId = 0
  let pointerActive = false
  let hasPointerPosition = false
  let opacity = 0

  const resize = () => {
    const rect = section.getBoundingClientRect()
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 0.55)
    const pixelBudget = 650000
    const requestedPixels = rect.width * rect.height * pixelRatio * pixelRatio
    const budgetScale = requestedPixels > pixelBudget
      ? Math.max(0.55, Math.sqrt(pixelBudget / requestedPixels))
      : 1
    const width = Math.max(1, Math.round(rect.width * pixelRatio * budgetScale))
    const height = Math.max(1, Math.round(rect.height * pixelRatio * budgetScale))

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width
      canvas.height = height
      gl.viewport(0, 0, width, height)
    }
  }

  const updatePointer = (event) => {
    const rect = section.getBoundingClientRect()
    pointer.x = Math.min(1, Math.max(0, (event.clientX - rect.left) / Math.max(1, rect.width)))
    pointer.y = Math.min(1, Math.max(0, 1 - (event.clientY - rect.top) / Math.max(1, rect.height)))

    if (!hasPointerPosition) {
      current.x = pointer.x
      current.y = pointer.y
      trail.forEach((point) => {
        point.x = pointer.x
        point.y = pointer.y
      })
      hasPointerPosition = true
    }

    pointerActive = true
    lastMoveTime = performance.now()
    opacity = 1
    ensureAnimation()
  }

  const draw = (now) => {
    frameId = 0
    resize()

    const previousX = current.x
    const previousY = current.y

    if (pointerActive) {
      current.x += (pointer.x - current.x) * 0.38
      current.y += (pointer.y - current.y) * 0.38
      velocity.x = current.x - previousX
      velocity.y = current.y - previousY
      opacity = 1
    } else {
      velocity.x *= 0.5
      velocity.y *= 0.5
      current.x += velocity.x
      current.y += velocity.y

      const idleTime = now - lastMoveTime
      if (idleTime > 1000) opacity = Math.max(0, 1 - (idleTime - 1000) / 1500)
    }

    trail.pop()
    trail.unshift({ x: current.x, y: current.y })
    trail.forEach((point, index) => {
      flatTrail[index * 2] = point.x
      flatTrail[index * 2 + 1] = point.y
    })

    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.useProgram(program)
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
    gl.enableVertexAttribArray(positionLocation)
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0)
    gl.uniform1f(uniforms.time, (now - startTime) / 1000)
    gl.uniform2f(uniforms.resolution, canvas.width, canvas.height)
    gl.uniform2f(uniforms.mouse, current.x, current.y)
    gl.uniform2fv(uniforms.trail, flatTrail)
    gl.uniform1f(uniforms.opacity, opacity)
    gl.uniform1f(uniforms.scale, Math.min(2, Math.max(0.7, Math.min(section.clientWidth, section.clientHeight) / 600)))
    gl.drawArrays(gl.TRIANGLES, 0, 3)

    if (pointerActive || opacity > 0.001) frameId = requestAnimationFrame(draw)
  }

  function ensureAnimation() {
    if (!frameId) frameId = requestAnimationFrame(draw)
  }

  const onPointerLeave = () => {
    pointerActive = false
    lastMoveTime = performance.now()
    ensureAnimation()
  }

  section.addEventListener('pointermove', updatePointer, { passive: true })
  section.addEventListener('pointerenter', updatePointer, { passive: true })
  section.addEventListener('pointerleave', onPointerLeave, { passive: true })

  const resizeObserver = new ResizeObserver(resize)
  resizeObserver.observe(section)
  resize()
}

initContactGhostCursor()
