import handTextureUrl from '../assets/textures/hand.png?url';

export class SwipeHandHint {
  private swipeHandContainer: HTMLElement | null = null;
  private swipeHandElement: HTMLImageElement | null = null;
  private swipeHintContainer: HTMLElement | null = null;
  private topHintElement: HTMLElement | null = null;
  private swipeTextElement: HTMLElement | null = null;
  private lastMoveTime: number = 0;
  private readonly HAND_SHOW_DELAY = 2000;
  private handAnimationId: number | null = null;
  private handPosition = 0;
  private isTutorialVisible = false;
  private isGameOver = false;
  private isFinished = false;


  constructor() {
    this.createSwipeHandHint();
  }

  private createSwipeHandHint(): void {
    const container = document.createElement('div');
    container.id = 'swipe-hand-container';
    container.style.cssText = `
      position: fixed;
      bottom: 100px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 999;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.5s ease;
    `;
    document.body.appendChild(container);
    this.swipeHandContainer = container;

    const handImg = document.createElement('img');
    handImg.src = handTextureUrl;
    handImg.alt = 'swipe hand';
    handImg.draggable = false;
    handImg.style.cssText = `
      width: 100%;
      height: 100%;
      object-fit: contain;
      filter: drop-shadow(0 8px 20px rgba(0, 0, 0, 0.4));
    `;
    container.appendChild(handImg);
    this.swipeHandElement = handImg;

    const hintContainer = document.createElement('div');
    hintContainer.id = 'swipe-hint-container';
    hintContainer.style.cssText = `
      position: fixed;
      left: 50%;
      transform: translateX(-50%);
      z-index: 998;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.5s ease;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      width: 90vw;
      max-width: 800px;
    `;
    document.body.appendChild(hintContainer);
    this.swipeHintContainer = hintContainer;

    const topHint = document.createElement('div');
    topHint.style.cssText = `
      font-family: 'Arial', sans-serif;
      font-weight: 700;
      text-align: center;
      text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.6), 0 0 15px rgba(0, 0, 0, 0.4);
      letter-spacing: 2px;
      padding: 4px 8px;
      white-space: normal;
      display: flex;
      gap: 8px;
      align-items: center;
      justify-content: center;
      flex-wrap: wrap;
      line-height: 1.2;
    `;

    const collectCoins = document.createElement('span');
    collectCoins.textContent = 'COLLECT COINS';
    collectCoins.style.cssText = `
      color: #ffd700;
      font-weight: 900;
      text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.6), 0 0 15px rgba(255, 215, 0, 0.5);
    `;

    const and = document.createElement('span');
    and.textContent = 'AND';
    and.style.cssText = `
      color: #ffffff;
      text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.6);
    `;

    const avoidBombs = document.createElement('span');
    avoidBombs.textContent = 'AVOID THE BOMBS';
    avoidBombs.style.cssText = `
      color: #e74c3c;
      font-weight: 900;
      text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.6), 0 0 15px rgba(231, 76, 60, 0.4);
    `;

    topHint.appendChild(collectCoins);
    topHint.appendChild(and);
    topHint.appendChild(avoidBombs);
    hintContainer.appendChild(topHint);
    this.topHintElement = topHint;

    const swipeHint = document.createElement('div');
    swipeHint.textContent = 'SWIPE';
    swipeHint.style.cssText = `
      font-family: 'Arial', sans-serif;
      font-weight: 900;
      color: #d35400;
      text-align: center;
      text-shadow: 0 3px 6px rgba(0, 0, 0, 0.4);
      letter-spacing: 3px;
      padding: 8px 80px;
      background: linear-gradient(90deg, rgba(241, 196, 15, 0) 0%, rgba(241, 196, 15, 0.6) 20%, rgba(243, 156, 18, 0.8) 50%, rgba(241, 196, 15, 0.6) 80%, rgba(241, 196, 15, 0) 100%);
      border-radius: 30px;
      border: none;
      box-shadow: none;
      white-space: nowrap;
      max-width: 100%;
    `;
    hintContainer.appendChild(swipeHint);
    this.swipeTextElement = swipeHint;

    this.updateSwipeHandStyles();
  }

