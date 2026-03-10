import * as THREE from 'three'

export type GateModifier = {
  type: '+' | '-' | 'x'
  value: number
}

export type GatePairLayout = 'plus-left' | 'minus-left'

export class Gate {
  private mesh: THREE.Group
  private leftModifier: GateModifier | null = null
  private rightModifier: GateModifier | null = null
  private position: THREE.Vector3
  private isPaired: boolean = true
  private readonly FRAME_HEIGHT = 3.8
  private readonly ROAD_HALF_WIDTH = 2.7
  private readonly PAIR_GAP = 0.3
  
  // 🔥 Флаг прохождения через ворота
  private passed: boolean = false

  constructor(
    modifier: GateModifier,
    zPosition: number,
    layout: GatePairLayout = 'plus-left',
    isPaired: boolean = true
  ) {
    this.mesh = new THREE.Group()
    this.isPaired = isPaired
    
    const yPos = this.FRAME_HEIGHT / 2
    
    if (this.isPaired) {
      this.leftModifier = layout === 'plus-left'
        ? { type: '+', value: this.generateValue('+') }
        : { type: '-', value: this.generateValue('-') }
      
      this.rightModifier = layout === 'plus-left'
        ? { type: '-', value: this.generateValue('-') }
        : { type: '+', value: this.generateValue('+') }
    } else {
      this.leftModifier = modifier
      this.rightModifier = null
    }
    
    this.position = new THREE.Vector3(0, yPos, zPosition)
    this.createPairedGate()
  }

  private generateValue(type: '+' | '-' | 'x'): number {
    switch (type) {
      case '+': return Math.floor(Math.random() * 10) + 1
      case '-': return Math.floor(Math.random() * 10) + 1
      case 'x': return Math.floor(Math.random() * 3) + 2
      default: return 1
    }
  }

  private createPairedGate(): void {
    const frameMaterial = new THREE.MeshStandardMaterial({
      color: 0x33aaff,
      emissive: 0x114477,
      emissiveIntensity: 0.7,
      roughness: 0.2,
      metalness: 0.3
    })

    if (this.isPaired) {
      const leftSectionLeftX = -this.ROAD_HALF_WIDTH
      const leftSectionRightX = -this.PAIR_GAP / 2

      const rightSectionLeftX = this.PAIR_GAP / 2
      const rightSectionRightX = this.ROAD_HALF_WIDTH

      this.createGateSection(
        leftSectionLeftX,
        leftSectionRightX,
        this.leftModifier!,
        frameMaterial,
        'left'
      )
      
      this.createGateSection(
        rightSectionLeftX,
        rightSectionRightX,
        this.rightModifier!,
        frameMaterial,
        'right'
      )
    } else {
      const leftX = -this.ROAD_HALF_WIDTH / 2
      const rightX = this.ROAD_HALF_WIDTH / 2
      this.createGateSection(leftX, rightX, this.leftModifier!, frameMaterial, 'center')
    }

    this.mesh.position.copy(this.position)
  }

  private createGateSection(
    leftX: number,
    rightX: number,
    modifier: GateModifier,
    material: THREE.Material,
    section: 'left' | 'right' | 'center'
  ): void {
    const leftFrame = this.createFrame(material)
    leftFrame.position.set(leftX, 0, 0)
    this.mesh.add(leftFrame)

    const rightFrame = this.createFrame(material)
    rightFrame.position.set(rightX, 0, 0)
    this.mesh.add(rightFrame)

    this.createSectionWall(leftX, rightX, modifier, section)
  }

  private createFrame(material: THREE.Material): THREE.Mesh {
    const geometry = new THREE.BoxGeometry(0.15, this.FRAME_HEIGHT, 0.15)
    const frame = new THREE.Mesh(geometry, material)
    frame.castShadow = true
    frame.receiveShadow = true
    return frame
  }

  private createSectionWall(
    leftX: number,
    rightX: number,
    modifier: GateModifier,
    section: 'left' | 'right' | 'center'
  ): void {
    const centerX = (leftX + rightX) / 2
    const wallWidth = Math.abs(rightX - leftX) - 0.15
    
    const wallMaterial = new THREE.MeshStandardMaterial({
      color: 0x88ccff,
      emissive: 0x224466,
      emissiveIntensity: 0.4,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
      roughness: 0.1,
      metalness: 0.1
    })

    const wallGeo = new THREE.PlaneGeometry(wallWidth, this.FRAME_HEIGHT)
    const wall = new THREE.Mesh(wallGeo, wallMaterial)
    wall.position.set(centerX, 0, 0)
    wall.rotation.y = 0
    wall.castShadow = false
    wall.receiveShadow = false
    this.mesh.add(wall)

    this.addTextToSectionWall(wall, centerX, wallWidth, modifier, section)
  }

  private addTextToSectionWall(
    wall: THREE.Mesh,
    centerX: number,
    wallWidth: number,
    modifier: GateModifier,
    section: 'left' | 'right' | 'center'
  ): void {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 256
    const ctx = canvas.getContext('2d')!
    
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    let modifierText: string
    if (modifier.type === '-') {
      modifierText = `−${modifier.value}`
    } else {
      modifierText = `${modifier.type}${modifier.value}`
    }

    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = 'Bold 140px Arial'
    ctx.strokeStyle = '#000000'
    ctx.lineWidth = 8
    ctx.strokeText(modifierText, canvas.width / 2, canvas.height / 2)
    
    ctx.shadowColor = '#33aaff'
    ctx.shadowBlur = 20
    ctx.fillStyle = '#ffffff'
    ctx.fillText(modifierText, canvas.width / 2, canvas.height / 2)
    ctx.shadowBlur = 0

    const texture = new THREE.CanvasTexture(canvas)
    texture.needsUpdate = true
    texture.flipY = true

    const textMaterial = new THREE.MeshStandardMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide,
      emissive: 0xffffff,
      emissiveIntensity: 0.6
    })

    const textWidth = wallWidth * 0.75
    const textHeight = this.FRAME_HEIGHT * 0.55
    const textGeo = new THREE.PlaneGeometry(textWidth, textHeight)
    const textMesh = new THREE.Mesh(textGeo, textMaterial)
    textMesh.rotation.y = Math.PI
    
    const zOffset = section === 'left' ? 0.12 : section === 'right' ? 0.12 : 0.1
    textMesh.position.set(centerX, 0, zOffset)
    this.mesh.add(textMesh)
  }

  // 🔥 Методы для отслеживания прохождения
  markAsPassed(): void {
    this.passed = true
  }

  isPassed(): boolean {
    return this.passed
  }

  getModifier(side: 'left' | 'right'): GateModifier | null {
    if (!this.isPaired) return this.leftModifier
    return side === 'left' ? this.leftModifier : this.rightModifier
  }

  getMesh(): THREE.Group {
    return this.mesh
  }

  getPosition(): THREE.Vector3 {
    return this.position.clone()
  }

  isPairedGate(): boolean {
    return this.isPaired
  }

  static getNextLayout(current: GatePairLayout): GatePairLayout {
    return current === 'plus-left' ? 'minus-left' : 'plus-left'
  }
}