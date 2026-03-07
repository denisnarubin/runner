// src/core/World.ts
import * as THREE from 'three'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js'

export class World {
  private scene: THREE.Scene
  private chunks: Array<THREE.Group> = []
  private chunkLength = 20
  private laneWidth = 1.8
  private spawnZ = 0
  private lastChunkZ = 0
  
  private readonly CHUNK_SPAWN_DISTANCE = 200
  private readonly CHUNK_REMOVE_DISTANCE = 150
  private readonly MAX_CHUNKS = 30
  private readonly INITIAL_CHUNKS = 25
  
  private bombModel: THREE.Object3D | null = null
  private coinModel: THREE.Object3D | null = null
  
  constructor(scene: THREE.Scene) {
    this.scene = scene
    this.spawnZ = 0
    
    // Создаём начальные чанки (с объектами)
    for (let i = 0; i < this.INITIAL_CHUNKS; i++) {
      const zPos = i * this.chunkLength
      this.createChunk(zPos)
      this.lastChunkZ = Math.max(this.lastChunkZ, zPos)
    }
    
    this.chunks.forEach(chunk => {
      chunk.visible = true
    })
    
    // Загружаем модели параллельно и пересоздаём объекты
    Promise.all([
      new Promise<void>(resolve => this.loadBombModel(() => resolve())),
      new Promise<void>(resolve => this.loadCoinModel(() => resolve()))
    ]).then(() => {
      console.log('💣🪙 Все модели загружены!')
      setTimeout(() => {
        this.respawnObjectsAfterLoad()
      }, 100)
    })
    
    const bombLight = new THREE.PointLight(0xff6666, 0.6, 20)
    bombLight.position.set(0, 8, 5)
    bombLight.castShadow = false
    this.scene.add(bombLight)
    
    const roadLight = new THREE.PointLight(0xffffff, 2.0, 100)
    roadLight.position.set(0, 15, 0)
    roadLight.castShadow = false
    this.scene.add(roadLight)
  }
  
  /**
   * 🔥 Пересоздаёт объекты после загрузки моделей
   */
  private respawnObjectsAfterLoad(): void {
    console.log('🔄 Пересоздаю объекты в существующих чанках...')
    let totalCoins = 0
    let totalBombs = 0
    
    this.chunks.forEach(chunk => {
      for (let i = chunk.children.length - 1; i >= 0; i--) {
        const child = chunk.children[i]
        if ((child as any).type === 'bomb' || (child as any).type === 'coin') {
          chunk.remove(child)
        }
      }
      
      const zPos = chunk.position.z
      const count = this.spawnObjectsInChunk(chunk, zPos)
      totalCoins += count.coins
      totalBombs += count.bombs
    })
    
    console.log(`✅ Чанков обновлено: ${this.chunks.length}, Монет: ${totalCoins}, Бомб: ${totalBombs}`)
  }
  