  public updateSwipeHandStyles(): void {
    if (!this.swipeHandContainer || !this.swipeHandElement) return;

    const width = window.innerWidth;
    const height = window.innerHeight;
    const baseScale = Math.min(1.5, Math.max(0.5, width / 1024));
    let containerSize: number;
    let bottomOffset: number;
    let moveDistance: number;
    let hintBottomOffset: number;

    if (width >= 1920) { containerSize = 140; bottomOffset = 120; moveDistance = 100; hintBottomOffset = 280; }
    else if (width >= 1440) { containerSize = 120; bottomOffset = 100; moveDistance = 90; hintBottomOffset = 240; }
    else if (width >= 1024) { containerSize = 110; bottomOffset = 100; moveDistance = 80; hintBottomOffset = 230; }
    else if (width >= 768) { containerSize = 100; bottomOffset = 100; moveDistance = 70; hintBottomOffset = 220; }
    else if (width >= 576) { containerSize = 90; bottomOffset = 90; moveDistance = 60; hintBottomOffset = 200; }
    else if (width >= 425) { containerSize = 80; bottomOffset = 80; moveDistance = 50; hintBottomOffset = 180; }
    else { containerSize = 70; bottomOffset = 70; moveDistance = 40; hintBottomOffset = 160; }

    if (height < 500 && width > height) {
      containerSize = Math.min(containerSize, 70);
      bottomOffset = 50;
      moveDistance = Math.min(moveDistance, 40);
      hintBottomOffset = 140;
    }

    this.swipeHandContainer.style.cssText = `
      position: fixed;
      bottom: ${bottomOffset}px;
      left: 50%;
      transform: translateX(calc(-50% - ${this.handPosition}px));
      width: ${containerSize}px;
      height: ${containerSize}px;
      z-index: 999;
      pointer-events: none;
      opacity: ${(this.swipeHandContainer as HTMLElement).style.opacity || '0'};
      transition: opacity 0.5s ease, transform 0.1s linear;
    `;

    this.swipeHandElement.style.cssText = `
      width: 100%;
      height: 100%;
      object-fit: contain;
      filter: drop-shadow(0 8px 20px rgba(0, 0, 0, 0.4));
    `;

    if (this.swipeHintContainer) {
      this.swipeHintContainer.style.cssText = `
        position: fixed;
        bottom: ${hintBottomOffset}px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 998;
        pointer-events: none;
        opacity: ${(this.swipeHintContainer as HTMLElement).style.opacity || '0'};
        transition: opacity 0.5s ease;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: ${Math.max(8, 12 * baseScale)}px;
        width: 90vw;
        max-width: 800px;
      `;
    }

    if (this.topHintElement) {
      const topFontSize = Math.max(14, Math.min(40, 28 * baseScale));
      const topLetterSpacing = Math.max(1, 2 * baseScale);
      const isSmallScreen = width < 576;
      this.topHintElement.style.cssText = `
        font-family: 'Arial', sans-serif;
        font-size: ${topFontSize}px;
        font-weight: 700;
        text-align: center;
        text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.6), 0 0 15px rgba(0, 0, 0, 0.4);
        letter-spacing: ${topLetterSpacing}px;
        padding: ${4 * baseScale}px ${8 * baseScale}px;
        white-space: ${isSmallScreen ? 'normal' : 'nowrap'};
        display: flex;
        gap: ${8 * baseScale}px;
        align-items: center;
        justify-content: center;
        flex-wrap: ${isSmallScreen ? 'wrap' : 'nowrap'};
        line-height: 1.2;
        width: 100%;
      `;
      const spans = this.topHintElement.querySelectorAll('span');
      spans.forEach(span => {
        (span as HTMLElement).style.fontSize = `${topFontSize}px`;
        (span as HTMLElement).style.lineHeight = '1.2';
      });
    }

    if (this.swipeTextElement) {
      const swipeFontSize = Math.max(20, Math.min(48, 32 * baseScale));
      const swipePaddingX = Math.max(40, 80 * baseScale);
      const swipeBorderRadius = Math.max(20, 30 * baseScale);
      const isSmallScreen = width < 576;
      this.swipeTextElement.style.cssText = `
        font-family: 'Arial', sans-serif;
        font-size: ${swipeFontSize}px;
        font-weight: 900;
        color: #d35400;
        text-align: center;
        text-shadow: 0 3px 6px rgba(0, 0, 0, 0.4);
        letter-spacing: ${3 * baseScale}px;
        padding: ${8 * baseScale}px ${swipePaddingX}px;
        background: linear-gradient(90deg, rgba(241, 196, 15, 0) 0%, rgba(241, 196, 15, 0.6) 20%, rgba(243, 156, 18, 0.8) 50%, rgba(241, 196, 15, 0.6) 80%, rgba(241, 196, 15, 0) 100%);
        border-radius: ${swipeBorderRadius}px;
        border: none;
        box-shadow: none;
        white-space: ${isSmallScreen ? 'normal' : 'nowrap'};
        max-width: 100%;
        line-height: 1.2;
      `;
    }

    (this.swipeHandContainer as HTMLElement & { moveDistance?: number }).moveDistance = moveDistance;
  }

