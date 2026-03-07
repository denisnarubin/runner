// src/core/Game.ts
import * as THREE from 'three'
import { World } from './World'
import { Player } from './Player'

export class Game {
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private renderer: THREE.WebGLRenderer
  private world: World | null = null
  private player: Player | null = null
  
  private characterLight: THREE.PointLight | null = null
  private clock = new THREE.Clock()
  private score = 0
  private isGameOver = false
  private isTutorialVisible = true
  
  // Настройки камеры
  private readonly CAM_OFFSET_X = 0
  private readonly CAM_OFFSET_Y = 3.5
  private readonly CAM_OFFSET_Z = -5
  private readonly CAM_LOOKAHEAD = 8
  private readonly CAM_SMOOTH = 0.1
  
  constructor(canvas: HTMLCanvasElement) {
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x87ceeb)
    this.scene.fog = new THREE.Fog(0x87ceeb, 20, 80)
    
    this.camera = new THREE.PerspectiveCamera(
      45, 
      window.innerWidth / window.innerHeight, 
      0.1, 
      1000
    )
    this.camera.position.set(this.CAM_OFFSET_X, this.CAM_OFFSET_Y, this.CAM_OFFSET_Z)
    this.camera.lookAt(0, 1.5, this.CAM_LOOKAHEAD)
    
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFShadowMap
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    
    // Освещение
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2)
    this.scene.add(ambientLight)
    
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.8)
    dirLight.position.set(15, 25, 10)
    dirLight.castShadow = true
    dirLight.shadow.mapSize.set(2048, 2048)
    dirLight.shadow.camera.near = 0.5
    dirLight.shadow.camera.far = 100
    dirLight.shadow.camera.left = -20
    dirLight.shadow.camera.right = 20
    dirLight.shadow.camera.top = 20
    dirLight.shadow.camera.bottom = -20
    this.scene.add(dirLight)
    
    this.characterLight = new THREE.PointLight(0xffffff, 0.8, 30)
    this.characterLight.position.set(0, 5, 0)
    this.characterLight.castShadow = false
    this.scene.add(this.characterLight)
    
    const fillLight = new THREE.PointLight(0xffffff, 0.4)
    fillLight.position.set(5, 10, 5)
    this.scene.add(fillLight)
    
    this.world = new World(this.scene)
    this.player = new Player()
    this.scene.add(this.player.getMesh())
    
    this.showTutorial()
    this.setupControls()
    
    console.log('🎮 Игра запущена!')
  }
  
  private showTutorial(): void {
    const overlay = document.createElement('div')
    overlay.id = 'tutorial'
    overlay.style.cssText = `
      position: fixed; top: 0; left: 0;
      width: 100%; height: 100%;
      background: rgba(0,0,0,0.7);
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      color: white; font-family: sans-serif;
      z-index: 1000; pointer-events: auto;
    `
    overlay.innerHTML = `
      <h2 style="font-size: 28px; margin-bottom: 20px;">🎮 Как играть</h2>
      <p style="font-size: 18px; margin: 10px;">👆 Свайпни <b>влево/вправо</b> для движения</p>
      <p style="font-size: 18px; margin: 10px;">🪙 Собирай <b>монеты</b></p>
      <p style="font-size: 18px; margin: 10px;">💣 Избегай <b>бомб</b></p>
      <p style="font-size: 18px; margin: 10px; margin-top: 30px; opacity: 0.8;">Нажми в любом месте чтобы начать</p>
    `
    document.body.appendChild(overlay)
    
    const hide = () => {
      if (this.isTutorialVisible) {
        this.isTutorialVisible = false
        overlay.remove()
        this.player?.startRunning()
      }
    }
    
    overlay.addEventListener('click', hide)
    overlay.addEventListener('touchstart', hide)
  }
  
  private setupControls(): void {
    let startX = 0
    
    const onStart = (x: number) => { startX = x }
    const onEnd = (x: number) => {
      const diff = x - startX
      if (Math.abs(diff) > 50) {
        if (diff > 0) this.player?.moveRight()
        else this.player?.moveLeft()
      }
    }
    
    window.addEventListener('mousedown', (e) => onStart(e.clientX))
    window.addEventListener('mouseup', (e) => onEnd(e.clientX))
    window.addEventListener('touchstart', (e) => onStart(e.touches[0].clientX), { passive: true })
    window.addEventListener('touchend', (e) => onEnd(e.changedTouches[0].clientX), { passive: true })
    
    window.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') this.player?.moveLeft()
      if (e.key === 'ArrowRight') this.player?.moveRight()
    })
  }
  
  start(): void {
    this.animate()
    window.addEventListener('resize', () => this.onResize())
  }
  
  private animate = (): void => {
    requestAnimationFrame(this.animate)
    const delta = Math.min(this.clock.getDelta(), 0.1)
    
    if (!this.isGameOver && this.player && this.world) {
      this.player.update(delta)
      this.world.update(this.player.getPosition().z)
      this.checkCollisions()
      
      const pos = this.player.getPosition()
      
      this.camera.position.x += (pos.x - this.camera.position.x) * this.CAM_SMOOTH
      this.camera.position.y += (this.CAM_OFFSET_Y - this.camera.position.y) * this.CAM_SMOOTH
      this.camera.position.z += (pos.z + this.CAM_OFFSET_Z - this.camera.position.z) * this.CAM_SMOOTH
      
      this.camera.lookAt(pos.x, 1.5, pos.z + this.CAM_LOOKAHEAD)
      
      if (this.characterLight) {
        this.characterLight.position.x = pos.x
        this.characterLight.position.z = pos.z + 2
      }
    }
    
    this.renderer.render(this.scene, this.camera)
  }
  
  /**
   * 🔥 ПРОВЕРКА СТОЛКНОВЕНИЙ С ТОЧНЫМ РАДИУСОМ
   */
  private checkCollisions(): void {
    if (!this.player || !this.world || this.isGameOver) return
    
    const playerPos = this.player.getPosition()
    const objects = this.world.getActiveObjects()
    
    for (let i = objects.length - 1; i >= 0; i--) {
      const obj = objects[i]
      const type = (obj as any).type as string
      
      let shouldCollide = false
      
      const objPos = new THREE.Vector3()
      obj.getWorldPosition(objPos)
      const distance = playerPos.distanceTo(objPos)
      
      switch (type) {
        case 'bomb':
          shouldCollide = distance < 0.5
          break
        
        case 'coin':
          shouldCollide = distance < 0.8
          break
        
        case 'gate':
          shouldCollide = true
          break
      }
      
      if (shouldCollide) {
        this.handleCollision(obj)
        objects.splice(i, 1)
      }
    }
  }
  
  private handleCollision(obj: THREE.Mesh): void {
    const type = (obj as any).type as string
    
    switch (type) {
      case 'coin':
        this.score += 1
        this.world?.removeObject(obj)
        this.playSound('coin')
        break
        
      case 'bomb':
        this.player?.playFall(() => {
          this.endGame(false)
        })
        this.world?.removeObject(obj)
        this.playSound('bomb')
        break
        
      case 'gate':
        const mod = (obj as any).modifier as string
        const val = parseInt(mod.replace(/[^0-9-]/g, '')) || 0
        
        if (mod.startsWith('+')) this.score += val
        else if (mod.startsWith('-')) this.score -= val
        else if (mod.startsWith('x')) this.score *= val
        
        this.world?.removeObject(obj)
        this.playSound('gate')
        break
    }
  }
  
  private playSound(name: string): void {
    try {
      const audio = new Audio(`/sounds/${name}.mp3`)
      audio.volume = 0.5
      audio.play().catch(() => {})
    } catch {}
  }
  
  private endGame(success: boolean): void {
    this.isGameOver = true
    
    if (success && this.player) {
      this.player.faceCamera()
      this.player.playDance()
    }
    
    setTimeout(() => this.showEndCard(), success ? 1500 : 500)
  }
  
  private showEndCard(): void {
    const overlay = document.createElement('div')
    overlay.style.cssText = `
      position: fixed; top: 0; left: 0;
      width: 100%; height: 100%;
      background: linear-gradient(135deg, #1a1a2e, #16213e);
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      color: white; font-family: sans-serif;
      z-index: 2000;
    `
    
    overlay.innerHTML = `
      <h1 style="font-size: 48px; margin: 0 0 10px;">${this.score >= 10 ? '🎉' : '💀'} ${this.score} монет!</h1>
      <p style="font-size: 20px; opacity: 0.8; margin-bottom: 30px;">${this.score >= 10 ? 'Отличный результат!' : 'Попробуй ещё раз!'}</p>
      
      <button id="cta" style="
        padding: 20px 60px;
        font-size: 24px;
        font-weight: bold;
        background: linear-gradient(135deg, #4ecca3, #38b28a);
        border: none; border-radius: 50px;
        color: white; cursor: pointer;
        box-shadow: 0 10px 30px rgba(78, 204, 163, 0.4);
        transition: transform 0.2s;
        margin: 10px;
      ">🚀 Установить игру</button>
      
      <button id="retry" style="
        padding: 15px 40px;
        font-size: 18px;
        background: transparent;
        border: 2px solid rgba(255,255,255,0.3);
        border-radius: 30px;
        color: white; cursor: pointer;
        margin: 10px;
      ">🔄 Сыграть ещё</button>
      
      <div id="handHint" style="
        position: absolute; bottom: 100px;
        animation: bounce 1s infinite;
        font-size: 40px;
      ">👆</div>
      
      <style>
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        #cta:hover { transform: scale(1.05); }
        #retry:hover { background: rgba(255,255,255,0.1); }
      </style>
    `
    
    document.body.appendChild(overlay)
    
    document.getElementById('cta')?.addEventListener('click', () => {
      alert('🚀 Переход к установке...')
    })
    
    document.getElementById('retry')?.addEventListener('click', () => {
      location.reload()
    })
    
    setTimeout(() => {
      const hint = document.getElementById('handHint')
      if (hint) hint.style.opacity = '0'
    }, 3000)
  }
  
  getScore(): number {
    return this.score
  }
  
  onResize(): void {
    if (!this.camera || !this.renderer) return
    this.camera.aspect = window.innerWidth / window.innerHeight
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(window.innerWidth, window.innerHeight)
  }
}