  /**
   * 🔥 Загружает модель монеты
   */
  private loadCoinModel(onReady: () => void): void {
    const loader = new FBXLoader()
    loader.crossOrigin = 'anonymous'
    console.log('⏳ Загрузка модели монеты: /models/Coin_Reskin.fbx')
    
    loader.load(
      '/models/Coin_Reskin.fbx',
      (object: THREE.Object3D) => {
        console.log('✅ Модель монеты загружена!')
        object.scale.set(0.8, 0.8, 0.8)
        
        const textureLoader = new THREE.TextureLoader()
        textureLoader.crossOrigin = 'anonymous'
        
        textureLoader.load(
          '/textures/coin.png',
          (texture) => {
            console.log('✅ Текстура монеты загружена!')
            texture.colorSpace = THREE.SRGBColorSpace
            texture.wrapS = THREE.RepeatWrapping
            texture.wrapT = THREE.RepeatWrapping
            texture.needsUpdate = true
            
            object.traverse((child) => {
              if (child instanceof THREE.Mesh && child.isMesh) {
                child.castShadow = true
                child.receiveShadow = true
                const material = new THREE.MeshStandardMaterial({
                  map: texture,
                  color: 0xffffff,
                  emissive: 0xffaa00,
                  emissiveIntensity: 0.4,
                  metalness: 0.9,
                  roughness: 0.1
                })
                child.material = material
              }
            })
            
            this.coinModel = object
            console.log('🪙 Модель монеты готова!')
            onReady()
          },
          undefined,
          () => {
            console.warn('⚠️ Текстура coin.png не найдена')
            object.traverse((child) => {
              if (child instanceof THREE.Mesh && child.isMesh) {
                child.castShadow = true
                child.receiveShadow = true
                const material = new THREE.MeshStandardMaterial({
                  color: 0xffd700,
                  emissive: 0xffaa00,
                  emissiveIntensity: 0.5,
                  metalness: 1.0,
                  roughness: 0.0
                })
                child.material = material
              }
            })
            this.coinModel = object
            onReady()
          }
        )
      },
      undefined,
      (err) => {
        console.error('❌ Ошибка загрузки модели монеты:', err)
        this.coinModel = null
        onReady()
      }
    )
  }
  
  /**
   * 🔥 Загружает модель бомбы
   */
  private loadBombModel(onReady: () => void): void {
    const loader = new FBXLoader()
    loader.crossOrigin = 'anonymous'
    
    loader.load(
      '/models/tnt_barrel_large.fbx',
      (object: THREE.Object3D) => {
        console.log('✅ Модель бомбы загружена!')
        const box = new THREE.Box3().setFromObject(object)
        const size = new THREE.Vector3()
        box.getSize(size)
        console.log('📏 Размер модели:', size)
        object.scale.set(0.01, 0.01, 0.01)
        
        const textureLoader = new THREE.TextureLoader()
        textureLoader.crossOrigin = 'anonymous'
        
        const texturePaths = {
          albedo: '/textures/explosives_texture.png',
          roughness: '/textures/explosives_rough.png',
          glow: '/textures/explosives_glow.png'
        }
        
        textureLoader.load(
          texturePaths.albedo,
          (albedoTexture) => {
            console.log('✅ Albedo текстура загружена!')
            this.setupTexture(albedoTexture, true)
            
            textureLoader.load(
              texturePaths.roughness,
              (roughTexture) => {
                console.log('✅ Roughness текстура загружена!')
                this.setupTexture(roughTexture, false)
                this.applyPBRTextures(object, albedoTexture, roughTexture, null)
                this.finalizeBomb(object, onReady)
              },
              undefined,
              () => {
                console.warn('⚠️ Roughness не найдена')
                this.applyPBRTextures(object, albedoTexture, null, null)
                this.finalizeBomb(object, onReady)
              }
            )
          },
          undefined,
          () => {
            console.warn('⚠️ Albedo не найдена, применяем красный цвет')
            this.applyColorToObject(object, 0xff4444)
            this.bombModel = object
            onReady()
          }
        )
      },
      (progress) => {
        const percent = Math.round((progress.loaded / progress.total) * 100)
        console.log(`⏳ Модель: ${percent}%`)
      },
      (err) => {
        console.error('❌ Ошибка загрузки модели:', err)
        this.createFallbackBomb()
        onReady()
      }
    )
  }
  
  private setupTexture(texture: THREE.Texture, isColor: boolean): void {
    texture.colorSpace = isColor ? THREE.SRGBColorSpace : THREE.NoColorSpace
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.magFilter = THREE.LinearFilter
    texture.minFilter = THREE.LinearMipmapLinearFilter
    texture.anisotropy = 16
    texture.flipY = true
    texture.needsUpdate = true
  }
  
