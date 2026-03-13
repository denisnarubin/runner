// utils/modelLoader.ts
import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { setupTexture } from './textureSetup';
import coinModelUrl from '../assets/models/Coin_Reskin.fbx?url';
import bombModelUrl from '../assets/models/tnt_barrel_large.fbx?url';
import coinTextureUrl from '../assets/textures/coin.png?url';
import explosivesTextureUrl from '../assets/textures/explosives_texture.webp?url';
import explosivesRoughUrl from '../assets/textures/explosives_rough.png?url';

export class ModelLoader {
  static async loadCoinModel(): Promise<THREE.Object3D> {
    return new Promise((resolve) => {
      const loader = new FBXLoader();
      loader.crossOrigin = 'anonymous';
      
      loader.load(
        coinModelUrl,
        (object) => {
          object.scale.set(0.8, 0.8, 0.8);
          this.applyCoinTexture(object, resolve);
        },
        undefined,
        () => resolve(this.createFallbackCoin())
      );
    });
  }

  private static applyCoinTexture(object: THREE.Object3D, resolve: (obj: THREE.Object3D) => void): void {
    const textureLoader = new THREE.TextureLoader();
    textureLoader.crossOrigin = 'anonymous';
    
    textureLoader.load(
      coinTextureUrl,
      (texture) => {
        setupTexture(texture, true);
        this.applyCoinMaterial(object, texture);
        resolve(object);
      },
      undefined,
      () => {
        this.applyCoinFallbackMaterial(object);
        resolve(object);
      }
    );
  }

  private static applyCoinMaterial(object: THREE.Object3D, texture: THREE.Texture): void {
    object.traverse((child) => {
      if (child instanceof THREE.Mesh && child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        child.material = new THREE.MeshStandardMaterial({
          map: texture,
          color: 0xffffff,
          emissive: 0xffaa00,
          emissiveIntensity: 0.4,
          metalness: 0.9,
          roughness: 0.1
        });
      }
    });
  }

  private static applyCoinFallbackMaterial(object: THREE.Object3D): void {
    object.traverse((child) => {
      if (child instanceof THREE.Mesh && child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        child.material = new THREE.MeshStandardMaterial({
          color: 0xffd700,
          emissive: 0xffaa00,
          emissiveIntensity: 0.5,
          metalness: 1.0,
          roughness: 0.0
        });
      }
    });
  }

  private static createFallbackCoin(): THREE.Object3D {
    const coinGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.1, 16);
    const coinMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      emissive: 0xffaa00,
      emissiveIntensity: 0.8,
      metalness: 1.0,
      roughness: 0.0
    });
    const coin = new THREE.Mesh(coinGeo, coinMat);
    coin.rotation.x = Math.PI / 2;
    return coin;
  }

  static async loadBombModel(): Promise<THREE.Object3D> {
    return new Promise((resolve) => {
      const loader = new FBXLoader();
      loader.crossOrigin = 'anonymous';
      
      loader.load(
        bombModelUrl,
        (object) => {
          object.scale.set(0.01, 0.01, 0.01);
          this.applyBombTexture(object, resolve);
        },
        undefined,
        () => resolve(this.createFallbackBomb())
      );
    });
  }

  private static applyBombTexture(object: THREE.Object3D, resolve: (obj: THREE.Object3D) => void): void {
    const textureLoader = new THREE.TextureLoader();
    textureLoader.crossOrigin = 'anonymous';
    
    textureLoader.load(
      explosivesTextureUrl,
      (albedo) => {
        setupTexture(albedo, true);
        
        textureLoader.load(
          explosivesRoughUrl,
          (rough) => {
            setupTexture(rough, false);
            this.applyPBRMaterials(object, albedo, rough);
            resolve(object);
          },
          undefined,
          () => {
            this.applyPBRMaterials(object, albedo, null);
            resolve(object);
          }
        );
      },
      undefined,
      () => {
        this.applyBombFallbackColor(object);
        resolve(object);
      }
    );
  }

  private static applyPBRMaterials(
    object: THREE.Object3D, 
    albedo: THREE.Texture, 
    roughness: THREE.Texture | null
  ): void {
    object.traverse((child) => {
      if (child instanceof THREE.Mesh && child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        child.material = new THREE.MeshStandardMaterial({
          map: albedo,
          color: 0xffffff,
          roughnessMap: roughness,
          roughness: roughness ? 1.0 : 0.4,
          emissive: 0x221111,
          emissiveIntensity: 0.4,
          metalness: 0.6
        });
      }
    });
  }

  private static applyBombFallbackColor(object: THREE.Object3D): void {
    object.traverse((child) => {
      if (child instanceof THREE.Mesh && child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        child.material = new THREE.MeshStandardMaterial({
          color: 0xff4444,
          emissive: 0x661111,
          emissiveIntensity: 0.5,
          roughness: 0.3,
          metalness: 0.8
        });
      }
    });
  }

  private static createFallbackBomb(): THREE.Group {
    const group = new THREE.Group();
    const barrelMat = new THREE.MeshStandardMaterial({
      color: 0xff4444,
      emissive: 0xaa2222,
      emissiveIntensity: 0.6
    });
    const barrelGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.6, 16);
    const barrel = new THREE.Mesh(barrelGeo, barrelMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.castShadow = true;
    group.add(barrel);
    return group;
  }
}