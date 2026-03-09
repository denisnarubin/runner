// src/core/Player.ts
import * as THREE from 'three'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js'

export type CharacterSkin = 
  | 'Character_Jock' | 'Character_Grandma' | 'Character_ShopKeeper'
  | 'Character_SummerGirl' | 'Character_Hobo' | 'Character_HipsterGirl'
  | 'Character_FastFoodGuy' | 'Character_HipsterGuy' | 'Character_Roadworker'
  | 'Character_Gangster' | 'Character_Biker' | 'Character_FireFighter'
  | 'Character_PunkGuy' | 'Character_Grandpa' | 'Character_Tourist'
  | 'Character_Hotdog' | 'Character_PunkGirl' | 'Character_Paramedic'
  | 'Character_GamerGirl' | 'ALL'

export type PlayerState = 'idle' | 'running' | 'falling' | 'dancing' | 'finished'

export class Player {
  private mesh: THREE.Group
  private model: THREE.Object3D | null = null
  private targetX = 0
  private currentLane = 0
  private readonly LANE_WIDTH = 1.8
  private readonly FORWARD_SPEED = 0.15
  private readonly MOVE_LERP = 0.15
  
  // 🔥 Анимации
  private mixer: THREE.AnimationMixer | null = null
  private actions: Map<string, THREE.AnimationAction> = new Map()
  private currentState: PlayerState = 'idle'
  
  // 🔥 🔥 НОВОЕ: Флаг начала движения
  private isMoving = false  // ← Двигается ли персонаж вперёд
  
  // 🔥 Колбэки и таймеры
  private fallTimer: number | null = null
  private onFallComplete?: () => void
  private onDanceComplete?: () => void
  
  private atlasTexture: THREE.Texture | null = null
  private currentSkin: CharacterSkin = 'Character_GamerGirl'
  private characterMeshes: Map<string, THREE.Mesh> = new Map()
  
  constructor(skin: CharacterSkin = 'Character_GamerGirl') {
    this.mesh = new THREE.Group()
    this.currentSkin = skin
    
    this.loadAssets(() => {
      console.log('🎮 Персонаж полностью загружен!')
      console.log(`📊 Зарегистрировано скинов: ${this.characterMeshes.size}`)
      console.log(`🎬 Зарегистрировано анимаций: ${this.actions.size}`)
      
      this.setSkin(this.currentSkin)
      
      // 🔥 Запускаем idle анимацию (персонаж стоит на месте)
      setTimeout(() => {
        console.log('▶️ Запуск idle анимации')
        this.playAnimation('idle')
      }, 500)
    })
  }
  
  private loadAssets(onComplete: () => void): void {
    this.loadAtlas(() => {
      this.loadCharacterModel(() => {
        this.loadMixamoAnimations(() => {
          onComplete()
        })
      })
    })
  }
  
