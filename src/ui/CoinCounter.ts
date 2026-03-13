import coinTextureUrl from '../assets/textures/coin.png?url';

export class CoinCounter {
  private container: HTMLElement | null = null;
  private counterElement: HTMLElement | null = null;
  private iconElement: HTMLElement | null = null;
  private score: number = 0;

  constructor() {
    this.createCoinCounter();
  }

  private createCoinCounter(): void {
    const container = document.createElement('div');
    container.id = 'coin-counter-container';
    document.body.appendChild(container);

    const coinIcon = document.createElement('img');
    coinIcon.src = coinTextureUrl;
    coinIcon.alt = 'coin';
    coinIcon.id = 'coin-icon';
    coinIcon.draggable = false;
    coinIcon.onerror = () => {
      const fallbackSpan = document.createElement('span');
      fallbackSpan.innerHTML = '🪙';
      fallbackSpan.id = 'coin-icon-fallback';
      fallbackSpan.style.cssText = `font-size: inherit; line-height: 1; display: inline-block;`;
      coinIcon.replaceWith(fallbackSpan);
      this.iconElement = fallbackSpan;
    };

    const countText = document.createElement('span');
    countText.id = 'coinCount';
    countText.textContent = `x${this.score}`;

    container.appendChild(coinIcon);
    container.appendChild(countText);

    this.container = container;
    this.counterElement = countText;
    this.iconElement = coinIcon;
    this.updateStyles();
  }

  public update(score: number): void {
    this.score = score;
    if (this.counterElement) {
      this.counterElement.textContent = `x${this.score}`;
    }
  }

  public updateStyles(): void {
    if (!this.container) return;

    const width = window.innerWidth;
    let containerStyles = `position: fixed; left: 50%; transform: translateX(-50%); display: flex; align-items: center; justify-content: flex-end; background: linear-gradient(135deg, #ff6b6b, #ff8e8e); box-shadow: 0 4px 14px rgba(255, 107, 107, 0.5); z-index: 100; font-family: 'Poppins', 'Arial', sans-serif; pointer-events: none; overflow: visible; border: 2px solid rgba(255, 255, 255, 0.22); transition: all 0.3s ease;`;
    let iconStyles = `object-fit: contain; filter: drop-shadow(0 5px 10px rgba(0, 0, 0, 0.55)); z-index: 101; position: relative; transition: all 0.3s ease;`;
    let textStyles = `color: #ffd700; font-weight: bold; text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5); text-align: center; letter-spacing: 1.5px; line-height: 1; transition: all 0.3s ease;`;

    if (width >= 1920) {
      containerStyles += `top: 45px; padding: 6px 28px 6px 0; height: 44px; min-width: 160px; border-radius: 24px;`;
      iconStyles += `width: 76px; height: 76px; margin-left: -86px; margin-right: -22px; margin-top: -24px; margin-bottom: -24px; left: -28px; transform: scale(1.06);`;
      textStyles += `font-size: 30px; min-width: 80px; margin-right: 6px;`;
    } else if (width >= 1440) {
      containerStyles += `top: 25px; padding: 3px 18px 3px 0; height: 30px; min-width: 110px; border-radius: 16px;`;
      iconStyles += `width: 52px; height: 52px; margin-left: -62px; margin-right: -14px; margin-top: -16px; margin-bottom: -16px; left: -19px; transform: scale(1.02);`;
      textStyles += `font-size: 20px; min-width: 55px; margin-right: 3px;`;
    } else if (width >= 1024) {
      containerStyles += `top: 20px; padding: 3px 16px 3px 0; height: 28px; min-width: 100px; border-radius: 15px;`;
      iconStyles += `width: 48px; height: 48px; margin-left: -56px; margin-right: -12px; margin-top: -14px; margin-bottom: -14px; left: -17px; transform: scale(1.02);`;
      textStyles += `font-size: 18px; min-width: 50px; margin-right: 3px;`;
    } else if (width >= 768) {
      containerStyles += `top: 18px; padding: 2px 14px 2px 0; height: 26px; min-width: 90px; border-radius: 14px;`;
      iconStyles += `width: 44px; height: 44px; margin-left: -50px; margin-right: -10px; margin-top: -12px; margin-bottom: -12px; left: -15px; transform: scale(1.01);`;
      textStyles += `font-size: 16px; min-width: 45px; margin-right: 2px;`;
    } else if (width >= 576) {
      containerStyles += `top: 16px; padding: 2px 12px 2px 0; height: 24px; min-width: 80px; border-radius: 12px;`;
      iconStyles += `width: 40px; height: 40px; margin-left: -46px; margin-right: -8px; margin-top: -10px; margin-bottom: -10px; left: -13px; transform: scale(1);`;
      textStyles += `font-size: 15px; min-width: 40px; margin-right: 2px;`;
    } else if (width >= 425) {
      containerStyles += `top: 14px; padding: 2px 10px 2px 0; height: 22px; min-width: 70px; border-radius: 11px;`;
      iconStyles += `width: 36px; height: 36px; margin-left: -42px; margin-right: -6px; margin-top: -9px; margin-bottom: -9px; left: -11px; transform: scale(0.99);`;
      textStyles += `font-size: 14px; min-width: 35px; margin-right: 2px;`;
    } else {
      containerStyles += `top: 12px; padding: 2px 8px 2px 0; height: 20px; min-width: 60px; border-radius: 10px;`;
      iconStyles += `width: 32px; height: 32px; margin-left: -38px; margin-right: -4px; margin-top: -8px; margin-bottom: -8px; left: -9px; transform: scale(0.98);`;
      textStyles += `font-size: 13px; min-width: 30px; margin-right: 2px;`;
    }

    this.container.style.cssText = containerStyles;

    const icon = this.iconElement;
    if (icon && icon.tagName === 'IMG') {
      (icon as HTMLImageElement).style.cssText = iconStyles;
    } else if (icon && (icon as HTMLElement).id === 'coin-icon-fallback') {
      let emojiSize = width >= 1920 ? '76px' : width >= 1440 ? '52px' : width >= 1024 ? '48px' : width >= 768 ? '44px' : width >= 576 ? '40px' : width >= 425 ? '36px' : '32px';
      let emojiLeft = width >= 1920 ? '-28px' : width >= 1440 ? '-19px' : width >= 1024 ? '-17px' : width >= 768 ? '-15px' : width >= 576 ? '-13px' : width >= 425 ? '-11px' : '-9px';
      icon.style.cssText = `font-size: ${emojiSize}; filter: drop-shadow(0 5px 10px rgba(0, 0, 0, 0.55)); z-index: 101; position: relative; left: ${emojiLeft}; transition: all 0.3s ease; line-height: 1; display: inline-block;`;
    }

    if (this.counterElement) {
      this.counterElement.style.cssText = textStyles;
    }
  }

  public getScore(): number {
    return this.score;
  }

  public setScore(score: number): void {
    this.score = score;
    this.update(score);
  }

  public addScore(value: number): void {
    this.score += value;
    this.update(this.score);
  }
}