  public show(): void {
    if (this.swipeHandContainer && !this.isTutorialVisible && !this.isGameOver && !this.isFinished) {
      (this.swipeHandContainer as HTMLElement).style.opacity = '1';
      if (this.swipeHintContainer) {
        (this.swipeHintContainer as HTMLElement).style.opacity = '1';
      }
      this.startHandAnimation();
    }
  }

  public hide(): void {
    if (this.swipeHandContainer) {
      (this.swipeHandContainer as HTMLElement).style.opacity = '0';
    }
    if (this.swipeHintContainer) {
      (this.swipeHintContainer as HTMLElement).style.opacity = '0';
    }
    this.stopHandAnimation();
  }

  private startHandAnimation(): void {
    if (this.handAnimationId !== null) return;
    let startTime: number | null = null;
    const duration = 2000;
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = (elapsed % duration) / duration;
      const moveDistance = (this.swipeHandContainer as HTMLElement & { moveDistance?: number })?.moveDistance || 80;
      this.handPosition = Math.sin(progress * Math.PI) * moveDistance;
      if (this.swipeHandContainer) {
        this.swipeHandContainer.style.transform = `translateX(calc(-50% - ${this.handPosition}px))`;
      }
      if (!this.isTutorialVisible && !this.isGameOver && !this.isFinished) {
        this.handAnimationId = requestAnimationFrame(animate);
      } else {
        this.handAnimationId = null;
      }
    };
    this.handAnimationId = requestAnimationFrame(animate);
  }

  private stopHandAnimation(): void {
    if (this.handAnimationId !== null) {
      cancelAnimationFrame(this.handAnimationId);
      this.handAnimationId = null;
    }
    this.handPosition = 0;
    if (this.swipeHandContainer) {
      this.swipeHandContainer.style.transform = 'translateX(-50%)';
    }
  }

  public updateVisibility(isMoving: boolean): void {

    if (!this.isTutorialVisible && !this.isGameOver && !this.isFinished) {
      if (isMoving) {
        this.lastMoveTime = Date.now();
        this.hide();
      } else {
        const timeSinceLastMove = Date.now() - this.lastMoveTime;
        if (timeSinceLastMove > this.HAND_SHOW_DELAY) {
          this.show();
        }
      }
    } else {
      this.hide();
    }
  }

  public setTutorialVisible(visible: boolean): void {
    this.isTutorialVisible = visible;
    if (visible) {
      this.hide();
    }
  }

  public setGameOver(gameOver: boolean): void {
    this.isGameOver = gameOver;
    if (gameOver) {
      this.hide();
    }
  }

  public setFinished(finished: boolean): void {
    this.isFinished = finished;
    if (finished) {
      this.hide();
    }
  }

  public resetMoveTimer(): void {
    this.lastMoveTime = Date.now();
  }
}