  private applyPBRTextures(
    object: THREE.Object3D,
    albedo: THREE.Texture,
    roughness: THREE.Texture | null,
    glow: THREE.Texture | null
  ): void {
    object.traverse((child) => {
      if (child instanceof THREE.Mesh && child.isMesh) {
        child.castShadow = true
        child.receiveShadow = true
        
        const material = new THREE.MeshStandardMaterial({
          map: albedo,
          color: 0xffffff,
          roughnessMap: roughness,
          roughness: roughness ? 1.0 : 0.4,
          emissiveMap: glow,
          emissive: glow ? 0xff6600 : 0x221111,
          emissiveIntensity: glow ? 1.0 : 0.4,
          metalness: 0.6,
          envMapIntensity: 0.5,
          side: THREE.FrontSide
        })
        
        material.needsUpdate = true
        if (material.map) {
          material.map.needsUpdate = true
          material.map.colorSpace = THREE.SRGBColorSpace
        }
        if (material.roughnessMap) material.roughnessMap.needsUpdate = true
        if (material.emissiveMap) material.emissiveMap.needsUpdate = true
        
        child.material = material
      }
    })
    console.log('🎨 PBR-текстуры применены')
  }
  
  private finalizeBomb(object: THREE.Object3D, onReady: () => void): void {
    this.bombModel = object
    console.log('💣 Бомба с текстурами готова!')
    onReady()
  }
  
  private applyColorToObject(object: THREE.Object3D, colorHex: number): void {
    object.traverse((child) => {
      if (child instanceof THREE.Mesh && child.isMesh) {
        child.castShadow = true
        child.receiveShadow = true
        
        const material = new THREE.MeshStandardMaterial({
          color: colorHex,
          emissive: 0x661111,
          emissiveIntensity: 0.5,
          roughness: 0.3,
          metalness: 0.8,
          envMapIntensity: 0.6
        })
        
        material.needsUpdate = true
        child.material = material
      }
    })
    console.log('🎨 Красный цвет применён')
  }
  
  private createFallbackBomb(): void {
    console.warn('🔧 Создаю бомбу-заглушку')
    const group = new THREE.Group()
    
    const barrelMat = new THREE.MeshStandardMaterial({
      color: 0xff4444,
      emissive: 0xaa2222,
      emissiveIntensity: 0.6,
      roughness: 0.3,
      metalness: 0.7
    })
    
    const barrelGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.6, 16)
    const barrel = new THREE.Mesh(barrelGeo, barrelMat)
    barrel.rotation.x = Math.PI / 2
    barrel.castShadow = true
    barrel.receiveShadow = true
    group.add(barrel)
    
