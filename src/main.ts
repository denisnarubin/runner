
import { Game } from './core/Game.js'

class App {
  private game: Game | null = null
  
  constructor() {
    this.init()
  }
  
  private init(): void {
    const canvas = document.createElement('canvas')
    canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;'
    document.body.appendChild(canvas)
    document.body.style.margin = '0'
    document.body.style.overflow = 'hidden'
    
    this.game = new Game(canvas)
    this.game.start()
    

  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new App())
} else {
  new App()
}