  private loadAtlas(onReady: () => void): void {
    const loader = new THREE.TextureLoader()
    loader.crossOrigin = 'anonymous'
    
    loader.load(
      '/textures/Polygon_City_Characters_Texture_01_A.png',
      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace
        texture.wrapS = THREE.ClampToEdgeWrapping
        texture.wrapT = THREE.ClampToEdgeWrapping
        texture.magFilter = THREE.LinearFilter
        texture.minFilter = THREE.LinearMipmapLinearFilter
        texture.anisotropy = 16
        texture.flipY = true
        texture.needsUpdate = true
        
        this.atlasTexture = texture
        console.log('✅ Текстура атласа загружена')
        onReady()
      },
      undefined,
      () => {
        console.warn('⚠️ Текстура не загружена')
        onReady()
      }
    )
  }
  
  private loadCharacterModel(onReady: () => void): void {
    const loader = new FBXLoader()
    loader.crossOrigin = 'anonymous'
    
    loader.load(
      '/models/Character.fbx',
      (object: THREE.Object3D) => {
        console.log('✅ Базовая модель загружена')
        console.log(`📦 Дочерних объектов: ${object.children.length}`)
        
        this.model = object
        
        object.traverse((child) => {
          if (child instanceof THREE.Mesh && child.name) {
            this.characterMeshes.set(child.name, child)
            console.log(`  └─ Меш: ${child.name}`)
          }
        })
        
        if (this.atlasTexture) {
          this.applyTextureToModel(object)
        }
        
        this.mesh.add(object)
        this.mesh.position.set(0, 0.75, 0)
        
        const box = new THREE.Box3().setFromObject(object)
        const size = new THREE.Vector3()
        box.getSize(size)
        if (size.y > 0.1) {
          const scale = 2.5 / size.y
          this.mesh.scale.setScalar(scale)
          console.log(`⚖️ Масштаб: ${scale.toFixed(2)} (увеличен)`)
        }
        
        this.mixer = new THREE.AnimationMixer(object)
        onReady()
      },
      undefined,
      (err) => {
        console.error('❌ Ошибка загрузки модели:', err)
        this.createPlaceholderCube()
        onReady()
      }
    )
  }
  
  private applyTextureToModel(object: THREE.Object3D): void {
    let texturedMeshes = 0
    
    object.traverse((child) => {
      if (child instanceof THREE.Mesh && child.isMesh) {
        child.castShadow = true
        child.receiveShadow = true
        
        if (!child.geometry.attributes.uv) {
          console.warn(`  ⚠️ Нет UV у ${child.name}`)
          return
        }
        
        const material = new THREE.MeshStandardMaterial({
          map: this.atlasTexture!,
          color: 0xffffff,
          roughness: 0.5,
          metalness: 0.1,
          emissive: 0x222222,
          emissiveIntensity: 0.3,
          side: THREE.FrontSide
        })
        
        material.needsUpdate = true
        if (material.map) {
          material.map.needsUpdate = true
          material.map.colorSpace = THREE.SRGBColorSpace
        }
        
        child.material = material
        texturedMeshes++
      }
    })
    
    console.log(`🎨 Текстура применена к ${texturedMeshes} мешам`)
  }
  
  private loadMixamoAnimations(onReady: () => void): void {
    if (!this.mixer) {
      console.error('❌ Микшер не инициализирован!')
      onReady()
      return
    }
    
    const loader = new FBXLoader()
    loader.crossOrigin = 'anonymous'
    
    const animationsToLoad = [
      { path: '/models/Running.fbx', name: 'run' },
      { path: '/models/Game_over.fbx', name: 'fall' }
    ]
    
    let loaded = 0
    const total = animationsToLoad.length
    
    const checkDone = () => {
      if (++loaded >= total) {
        console.log(`🎬 Загружено анимаций: ${this.actions.size}/${total}`)
        
        if (!this.actions.has('idle')) {
          this.createIdleAnimation()
        }
        
        onReady()
      }
    }
    
    animationsToLoad.forEach(({ path, name }) => {
      loader.load(
        path,
        (object: THREE.Object3D) => {
          console.log(`✅ Загружен файл: ${path}`)
          
          if (object.animations && object.animations.length > 0) {
            let clip = object.animations.find(clip => clip.duration > 0.5)
            if (!clip && object.animations.length > 0) {
              clip = object.animations[0]
            }
            
            if (clip) {
              console.log(`  🎬 Анимация: "${clip.name}" (${clip.duration.toFixed(2)}s)`)
              
              const clonedClip = clip.clone()
              clonedClip.name = name
              
              const action = this.mixer!.clipAction(clonedClip)
              action.loop = name === 'fall' ? THREE.LoopOnce : THREE.LoopRepeat
              
              if (name === 'fall') {
                action.clampWhenFinished = true
              }
              
              this.actions.set(name, action)
              console.log(`  ✅ Анимация "${name}" зарегистрирована`)
            }
          }
          
          object.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              child.geometry?.dispose()
              if (Array.isArray(child.material)) {
                child.material.forEach(m => m?.dispose())
              } else {
                child.material?.dispose()
              }
            }
          })
          
          checkDone()
        },
        undefined,
        (err) => {
          console.warn(`⚠️ Не удалось загрузить ${path}:`, err)
          checkDone()
        }
      )
    })
  }
  
  private createIdleAnimation(): void {
    if (!this.mixer) return
    
    console.log('🔄 Создаю idle анимацию...')
    
    const times = [0, 1, 2]
    const posY = [0, 0.03, 0]
    const rotY = [0, 0.05, 0]
    
    const positionTrack = new THREE.VectorKeyframeTrack('.position[y]', times, posY)
    const rotationTrack = new THREE.VectorKeyframeTrack('.rotation[y]', times, rotY)
    
    const clip = new THREE.AnimationClip('idle', 2, [positionTrack, rotationTrack])
    const action = this.mixer.clipAction(clip)
    action.loop = THREE.LoopRepeat
    
    this.actions.set('idle', action)
    console.log('✅ Idle анимация создана')
  }
  
  private playAnimation(name: string, fadeIn: number = 0.2): void {
    const newAction = this.actions.get(name)
    if (!newAction) {
      console.warn(`⚠️ Анимация "${name}" не найдена! Доступны:`, Array.from(this.actions.keys()))
      return
    }
    
    console.log(`▶️ Воспроизведение анимации "${name}"`)
    
    this.actions.forEach((action) => {
      if (action.isRunning()) {
        action.fadeOut(fadeIn)
      }
    })
    
    newAction.reset()
    newAction.fadeIn(fadeIn)
    newAction.play()
    
    this.currentState = name as PlayerState
  }
  
  /**
   * 🔥 🔥 ИСПРАВЛЕНО: Только анимация, без движения!
   */
  startRunning(): void {
    if (this.currentState !== 'running') {
      console.log('🏃 Запуск анимации бега')
      this.playAnimation('run')
      // 🔥 НЕ включаем isMoving здесь!
    }
  }
  
  /**
   * 🔥 🔥 НОВОЕ: Начать движение вперёд (только при нажатии клавиш)
   */
  startMoving(): void {
    if (!this.isMoving) {
      console.log('▶️ Начало движения вперёд')
      this.isMoving = true
      this.startRunning()  // Запускаем анимацию если ещё не запущена
    }
  }
  
  /**
   * 🔥 Проверка: двигается ли персонаж
   */
  isMovingForward(): boolean {
    return this.isMoving
  }
  
  stopRunning(): void {
    if (this.currentState === 'running') {
      console.log('✋ Остановка бега')
      this.playAnimation('idle')
    }
  }
  
  playFall(onComplete?: () => void): void {
    this.onFallComplete = onComplete
    this.currentState = 'falling'
    this.isMoving = false  // 🔥 Останавливаем движение
    
    this.targetX = this.currentLane * this.LANE_WIDTH
    
    const fallAction = this.actions.get('fall')
    if (fallAction) {
      fallAction.time = 0
      fallAction.reset()
      this.playAnimation('fall', 0.1)
      
      let fallDuration = 1.5
      if (fallAction.getClip()) {
        fallDuration = fallAction.getClip().duration
      }
      
      console.log(`⏱️ Длительность анимации падения: ${fallDuration.toFixed(2)}s`)
      
      this.fallTimer = window.setTimeout(() => {
        this.fallTimer = null
        console.log('🏁 Анимация падения завершена')
        if (this.onFallComplete) this.onFallComplete()
      }, fallDuration * 1000)
    } else {
      console.warn('⚠️ Анимация падения не найдена, использую заглушку')
      setTimeout(() => {
        if (this.onFallComplete) this.onFallComplete()
      }, 800)
    }
  }
  
  playDance(onComplete?: () => void): void {
    this.onDanceComplete = onComplete
    this.currentState = 'dancing'
    this.isMoving = false  // 🔥 Останавливаем движение
    
    const danceAction = this.actions.get('dance')
    if (danceAction) {
      this.playAnimation('dance', 0.3)
      if (onComplete) setTimeout(onComplete, 1500)
    } else {
      if (onComplete) setTimeout(onComplete, 1000)
    }
  }
  
  faceCamera(): void {
    this.mesh.rotation.y = Math.PI
  }
  
  stopAllAnimations(): void {
    if (this.fallTimer) {
      clearTimeout(this.fallTimer)
      this.fallTimer = null
    }
    this.actions.forEach(action => {
      action.stop()
    })
  }
  
  moveLeft(): void {
    if (this.currentLane > -1) {
      this.currentLane--
      this.targetX = this.currentLane * this.LANE_WIDTH
    }
  }
  
  moveRight(): void {
    if (this.currentLane < 1) {
      this.currentLane++
      this.targetX = this.currentLane * this.LANE_WIDTH
    }
  }
  
  /**
   * 🔥 🔥 ИСПРАВЛЕНО: Движение только если isMoving = true
   */
  update(delta: number): void {
    if (this.mixer) {
      this.mixer.update(delta)
    }
    
    // 🔥 Двигаемся вперёд ТОЛЬКО если isMoving = true
    if (this.isMoving && this.currentState !== 'falling') {
      this.mesh.position.z += this.FORWARD_SPEED * 60 * delta
    }
    
    const targetX = this.currentLane * this.LANE_WIDTH
    this.mesh.position.x = THREE.MathUtils.lerp(this.mesh.position.x, targetX, this.MOVE_LERP)
  }
  
  getPosition(): THREE.Vector3 { 
    return this.mesh.position.clone() 
  }
  
  getBounds(): THREE.Box3 {
    const box = new THREE.Box3().setFromObject(this.mesh)
    box.expandByScalar(-0.2)
    return box
  }
  
  getMesh(): THREE.Group { 
    return this.mesh 
  }
  
  getState(): PlayerState { 
    return this.currentState 
  }
  
  setSkin(skin: CharacterSkin): void {
    console.log(`🎨 setSkin("${skin}")`)
    this.currentSkin = skin
    
    this.characterMeshes.forEach((mesh, name) => {
      mesh.visible = (this.currentSkin === 'ALL' || name === this.currentSkin)
    })
  }
  
  getAvailableSkins(): CharacterSkin[] {
    return Array.from(this.characterMeshes.keys()) as CharacterSkin[]
  }
  
  getCurrentSkin(): CharacterSkin {
    return this.currentSkin
  }
  
  private createPlaceholderCube(): void {
    const geo = new THREE.BoxGeometry(1.0, 2.0, 1.0)
    const mat = new THREE.MeshStandardMaterial({ color: 0x4ecca3 })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.position.set(0, 1.0, 0)
    mesh.castShadow = true
    this.mesh.add(mesh)
  }
}