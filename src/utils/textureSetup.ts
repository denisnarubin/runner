
import * as THREE from 'three';

export function setupTexture(
  texture: THREE.Texture, 
  isColor: boolean
): void {
  texture.colorSpace = isColor ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.anisotropy = 16;
  texture.flipY = true;
  texture.needsUpdate = true;
}

export function disposeMaterial(material: THREE.Material | THREE.Material[]): void {
  if (Array.isArray(material)) {
    material.forEach(m => m?.dispose());
  } else {
    material?.dispose();
  }
}

export function disposeGeometry(geometry: THREE.BufferGeometry): void {
  geometry?.dispose();
}

export function disposeObject(obj: THREE.Object3D): void {
  if (obj instanceof THREE.Mesh) {
    disposeGeometry(obj.geometry);
    disposeMaterial(obj.material);
  } else if (obj instanceof THREE.Group) {
    obj.traverse(child => {
      if (child instanceof THREE.Mesh) {
        disposeGeometry(child.geometry);
        disposeMaterial(child.material);
      }
    });
  }
}