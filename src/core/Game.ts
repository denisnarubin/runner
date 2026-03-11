import * as THREE from 'three';
import { World } from './World';
import { Player } from './Player';
import { Gate } from './Gate';
import type { GateModifier } from './Gate';

export class Game {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private world: World | null = null;
  private player: Player | null = null;
  private characterLight: THREE.PointLight | null = null;
  private clock = new THREE.Clock();
  private score = 0;
  private isGameOver = false;
  private isTutorialVisible = true;
  private isFinished = false;
  private finishLineZ = 200;
  private activeEffects: Array<{ update(delta: number): boolean }> = [];
  
  private readonly CAM_OFFSET_X = 0;
  private readonly CAM_OFFSET_Y = 3.5;
  private readonly CAM_OFFSET_Z = -5;
  private readonly CAM_LOOKAHEAD = 8;
  private readonly CAM_SMOOTH = 0.1;
  
  private tempVector = new THREE.Vector3();
  private coinCounterElement: HTMLElement | null = null;
  private coinIconElement: HTMLElement | null = null;
  private coinContainer: HTMLElement | null = null;
  
  // 🔥 КЭШ ЗВУКОВ для предотвращения фризов
  private soundCache: Map<string, HTMLAudioElement> = new Map();

  constructor(canvas: HTMLCanvasElement) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb);
    this.scene.fog = new THREE.Fog(0x87ceeb, 20, 80);

    this.camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(this.CAM_OFFSET_X, this.CAM_OFFSET_Y, this.CAM_OFFSET_Z);
    this.camera.lookAt(0, 1.5, this.CAM_LOOKAHEAD);

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.8);
    dirLight.position.set(15, 25, 10);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.set(2048, 2048);
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 100;
    dirLight.shadow.camera.left = -20;
    dirLight.shadow.camera.right = 20;
    dirLight.shadow.camera.top = 20;
    dirLight.shadow.camera.bottom = -20;
    this.scene.add(dirLight);

    this.characterLight = new THREE.PointLight(0xffffff, 0.8, 30);
    this.characterLight.position.set(0, 5, 0);
    this.characterLight.castShadow = false;
    this.scene.add(this.characterLight);

    const fillLight = new THREE.PointLight(0xffffff, 0.4);
    fillLight.position.set(5, 10, 5);
    this.scene.add(fillLight);

    this.world = new World(this.scene);
    this.player = new Player();
    this.scene.add(this.player.getMesh());

    this.createFinishLine();
    this.showTutorial();
    this.setupControls();
    this.createCoinCounter();
    
    // Добавляем слушатель изменения размера окна для адаптации счетчика
    window.addEventListener('resize', () => this.updateCoinCounterStyles());
    
    // 🔥 Предзагрузка звуков
    this.preloadSounds();
  }

  // 🔥 ПРЕДЗАГРУЗКА ЗВУКОВ
  private preloadSounds(): void {
    const sounds = ['coin', 'bomb', 'gate'];
    sounds.forEach(name => {
      try {
        const audio = new Audio(`/sounds/${name}.mp3`);
        audio.volume = 0.5;
        this.soundCache.set(name, audio);
      } catch (e) {
        console.warn(`⚠️ Не удалось предзагрузить звук "${name}"`);
      }
    });
  }

  // 🔥 АДАПТИВНЫЙ СЧЕТЧИК с исправленными брейкпоинтами
  private createCoinCounter(): void {
    // Контейнер с адаптивными стилями
    const container = document.createElement('div');
    container.id = 'coin-counter-container';
    document.body.appendChild(container);
    
    // Монета
    const coinIcon = document.createElement('img');
    coinIcon.src = '/textures/coin.png';
    coinIcon.alt = 'coin';
    coinIcon.id = 'coin-icon';
    
    // Резервный вариант при ошибке загрузки
    coinIcon.onerror = () => {
      console.warn('⚠️ Не удалось загрузить coin.png, используем эмодзи');
      const fallbackSpan = document.createElement('span');
      fallbackSpan.innerHTML = '🪙';
      fallbackSpan.id = 'coin-icon-fallback';
      fallbackSpan.style.cssText = `
        font-size: inherit;
        line-height: 1;
        display: inline-block;
      `;
      coinIcon.replaceWith(fallbackSpan);
      this.coinIconElement = fallbackSpan;
    };

    const countText = document.createElement('span');
    countText.id = 'coinCount';
    countText.textContent = `x${this.score}`;

    container.appendChild(coinIcon);
    container.appendChild(countText);
    
    this.coinContainer = container;
    this.coinCounterElement = countText;
    this.coinIconElement = coinIcon;
    
    // Применяем адаптивные стили
    this.updateCoinCounterStyles();
  }

  // 🔥 ИСПРАВЛЕННЫЙ МЕТОД ДЛЯ ОБНОВЛЕНИЯ АДАПТИВНЫХ СТИЛЕЙ (2560px УВЕЛИЧЕН)
  private updateCoinCounterStyles(): void {
    if (!this.coinContainer) return;
    
    const width = window.innerWidth;
    
    // Базовые стили для контейнера
    let containerStyles = `
      position: fixed;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      align-items: center;
      justify-content: flex-end;
      background: linear-gradient(135deg, #ff6b6b, #ff8e8e);
      box-shadow: 0 4px 14px rgba(255, 107, 107, 0.5);
      z-index: 100;
      font-family: 'Arial', sans-serif;
      pointer-events: none;
      overflow: visible;
      border: 2px solid rgba(255, 255, 255, 0.22);
      transition: all 0.3s ease;
    `;
    
    // Стили для иконки
    let iconStyles = `
      object-fit: contain;
      filter: drop-shadow(0 5px 10px rgba(0, 0, 0, 0.55));
      z-index: 101;
      position: relative;
      transition: all 0.3s ease;
    `;
    
    // Стили для текста
    let textStyles = `
      color: #ffd700;
      font-weight: bold;
      text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
      text-align: center;
      letter-spacing: 1.5px;
      line-height: 1;
      transition: all 0.3s ease;
    `;
    
    // 📱 ИСПРАВЛЕННАЯ ПРОГРЕССИВНАЯ ШКАЛА (2560px УВЕЛИЧЕН)
    if (width >= 1920) {
      // Очень большие экраны (1920px+) - УВЕЛИЧЕННЫЙ РАЗМЕР
      containerStyles += `
        top: 45px;
        padding: 6px 28px 6px 0;
        height: 44px;
        min-width: 160px;
        border-radius: 24px;
      `;
      iconStyles += `
        width: 76px;
        height: 76px;
        margin-left: -86px;
        margin-right: -22px;
        margin-top: -24px;
        margin-bottom: -24px;
        left: -28px;
        transform: scale(1.06);
      `;
      textStyles += `
        font-size: 30px;
        min-width: 80px;
        margin-right: 6px;
      `;
    }
    else if (width >= 1440) {
      // Большие десктопы (1440-1919px) - размер как был для 1024
      containerStyles += `
        top: 25px;
        padding: 3px 18px 3px 0;
        height: 30px;
        min-width: 110px;
        border-radius: 16px;
      `;
      iconStyles += `
        width: 52px;
        height: 52px;
        margin-left: -62px;
        margin-right: -14px;
        margin-top: -16px;
        margin-bottom: -16px;
        left: -19px;
        transform: scale(1.02);
      `;
      textStyles += `
        font-size: 20px;
        min-width: 55px;
        margin-right: 3px;
      `;
    } 
    else if (width >= 1024) {
      // Десктопы (1024-1439px) - размер как был для 768
      containerStyles += `
        top: 20px;
        padding: 3px 16px 3px 0;
        height: 28px;
        min-width: 100px;
        border-radius: 15px;
      `;
      iconStyles += `
        width: 48px;
        height: 48px;
        margin-left: -56px;
        margin-right: -12px;
        margin-top: -14px;
        margin-bottom: -14px;
        left: -17px;
        transform: scale(1.02);
      `;
      textStyles += `
        font-size: 18px;
        min-width: 50px;
        margin-right: 3px;
      `;
    } 
    else if (width >= 768) {
      // Планшеты (768-1023px) - размер как был для 576
      containerStyles += `
        top: 18px;
        padding: 2px 14px 2px 0;
        height: 26px;
        min-width: 90px;
        border-radius: 14px;
      `;
      iconStyles += `
        width: 44px;
        height: 44px;
        margin-left: -50px;
        margin-right: -10px;
        margin-top: -12px;
        margin-bottom: -12px;
        left: -15px;
        transform: scale(1.01);
      `;
      textStyles += `
        font-size: 16px;
        min-width: 45px;
        margin-right: 2px;
      `;
    } 
    else if (width >= 576) {
      // Мобильные большие (576-767px) - размер как был для 425
      containerStyles += `
        top: 16px;
        padding: 2px 12px 2px 0;
        height: 24px;
        min-width: 80px;
        border-radius: 12px;
      `;
      iconStyles += `
        width: 40px;
        height: 40px;
        margin-left: -46px;
        margin-right: -8px;
        margin-top: -10px;
        margin-bottom: -10px;
        left: -13px;
        transform: scale(1);
      `;
      textStyles += `
        font-size: 15px;
        min-width: 40px;
        margin-right: 2px;
      `;
    } 
    else if (width >= 425) {
      // Мобильные средние (425-575px) - размер как был для 375
      containerStyles += `
        top: 14px;
        padding: 2px 10px 2px 0;
        height: 22px;
        min-width: 70px;
        border-radius: 11px;
      `;
      iconStyles += `
        width: 36px;
        height: 36px;
        margin-left: -42px;
        margin-right: -6px;
        margin-top: -9px;
        margin-bottom: -9px;
        left: -11px;
        transform: scale(0.99);
      `;
      textStyles += `
        font-size: 14px;
        min-width: 35px;
        margin-right: 2px;
      `;
    }
    else {
      // Маленькие мобильные (до 424px) - еще меньше
      containerStyles += `
        top: 12px;
        padding: 2px 8px 2px 0;
        height: 20px;
        min-width: 60px;
        border-radius: 10px;
      `;
      iconStyles += `
        width: 32px;
        height: 32px;
        margin-left: -38px;
        margin-right: -4px;
        margin-top: -8px;
        margin-bottom: -8px;
        left: -9px;
        transform: scale(0.98);
      `;
      textStyles += `
        font-size: 13px;
        min-width: 30px;
        margin-right: 2px;
      `;
    }
    
    // Применяем стили к контейнеру
    this.coinContainer.style.cssText = containerStyles;
    
    // Применяем стили к иконке (если это изображение)
    const icon = this.coinIconElement;
    if (icon && icon.tagName === 'IMG') {
      (icon as HTMLImageElement).style.cssText = iconStyles;
    } else if (icon && icon.id === 'coin-icon-fallback') {
      // Для эмодзи-заглушки - прогрессивная шкала с исправленными размерами
      let emojiSize, emojiMarginLeft, emojiMarginRight, emojiMarginTop, emojiMarginBottom, emojiLeft;
      
      if (width >= 1920) {
        emojiSize = '76px';
        emojiMarginLeft = '-86px';
        emojiMarginRight = '-22px';
        emojiMarginTop = '-24px';
        emojiMarginBottom = '-24px';
        emojiLeft = '-28px';
      } else if (width >= 1440) {
        emojiSize = '52px';
        emojiMarginLeft = '-62px';
        emojiMarginRight = '-14px';
        emojiMarginTop = '-16px';
        emojiMarginBottom = '-16px';
        emojiLeft = '-19px';
      } else if (width >= 1024) {
        emojiSize = '48px';
        emojiMarginLeft = '-56px';
        emojiMarginRight = '-12px';
        emojiMarginTop = '-14px';
        emojiMarginBottom = '-14px';
        emojiLeft = '-17px';
      } else if (width >= 768) {
        emojiSize = '44px';
        emojiMarginLeft = '-50px';
        emojiMarginRight = '-10px';
        emojiMarginTop = '-12px';
        emojiMarginBottom = '-12px';
        emojiLeft = '-15px';
      } else if (width >= 576) {
        emojiSize = '40px';
        emojiMarginLeft = '-46px';
        emojiMarginRight = '-8px';
        emojiMarginTop = '-10px';
        emojiMarginBottom = '-10px';
        emojiLeft = '-13px';
      } else if (width >= 425) {
        emojiSize = '36px';
        emojiMarginLeft = '-42px';
        emojiMarginRight = '-6px';
        emojiMarginTop = '-9px';
        emojiMarginBottom = '-9px';
        emojiLeft = '-11px';
      } else {
        emojiSize = '32px';
        emojiMarginLeft = '-38px';
        emojiMarginRight = '-4px';
        emojiMarginTop = '-8px';
        emojiMarginBottom = '-8px';
        emojiLeft = '-9px';
      }
      
      icon.style.cssText = `
        font-size: ${emojiSize};
        filter: drop-shadow(0 5px 10px rgba(0, 0, 0, 0.55));
        margin-left: ${emojiMarginLeft};
        margin-right: ${emojiMarginRight};
        margin-top: ${emojiMarginTop};
        margin-bottom: ${emojiMarginBottom};
        z-index: 101;
        position: relative;
        left: ${emojiLeft};
        transition: all 0.3s ease;
        line-height: 1;
        display: inline-block;
      `;
    }
    
    if (this.coinCounterElement) {
      this.coinCounterElement.style.cssText = textStyles;
    }
  }

  // 🔥 УБРАЛ ВСЕ АНИМАЦИИ И ТАЙМАУТЫ!
  private updateCoinCounter(): void {
    if (this.coinCounterElement) {
      this.coinCounterElement.textContent = `x${this.score}`;
    }
  }

  private createFinishLine(): void {
    const finishGroup = new THREE.Group();
    const tileSize = 0.5;
    const tilesX = 12;
    const tilesZ = 8;
    const totalWidth = tilesX * tileSize;
    const totalLength = tilesZ * tileSize;

    for (let i = 0; i < tilesX; i++) {
      for (let j = 0; j < tilesZ; j++) {
        const isBlack = (i + j) % 2 === 0;
        const color = isBlack ? 0x000000 : 0xffffff;
        const emissiveColor = isBlack ? 0x111111 : 0x444444;
        
        const material = new THREE.MeshStandardMaterial({
          color: color,
          emissive: emissiveColor,
          emissiveIntensity: 0.2,
          roughness: 0.4,
          metalness: 0.1
        });

        const geometry = new THREE.BoxGeometry(tileSize - 0.02, 0.05, tileSize - 0.02);
        const tile = new THREE.Mesh(geometry, material);
        
        const xPos = -totalWidth/2 + i * tileSize + tileSize/2;
        const zPos = this.finishLineZ - totalLength/2 + j * tileSize + tileSize/2;
        
        tile.position.set(xPos, 0.02, zPos);
        tile.receiveShadow = true;
        tile.castShadow = false;
        finishGroup.add(tile);
      }
    }
    this.scene.add(finishGroup);
  }

  private createExplosion(position: THREE.Vector3): void {
    this.createFlashLight(position);
    this.createExplosionCore(position);
    this.createSparksAndDebris(position);
    this.createFireball(position);
    this.createSmoke(position);
    setTimeout(() => {
      this.createShockwave(position);
    }, 300);
  }

  private createFlashLight(position: THREE.Vector3): void {
    const light = new THREE.PointLight(0xff6600, 5, 15);
    light.position.copy(position);
    this.scene.add(light);
    
    let life = 0;
    const maxLife = 0.3;
    const effect = {
      update: (delta: number): boolean => {
        life += delta;
        const progress = life / maxLife;
        light.intensity = 5 * (1 - progress);
        if (life >= maxLife) {
          this.scene.remove(light);
          light.dispose();
          return true;
        }
        return false;
      }
    };
    this.activeEffects.push(effect);
  }

  private createExplosionCore(position: THREE.Vector3): void {
    const particleCount = 60;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount; i++) {
      positions[i*3] = position.x;
      positions[i*3+1] = position.y;
      positions[i*3+2] = position.z;
      
      const r = 1.0;
      const g = 0.6 + Math.random() * 0.4;
      const b = 0.1 + Math.random() * 0.2;
      colors[i*3] = r;
      colors[i*3+1] = g;
      colors[i*3+2] = b;
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    const material = new THREE.PointsMaterial({
      size: 0.4,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
      opacity: 1.0,
      sizeAttenuation: true
    });
    
    const particles = new THREE.Points(geometry, material);
    this.scene.add(particles);
    
    const velocities: THREE.Vector3[] = [];
    for (let i = 0; i < particleCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const speed = 8 + Math.random() * 8;
      velocities.push(new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta) * speed,
        Math.sin(phi) * Math.sin(theta) * speed,
        Math.cos(phi) * speed
      ));
    }
    
    let life = 0;
    const maxLife = 0.8;
    const effect = {
      update: (delta: number): boolean => {
        life += delta;
        const progress = life / maxLife;
        
        const posAttr = geometry.attributes.position;
        const posArray = posAttr.array as Float32Array;
        
        for (let i = 0; i < particleCount; i++) {
          posArray[i*3] = position.x + velocities[i].x * progress * 2;
          posArray[i*3+1] = position.y + velocities[i].y * progress * 2;
          posArray[i*3+2] = position.z + velocities[i].z * progress * 2;
        }
        posAttr.needsUpdate = true;
        
        material.opacity = 1 - progress * 1.5;
        material.size = 0.4 * (1 - progress * 0.5);
        
        if (life >= maxLife) {
          this.scene.remove(particles);
          geometry.dispose();
          material.dispose();
          return true;
        }
        return false;
      }
    };
    this.activeEffects.push(effect);
  }

  private createFireball(position: THREE.Vector3): void {
    const particleCount = 30;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount; i++) {
      positions[i*3] = position.x;
      positions[i*3+1] = position.y;
      positions[i*3+2] = position.z;
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d')!;
    
    const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.4, 'rgba(255,200,100,1)');
    gradient.addColorStop(0.7, 'rgba(255,100,0,0.8)');
    gradient.addColorStop(1, 'rgba(255,0,0,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 32, 32);
    
    const texture = new THREE.CanvasTexture(canvas);
    
    const material = new THREE.PointsMaterial({
      size: 1.5,
      map: texture,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
      opacity: 0.9,
      sizeAttenuation: true,
      color: 0xffaa33
    });
    
    const particles = new THREE.Points(geometry, material);
    this.scene.add(particles);
    
    const velocities: THREE.Vector3[] = [];
    for (let i = 0; i < particleCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const speed = 2 + Math.random() * 3;
      velocities.push(new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta) * speed,
        Math.sin(phi) * Math.sin(theta) * speed * 0.5,
        Math.cos(phi) * speed
      ));
    }
    
    let life = 0;
    const maxLife = 1.5;
    const effect = {
      update: (delta: number): boolean => {
        life += delta;
        const progress = life / maxLife;
        
        const posAttr = geometry.attributes.position;
        const posArray = posAttr.array as Float32Array;
        
        for (let i = 0; i < particleCount; i++) {
          posArray[i*3] = position.x + velocities[i].x * life * 1.5;
          posArray[i*3+1] = position.y + 0.5 + velocities[i].y * life * 1.2;
          posArray[i*3+2] = position.z + velocities[i].z * life * 1.5;
        }
        posAttr.needsUpdate = true;
        
        material.opacity = 0.9 * (1 - progress * 0.8);
        material.size = 1.5 * (1 + progress);
        
        if (life >= maxLife) {
          this.scene.remove(particles);
          geometry.dispose();
          material.dispose();
          texture.dispose();
          return true;
        }
        return false;
      }
    };
    this.activeEffects.push(effect);
  }

  private createSmoke(position: THREE.Vector3): void {
    const particleCount = 25;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount; i++) {
      positions[i*3] = position.x;
      positions[i*3+1] = position.y;
      positions[i*3+2] = position.z;
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d')!;
    
    const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    gradient.addColorStop(0, 'rgba(100,100,100,0.8)');
    gradient.addColorStop(0.5, 'rgba(80,80,80,0.5)');
    gradient.addColorStop(1, 'rgba(50,50,50,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 32, 32);
    
    const texture = new THREE.CanvasTexture(canvas);
    
    const material = new THREE.PointsMaterial({
      size: 2.0,
      map: texture,
      blending: THREE.NormalBlending,
      depthWrite: false,
      transparent: true,
      opacity: 0.6,
      sizeAttenuation: true,
      color: 0x888888
    });
    
    const particles = new THREE.Points(geometry, material);
    this.scene.add(particles);
    
    const velocities: THREE.Vector3[] = [];
    for (let i = 0; i < particleCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 2;
      velocities.push(new THREE.Vector3(
        Math.cos(theta) * speed,
        Math.random() * 2,
        Math.sin(theta) * speed
      ));
    }
    
    let life = 0;
    const maxLife = 2.2;
    const effect = {
      update: (delta: number): boolean => {
        life += delta;
        const progress = life / maxLife;
        
        const posAttr = geometry.attributes.position;
        const posArray = posAttr.array as Float32Array;
        
        for (let i = 0; i < particleCount; i++) {
          posArray[i*3] = position.x + velocities[i].x * life * 1.5;
          posArray[i*3+1] = position.y + 1.0 + velocities[i].y * life * 2;
          posArray[i*3+2] = position.z + velocities[i].z * life * 1.5;
        }
        posAttr.needsUpdate = true;
        
        material.opacity = 0.6 * (1 - progress * 0.7);
        material.size = 2.0 * (1 + progress);
        
        if (life >= maxLife) {
          this.scene.remove(particles);
          geometry.dispose();
          material.dispose();
          texture.dispose();
          return true;
        }
        return false;
      }
    };
    this.activeEffects.push(effect);
  }

  private createSparksAndDebris(position: THREE.Vector3): void {
    const particleCount = 50;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount; i++) {
      positions[i*3] = position.x;
      positions[i*3+1] = position.y;
      positions[i*3+2] = position.z;
      
      const r = 0.9 + Math.random() * 0.3;
      const g = 0.7 + Math.random() * 0.3;
      const b = 0.3 + Math.random() * 0.3;
      colors[i*3] = r;
      colors[i*3+1] = g;
      colors[i*3+2] = b;
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    const material = new THREE.PointsMaterial({
      size: 0.2,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
      opacity: 1.0,
      sizeAttenuation: true
    });
    
    const particles = new THREE.Points(geometry, material);
    this.scene.add(particles);
    
    const velocities: THREE.Vector3[] = [];
    for (let i = 0; i < particleCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const speed = 5 + Math.random() * 10;
      velocities.push(new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta) * speed,
        Math.sin(phi) * Math.sin(theta) * speed,
        Math.cos(phi) * speed
      ));
    }
    
    let life = 0;
    const maxLife = 1.0;
    const effect = {
      update: (delta: number): boolean => {
        life += delta;
        const progress = life / maxLife;
        
        const posAttr = geometry.attributes.position;
        const posArray = posAttr.array as Float32Array;
        
        for (let i = 0; i < particleCount; i++) {
          posArray[i*3] = position.x + velocities[i].x * life * 2;
          posArray[i*3+1] = position.y + velocities[i].y * life * 2;
          posArray[i*3+2] = position.z + velocities[i].z * life * 2;
        }
        posAttr.needsUpdate = true;
        
        material.opacity = 1 - progress * 1.5;
        material.size = 0.2 * (1 - progress * 0.8);
        
        if (life >= maxLife) {
          this.scene.remove(particles);
          geometry.dispose();
          material.dispose();
          return true;
        }
        return false;
      }
    };
    this.activeEffects.push(effect);
  }

  private createShockwave(position: THREE.Vector3): void {
    const segments = 32;
    const geometry = new THREE.RingGeometry(0.1, 0.5, segments);
    
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255,255,255,0)');
    gradient.addColorStop(0.3, 'rgba(255,200,100,0.8)');
    gradient.addColorStop(0.6, 'rgba(255,100,50,0.4)');
    gradient.addColorStop(1, 'rgba(255,0,0,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
    
    const texture = new THREE.CanvasTexture(canvas);
    
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    
    const ring = new THREE.Mesh(geometry, material);
    ring.position.copy(position);
    ring.position.y += 0.5;
    ring.rotation.x = Math.PI / 2;
    this.scene.add(ring);
    
    let life = 0;
    const maxLife = 0.8;
    const effect = {
      update: (delta: number): boolean => {
        life += delta;
        const progress = life / maxLife;
        const scale = 1 + progress * 5;
        ring.scale.set(scale, scale, scale);
        ring.material.opacity = 1 - progress;
        
        if (life >= maxLife) {
          this.scene.remove(ring);
          geometry.dispose();
          material.dispose();
          texture.dispose();
          return true;
        }
        return false;
      }
    };
    this.activeEffects.push(effect);
  }

  private showTutorial(): void {
    const overlay = document.createElement('div');
    overlay.id = 'tutorial';
    overlay.style.cssText = `
      position: fixed; top: 0; left: 0;
      width: 100%; height: 100%;
      background: rgba(0,0,0,0.7);
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      color: white; font-family: sans-serif;
      z-index: 1000; pointer-events: auto;
    `;
    overlay.innerHTML = `
      <h2 style="font-size: 28px; margin-bottom: 20px;">🎮 Как играть</h2>
      <p style="font-size: 18px; margin: 10px;">👆 Свайпни <b>влево/вправо</b> для движения</p>
      <p style="font-size: 18px; margin: 10px;">🪙 Собирай <b>монеты</b></p>
      <p style="font-size: 18px; margin: 10px;">💣 Избегай <b>бомб</b></p>
      <p style="font-size: 18px; margin: 10px;">🔷 Проходи сквозь <b>ворота</b> для бонусов!</p>
      <p style="font-size: 18px; margin: 10px;">🏁 Достигни <b>финиша</b></p>
      <p style="font-size: 18px; margin: 10px; margin-top: 30px; opacity: 0.8;">Нажми любую клавишу чтобы начать</p>
    `;
    document.body.appendChild(overlay);
    
    const hide = () => {
      if (this.isTutorialVisible) {
        this.isTutorialVisible = false;
        overlay.remove();
        this.player?.startRunning();
      }
    };
    
    overlay.addEventListener('click', hide);
    overlay.addEventListener('touchstart', hide);
  }

  private setupControls(): void {
    let startX = 0;
    
    const onStart = (x: number) => { startX = x; };
    const onEnd = (x: number) => {
      if (this.isFinished || this.isGameOver) return;
      const diff = x - startX;
      if (Math.abs(diff) > 50) {
        this.player?.startMoving();
        if (diff > 0) this.player?.moveRight();
        else this.player?.moveLeft();
      }
    };
    
    window.addEventListener('mousedown', (e) => onStart(e.clientX));
    window.addEventListener('mouseup', (e) => onEnd(e.clientX));
    window.addEventListener('touchstart', (e) => onStart(e.touches[0].clientX), { passive: true });
    window.addEventListener('touchend', (e) => onEnd(e.changedTouches[0].clientX), { passive: true });
    
    window.addEventListener('keydown', (e) => {
      if (this.isFinished || this.isGameOver) return;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === ' ' || e.key === 'Enter') {
        this.player?.startMoving();
        if (e.key === 'ArrowLeft') this.player?.moveLeft();
        if (e.key === 'ArrowRight') this.player?.moveRight();
      }
    });
  }

  start(): void {
    this.animate();
    window.addEventListener('resize', () => this.onResize());
  }

  private animate = (): void => {
    requestAnimationFrame(this.animate);
    
    const delta = Math.min(this.clock.getDelta(), 0.1);
    
    if (this.player) {
      this.player.update(delta);
      
      if (this.world && !this.isFinished) {
        this.world.update(this.player.getPosition().z);
      }
      
      if (!this.isFinished && !this.isGameOver && this.player.getPosition().z >= this.finishLineZ) {
        this.handleFinish();
      }
      
      if (!this.isFinished && !this.isGameOver) {
        this.checkCollisions();
      }
      
      const pos = this.player.getPosition();
      this.camera.position.x += (pos.x - this.camera.position.x) * this.CAM_SMOOTH;
      this.camera.position.y += (this.CAM_OFFSET_Y - this.camera.position.y) * this.CAM_SMOOTH;
      this.camera.position.z += (pos.z + this.CAM_OFFSET_Z - this.camera.position.z) * this.CAM_SMOOTH;
      this.camera.lookAt(pos.x, 1.5, pos.z + this.CAM_LOOKAHEAD);
      
      if (this.characterLight) {
        this.characterLight.position.x = pos.x;
        this.characterLight.position.z = pos.z + 2;
      }
    }
    
    for (let i = this.activeEffects.length - 1; i >= 0; i--) {
      const completed = this.activeEffects[i].update(delta);
      if (completed) {
        this.activeEffects.splice(i, 1);
      }
    }
    
    this.renderer.render(this.scene, this.camera);
  };

  private handleFinish(): void {
    if (this.isFinished) return;
    this.isFinished = true;
    
    if (this.player) {
      this.player.stopMoving();
    }
    
    if (this.world) {
      this.world.clearAllObjects();
    }
    
    if (this.player && !this.isGameOver) {
      this.player.faceCamera();
      
      setTimeout(() => {
        if (this.player && !this.isGameOver) {
          this.player.playBreakdance(() => {
            setTimeout(() => {
              this.endGame(true);
            }, 1500);
          });
        }
      }, 300);
    }
  }

  // 🔥 УБРАЛ ВСЕ ЛОГИ И ТЯЖЁЛЫЕ ОПЕРАЦИИ
  private checkCollisions(): void {
    if (!this.player || !this.world || this.isGameOver || this.isFinished) return;
    
    const playerPos = this.player.getPosition();
    const objects = this.world.getActiveObjects();
    
    for (let i = objects.length - 1; i >= 0; i--) {
      const obj = objects[i];
      const type = (obj as any).type as string;
      
      obj.getWorldPosition(this.tempVector);
      
      const distance = playerPos.distanceTo(this.tempVector);
      let shouldCollide = false;
      
      switch (type) {
        case 'bomb':
          shouldCollide = distance < 0.5;
          break;
        case 'coin':
          shouldCollide = distance < 0.8;
          break;
        case 'gate':
          shouldCollide = distance < 2.5;
          break;
      }
      
      if (shouldCollide) {
        this.handleCollision(obj, this.tempVector.clone());
      }
    }
  }

  // 🔥 ОПТИМИЗИРОВАННАЯ ОБРАБОТКА КОЛЛИЗИЙ (без фризов!)
  private handleCollision(obj: THREE.Object3D, objPos: THREE.Vector3): void {
    const type = (obj as any).type as string;
    
    switch (type) {
      case 'coin':
        // 🔥 ПРОВЕРКА: уже собрана?
        if ((obj as any).isCollected) {
          return;
        }
        
        this.score += 1;
        // 🔥 СКРЫВАЕМ вместо удаления
        obj.visible = false;
        // 🔥 Помечаем как собранную
        (obj as any).isCollected = true;
        
        this.updateCoinCounter();
        this.playSound('coin');
        break;
        
      case 'bomb':
        this.createExplosion(objPos);
        if (this.player) {
          this.player.playFall(() => {
            this.endGame(false);
          });
        }
        // Бомбы удаляем (они больше не нужны)
        this.world?.removeObject(obj);
        this.playSound('bomb');
        break;
        
      case 'gate':
        const gate = (obj as any).gate as Gate;
        if (!gate || gate.isPassed()) {
          return;
        }
        
        const playerPos = this.player?.getPosition() || new THREE.Vector3();
        const side = playerPos.x < 0 ? 'left' : 'right';
        const modifier = gate.getModifier(side);
        
        if (modifier) {
          switch (modifier.type) {
            case '+':
              this.score += modifier.value;
              break;
            case '-':
              this.score = Math.max(0, this.score - modifier.value);
              break;
            case 'x':
              this.score *= modifier.value;
              break;
          }
          
          this.updateCoinCounter();
          this.playSound('gate');
          gate.markAsPassed();
        }
        break;
    }
  }

  // 🔥 ОПТИМИЗИРОВАННОЕ ВОСПРОИЗВЕДЕНИЕ ЗВУКА
  private playSound(name: string): void {
    try {
      const cachedAudio = this.soundCache.get(name);
      if (cachedAudio) {
        // 🔥 Создаём клон предзагруженного звука
        const clone = cachedAudio.cloneNode() as HTMLAudioElement;
        clone.volume = 0.5;
        clone.play().catch(() => {});
      } else {
        // Резервный вариант
        const audio = new Audio(`/sounds/${name}.mp3`);
        audio.volume = 0.5;
        audio.play().catch(() => {});
      }
    } catch {}
  }

  private endGame(success: boolean): void {
    this.isGameOver = true;
    if (success && this.player) {
      this.player.faceCamera();
    }
    setTimeout(() => this.showEndCard(), success ? 1500 : 500);
  }

  private showEndCard(): void {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed; top: 0; left: 0;
      width: 100%; height: 100%;
      background: linear-gradient(135deg, #1a1a2e, #16213e);
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      color: white; font-family: sans-serif;
      z-index: 2000;
    `;
    overlay.innerHTML = `
      <h1 style="font-size: 48px; margin: 0 0 10px;">${this.isFinished ? '🏆 ПОБЕДА! 🏆' : (this.score >= 10 ? '🎉' : '💀')} ${this.score} монет!</h1>
      <p style="font-size: 20px; opacity: 0.8; margin-bottom: 30px;">${this.isFinished ? 'Ты добрался до финиша!' : (this.score >= 10 ? 'Отличный результат!' : 'Попробуй ещё раз!')}</p>
      <button id="cta" style="
        padding: 20px 60px;
        font-size: 24px;
        font-weight: bold;
        background: linear-gradient(135deg, #4ecca3, #38b28a);
        border: none;
        border-radius: 50px;
        color: white;
        cursor: pointer;
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
        color: white;
        cursor: pointer;
        margin: 10px;
      ">🔄 Сыграть ещё</button>
    `;
    document.body.appendChild(overlay);
    
    document.getElementById('cta')?.addEventListener('click', () => {
      alert('🚀 Переход к установке...');
    });
    
    document.getElementById('retry')?.addEventListener('click', () => {
      location.reload();
    });
  }

  getScore(): number {
    return this.score;
  }

  onResize(): void {
    if (!this.camera || !this.renderer) return;
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    // Обновляем стили счетчика при изменении размера окна
    this.updateCoinCounterStyles();
  }
}