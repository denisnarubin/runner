import * as THREE from 'three';

export class EffectsManager {
  private scene: THREE.Scene;
  private activeEffects: Array<{ update(delta: number): boolean }> = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  public createExplosion(position: THREE.Vector3): void {
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
          (light as unknown as { dispose?: () => void }).dispose?.();
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
      positions[i * 3] = position.x;
      positions[i * 3 + 1] = position.y;
      positions[i * 3 + 2] = position.z;
      colors[i * 3] = 1.0;
      colors[i * 3 + 1] = 0.6 + Math.random() * 0.4;
      colors[i * 3 + 2] = 0.1 + Math.random() * 0.2;
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
          posArray[i * 3] = position.x + velocities[i].x * progress * 2;
          posArray[i * 3 + 1] = position.y + velocities[i].y * progress * 2;
          posArray[i * 3 + 2] = position.z + velocities[i].z * progress * 2;
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
      positions[i * 3] = position.x;
      positions[i * 3 + 1] = position.y;
      positions[i * 3 + 2] = position.z;
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
          posArray[i * 3] = position.x + velocities[i].x * life * 1.5;
          posArray[i * 3 + 1] = position.y + 0.5 + velocities[i].y * life * 1.2;
          posArray[i * 3 + 2] = position.z + velocities[i].z * life * 1.5;
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
      positions[i * 3] = position.x;
      positions[i * 3 + 1] = position.y;
      positions[i * 3 + 2] = position.z;
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
          posArray[i * 3] = position.x + velocities[i].x * life * 1.5;
          posArray[i * 3 + 1] = position.y + 1.0 + velocities[i].y * life * 2;
          posArray[i * 3 + 2] = position.z + velocities[i].z * life * 1.5;
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
      positions[i * 3] = position.x;
      positions[i * 3 + 1] = position.y;
      positions[i * 3 + 2] = position.z;
      colors[i * 3] = 0.9 + Math.random() * 0.3;
      colors[i * 3 + 1] = 0.7 + Math.random() * 0.3;
      colors[i * 3 + 2] = 0.3 + Math.random() * 0.3;
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
          posArray[i * 3] = position.x + velocities[i].x * life * 2;
          posArray[i * 3 + 1] = position.y + velocities[i].y * life * 2;
          posArray[i * 3 + 2] = position.z + velocities[i].z * life * 2;
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
        (ring.material as THREE.Material).opacity = 1 - progress;
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

  public updateEffects(delta: number): void {
    for (let i = this.activeEffects.length - 1; i >= 0; i--) {
      const completed = this.activeEffects[i].update(delta);
      if (completed) {
        this.activeEffects.splice(i, 1);
      }
    }
  }
}