    const hoopMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.9 })
    const hoopGeo = new THREE.TorusGeometry(0.32, 0.04, 8, 16)
    
    const hoop1 = new THREE.Mesh(hoopGeo, hoopMat)
    hoop1.rotation.x = Math.PI / 2
    hoop1.position.z = -0.15
    hoop1.castShadow = true
    hoop1.receiveShadow = true
    group.add(hoop1)
    
    const hoop2 = hoop1.clone()
    hoop2.position.z = 0.15
    hoop2.castShadow = true
    hoop2.receiveShadow = true
    group.add(hoop2)
    
    const fuseMat = new THREE.MeshStandardMaterial({ 
      color: 0xffaa00, 
      emissive: 0xff6600, 
      emissiveIntensity: 0.8 
    })
    const fuseGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.2, 8)
    const fuse = new THREE.Mesh(fuseGeo, fuseMat)
    fuse.position.set(0, 0, 0.4)
    fuse.rotation.x = Math.PI / 4
    fuse.castShadow = true
    fuse.receiveShadow = true
    group.add(fuse)
    
    group.scale.set(1, 1, 1)
    this.bombModel = group
  }
  
  /**
   * 🔥 СОЗДАНИЕ ЧАНКА С ГАРАНТИРОВАННЫМИ ОБЪЕКТАМИ
   */
  private createChunk(zPosition: number): void {
    const chunk = new THREE.Group()
    
    const roadGeo = new THREE.PlaneGeometry(5.5, this.chunkLength)
    const roadMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.2,
      metalness: 0.3,
      emissive: 0x666666,
      emissiveIntensity: 0.7
    })
    const road = new THREE.Mesh(roadGeo, roadMat)
    road.rotation.x = -Math.PI / 2
    road.position.y = -0.01
    road.receiveShadow = true
    road.name = 'road'
    chunk.add(road)
    
    // 🔥 ВАЖНО: всегда спавним объекты, даже если модели не загружены
    this.spawnObjectsInChunk(chunk, zPosition)
    
    chunk.position.z = zPosition
    chunk.name = `chunk_z${zPosition}`
    chunk.visible = true
    this.scene.add(chunk)
    this.chunks.push(chunk)
  }
  
  /**
   * 🔥 УЛУЧШЕННАЯ ЛОГИКА СПАВНА - ГАРАНТИЯ ОБЪЕКТОВ
   */
  private spawnObjectsInChunk(parent: THREE.Group, zPos: number): {coins: number, bombs: number} {
    let coinCount = 0
    let bombCount = 0
    
    // 🔥 ОПРЕДЕЛЯЕМ ПОЛОСУ ДЛЯ БОМБЫ
    const laneForBomb = Math.floor(Math.random() * 3) - 1
    
    // 🔥 МОНЕТЫ НА ВСЕХ ТРОИХ ПОЛОСАХ (гарантия!)
    const lanesWithCoins = [0, 1, 2].map(l => l - 1) // [-1, 0, 1]
    for (const lane of lanesWithCoins) {
      // Не спавним монету там же где бомба
      if (lane !== laneForBomb) {
        const z = zPos - this.chunkLength/2 + (this.chunkLength * 0.3)
        this.spawnCoin(parent, lane, z)
        coinCount++
      }
    }
    
    // 🔥 БОМБА ТОЛЬКО НА СВОЕЙ ПОЛОСЕ
    this.spawnBomb(parent, laneForBomb, zPos)
    bombCount++
    
    // 🔥 ДОП. МОНЕТЫ СЛУЧАЙНЫЕ
    if (Math.random() < 0.5) {
      const randomLane = Math.floor(Math.random() * 3) - 1
      const z = zPos - this.chunkLength/2 + (this.chunkLength * 0.7)
      this.spawnCoin(parent, randomLane, z)
      coinCount++
    }
    
    return { coins: coinCount, bombs: bombCount }
  }
  
  private getRandomLane(): number {
    return Math.floor(Math.random() * 3) - 1
  }
  
  /**
   * 🔥 Создаёт монету с 3D моделью
   */
  private spawnCoin(parent: THREE.Group, lane: number, zPos: number): void {
    if (this.coinModel) {
      const coin = this.coinModel.clone()
      coin.position.set(
        lane * this.laneWidth,
        1.2,
        zPos + this.chunkLength / 2
      )
      coin.castShadow = true
      coin.receiveShadow = true
      ;(coin as any).type = 'coin'
      ;(coin as any).scoreValue = 1
      ;(coin as any).initialRotation = Math.random() * Math.PI * 2
      parent.add(coin)
    } else {
      const coinGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.1, 16)
      const coinMat = new THREE.MeshStandardMaterial({
        color: 0xffd700,
        emissive: 0xffaa00,
        emissiveIntensity: 0.8,
        metalness: 1.0,
        roughness: 0.0
      })
      const coin = new THREE.Mesh(coinGeo, coinMat)
      coin.position.set(lane * this.laneWidth, 1.2, zPos + this.chunkLength / 2)
      coin.castShadow = true
      coin.receiveShadow = true
      coin.rotation.x = Math.PI / 2
      ;(coin as any).type = 'coin'
      ;(coin as any).scoreValue = 1
      parent.add(coin)
    }
  }
  
  /**
   * 🔥 Создаёт бомбу с fallback
   */
  private spawnBomb(parent: THREE.Group, lane: number, zPos: number): void {
    if (!this.bombModel) {
      console.warn('⚠️ bombModel не загрузилась, создаю заглушку')
      this.createFallbackBomb()
    }
    
    if (this.bombModel) {
      const bomb = this.bombModel.clone()
      bomb.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = true
          child.receiveShadow = true
        }
      })
      
      bomb.position.set(
        lane * this.laneWidth,
        0.5,
        zPos + this.chunkLength / 2 + (Math.random() * 2 - 1)
      )
      
      bomb.visible = true
      ;(bomb as any).type = 'bomb'
      bomb.rotation.y = Math.random() * Math.PI * 2
      parent.add(bomb)
    }
  }
  
  update(playerZ: number): void {
    // СПАВН НОВЫХ ЧАНКОВ
    if (this.chunks.length > 0) {
      let lastChunk = this.chunks[this.chunks.length - 1]
      let lastChunkEndZ = lastChunk.position.z + this.chunkLength
      
      while (playerZ + this.CHUNK_SPAWN_DISTANCE > lastChunkEndZ) {
        const newChunkZ = lastChunkEndZ
        this.createChunk(newChunkZ)
        this.lastChunkZ = newChunkZ
        
        lastChunk = this.chunks[this.chunks.length - 1]
        lastChunkEndZ = lastChunk.position.z + this.chunkLength
      }
    }
    
    // АНИМАЦИЯ МОНЕТ
    this.chunks.forEach((chunk) => {
      chunk.children.forEach((child: any) => {
        if (child.type === 'coin') {
          child.rotation.y += 0.03
          child.position.y = 1.2 + Math.sin(Date.now() * 0.003 + child.initialRotation) * 0.1
        }
      })
    })
    
    // УДАЛЕНИЕ СТАРЫХ ЧАНКОВ
    for (let i = this.chunks.length - 1; i >= 0; i--) {
      const chunk = this.chunks[i]
      const chunkEndZ = chunk.position.z + this.chunkLength
      
      if (chunkEndZ < playerZ - this.CHUNK_REMOVE_DISTANCE) {
        this.scene.remove(chunk)
        
        chunk.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            if (child.geometry) child.geometry.dispose()
            if (child.material) {
              if (Array.isArray(child.material)) {
                child.material.forEach(m => m && m.dispose())
              } else {
                child.material.dispose()
              }
            }
          }
        })
        
        this.chunks.splice(i, 1)
      }
    }
    
    // ЗАЩИТА ОТ ПЕРЕПОЛНЕНИЯ
    if (this.chunks.length > this.MAX_CHUNKS) {
      const toRemove = this.chunks.length - this.MAX_CHUNKS
      for (let i = 0; i < toRemove; i++) {
        const oldest = this.chunks.shift()
        if (oldest) {
          this.scene.remove(oldest)
          oldest.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              if (child.geometry) child.geometry.dispose()
              if (child.material) {
                if (Array.isArray(child.material)) {
                  child.material.forEach(m => m && m.dispose())
                } else {
                  child.material.dispose()
                }
              }
            }
          })
        }
      }
    }
  }
  
  getActiveObjects(): Array<THREE.Mesh> {
    const objects: Array<THREE.Mesh> = []
    
    this.chunks.forEach((chunk) => {
      chunk.children.forEach((child) => {
        if ((child as any).type === 'coin' ||
            (child as any).type === 'bomb' ||
            (child as any).type === 'gate') {
          objects.push(child as THREE.Mesh)
        }
      })
    })
    
    return objects
  }
  
  removeObject(obj: THREE.Mesh): void {
    this.chunks.forEach((chunk) => {
      const index = chunk.children.indexOf(obj as any)
      if (index > -1) {
        chunk.remove(obj as any)
        const mesh = obj as any
        if (mesh.geometry) {
          mesh.geometry.dispose()
        }
        if (mesh.material) {
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((m: any) => m && m.dispose())
          } else {
            mesh.material.dispose()
          }
        }
      }
    })
  }
}