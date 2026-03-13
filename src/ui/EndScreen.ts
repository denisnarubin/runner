import coinTextureUrl from '../assets/textures/coin.png?url';

export class EndScreen {
  private score: number = 0;

  constructor(score: number) {
    this.score = score;
  }

  public show(isWin: boolean): void {
    if (!document.querySelector('link[href*="fonts.googleapis.com"]')) {
      const fontLink = document.createElement('link');
      fontLink.rel = 'stylesheet';
      fontLink.href = 'https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Poppins:wght@400;600;700&family=Bangers&family=Creepster&display=swap';
      document.head.appendChild(fontLink);
    }

    const width = window.innerWidth;
    const height = window.innerHeight;
    const isLandscape = width > height && height < 500;

    let mainFontSize: string, mainLetterSpacing: string, mainMargin: string;
    let subFontSize: string, subLetterSpacing: string, subMargin: string;
    let coinIconSize: string, coinFontSize: string, coinPadding: string, coinGap: string;
    let downloadPadding: string, downloadFontSize: string, downloadLetterSpacing: string;
    let retryPadding: string, retryFontSize: string, retryLetterSpacing: string;
    let topMargin: string, bottomMargin: string, overlayPadding: string;

    const mainColor = '#9b59b6';
    const subColor = isWin ? '#2ed573' : '#e67e22';
    const mainText = isWin ? 'LEVEL COMPLETE!' : 'UNLUCKY';
    const subText = isWin ? '' : 'TRY AGAIN?';

    if (width >= 1920) {
      mainFontSize = '96px'; mainLetterSpacing = '8px'; mainMargin = '0 0 15px 0';
      subFontSize = '72px'; subLetterSpacing = '6px'; subMargin = '0';
      coinIconSize = '60px'; coinFontSize = '48px'; coinPadding = '20px 40px'; coinGap = '15px';
      downloadPadding = '22px 60px'; downloadFontSize = '26px'; downloadLetterSpacing = '3px';
      retryPadding = '18px 50px'; retryFontSize = '22px'; retryLetterSpacing = '2px';
      topMargin = '40px'; bottomMargin = '40px'; overlayPadding = '60px 20px';
    } else if (width >= 1440) {
      mainFontSize = '80px'; mainLetterSpacing = '7px'; mainMargin = '0 0 12px 0';
      subFontSize = '60px'; subLetterSpacing = '5px'; subMargin = '0';
      coinIconSize = '50px'; coinFontSize = '40px'; coinPadding = '18px 35px'; coinGap = '12px';
      downloadPadding = '20px 50px'; downloadFontSize = '24px'; downloadLetterSpacing = '3px';
      retryPadding = '16px 45px'; retryFontSize = '20px'; retryLetterSpacing = '2px';
      topMargin = '35px'; bottomMargin = '35px'; overlayPadding = '50px 20px';
    } else if (width >= 1024) {
      mainFontSize = '72px'; mainLetterSpacing = '6px'; mainMargin = '0 0 10px 0';
      subFontSize = '54px'; subLetterSpacing = '5px'; subMargin = '0';
      coinIconSize = '48px'; coinFontSize = '38px'; coinPadding = '16px 32px'; coinGap = '12px';
      downloadPadding = '18px 48px'; downloadFontSize = '22px'; downloadLetterSpacing = '2px';
      retryPadding = '15px 42px'; retryFontSize = '19px'; retryLetterSpacing = '2px';
      topMargin = '30px'; bottomMargin = '30px'; overlayPadding = '45px 20px';
    } else if (width >= 768) {
      mainFontSize = '64px'; mainLetterSpacing = '5px'; mainMargin = '0 0 10px 0';
      subFontSize = '48px'; subLetterSpacing = '4px'; subMargin = '0';
      coinIconSize = '44px'; coinFontSize = '34px'; coinPadding = '14px 28px'; coinGap = '10px';
      downloadPadding = '16px 42px'; downloadFontSize = '20px'; downloadLetterSpacing = '2px';
      retryPadding = '14px 38px'; retryFontSize = '18px'; retryLetterSpacing = '2px';
      topMargin = '28px'; bottomMargin = '28px'; overlayPadding = '40px 20px';
    } else if (width >= 576) {
      mainFontSize = '56px'; mainLetterSpacing = '5px'; mainMargin = '0 0 8px 0';
      subFontSize = '42px'; subLetterSpacing = '4px'; subMargin = '0';
      coinIconSize = '40px'; coinFontSize = '30px'; coinPadding = '12px 24px'; coinGap = '10px';
      downloadPadding = '14px 38px'; downloadFontSize = '18px'; downloadLetterSpacing = '2px';
      retryPadding = '12px 34px'; retryFontSize = '16px'; retryLetterSpacing = '1px';
      topMargin = '24px'; bottomMargin = '24px'; overlayPadding = '35px 15px';
    } else if (width >= 472) {
      mainFontSize = '44px'; mainLetterSpacing = '3px'; mainMargin = '0 0 8px 0';
      subFontSize = '32px'; subLetterSpacing = '2px'; subMargin = '0';
      coinIconSize = '34px'; coinFontSize = '24px'; coinPadding = '10px 18px'; coinGap = '8px';
      downloadPadding = '12px 30px'; downloadFontSize = '15px'; downloadLetterSpacing = '1px';
      retryPadding = '10px 26px'; retryFontSize = '13px'; retryLetterSpacing = '1px';
      topMargin = '20px'; bottomMargin = '20px'; overlayPadding = '30px 12px';
    } else if (width >= 425) {
      mainFontSize = '38px'; mainLetterSpacing = '2px'; mainMargin = '0 0 6px 0';
      subFontSize = '28px'; subLetterSpacing = '2px'; subMargin = '0';
      coinIconSize = '30px'; coinFontSize = '20px'; coinPadding = '8px 16px'; coinGap = '8px';
      downloadPadding = '10px 26px'; downloadFontSize = '14px'; downloadLetterSpacing = '1px';
      retryPadding = '8px 22px'; retryFontSize = '12px'; retryLetterSpacing = '1px';
      topMargin = '16px'; bottomMargin = '16px'; overlayPadding = '25px 10px';
    } else {
      mainFontSize = '32px'; mainLetterSpacing = '2px'; mainMargin = '0 0 5px 0';
      subFontSize = '24px'; subLetterSpacing = '1px'; subMargin = '0';
      coinIconSize = '28px'; coinFontSize = '18px'; coinPadding = '8px 14px'; coinGap = '6px';
      downloadPadding = '10px 22px'; downloadFontSize = '13px'; downloadLetterSpacing = '1px';
      retryPadding = '8px 20px'; retryFontSize = '11px'; retryLetterSpacing = '1px';
      topMargin = '14px'; bottomMargin = '14px'; overlayPadding = '20px 10px';
    }

    if (isLandscape) {
      mainFontSize = width >= 768 ? mainFontSize : '28px';
      subFontSize = width >= 768 ? subFontSize : '22px';
      coinIconSize = width >= 768 ? coinIconSize : '26px';
      coinFontSize = width >= 768 ? coinFontSize : '16px';
      downloadPadding = width >= 768 ? downloadPadding : '8px 18px';
      downloadFontSize = width >= 768 ? downloadFontSize : '12px';
      retryPadding = width >= 768 ? retryPadding : '6px 16px';
      retryFontSize = width >= 768 ? retryFontSize : '10px';
      overlayPadding = '18px 8px';
      topMargin = '12px';
      bottomMargin = '12px';
    }

    const overlay = document.createElement('div');
    overlay.id = 'game-over-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.75);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: space-between;
      padding: ${overlayPadding};
      box-sizing: border-box;
      z-index: 2000;
      pointer-events: auto;
      overflow: auto;
    `;

    const topSection = document.createElement('div');
    topSection.style.cssText = `
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      margin-top: ${topMargin};
      width: 100%;
    `;

    const mainTextElement = document.createElement('h1');
    mainTextElement.textContent = mainText;
    mainTextElement.style.cssText = `
      font-size: ${mainFontSize};
      font-weight: 900;
      color: ${mainColor};
      margin: ${mainMargin};
      font-family: 'Bangers', cursive;
      letter-spacing: ${mainLetterSpacing};
      text-transform: uppercase;
      line-height: 1.1;
      width: 100%;
      text-align: center;
      text-shadow:
        -2px -2px 0 #ffffff,
        2px -2px 0 #ffffff,
        -2px 2px 0 #ffffff,
        2px 2px 0 #ffffff;
      word-wrap: break-word;
    `;
    topSection.appendChild(mainTextElement);

    if (subText) {
      const subTextElement = document.createElement('h2');
      subTextElement.textContent = subText;
      subTextElement.style.cssText = `
        font-size: ${subFontSize};
        font-weight: 800;
        color: ${subColor};
        margin: ${subMargin};
        font-family: 'Creepster', cursive;
        letter-spacing: ${subLetterSpacing};
        text-transform: uppercase;
        line-height: 1.1;
        width: 100%;
        text-align: center;
        text-shadow:
          -2px -2px 0 #ffffff,
          2px -2px 0 #ffffff,
          -2px 2px 0 #ffffff,
          2px 2px 0 #ffffff;
        word-wrap: break-word;
      `;
      topSection.appendChild(subTextElement);
    }

    const middleSection = document.createElement('div');
    middleSection.style.cssText = `
      display: flex;
      flex-direction: row;
      align-items: center;
      justify-content: center;
      gap: ${coinGap};
      margin: 30px 0;
      padding: ${coinPadding};
      background: rgba(255, 255, 255, 0.1);
      border-radius: 20px;
      border: 2px solid rgba(255, 255, 255, 0.3);
    `;

    const coinIcon = document.createElement('img');
    coinIcon.src = coinTextureUrl;
    coinIcon.alt = 'coin';
    coinIcon.draggable = false;
    coinIcon.style.cssText = `
      width: ${coinIconSize};
      height: ${coinIconSize};
      object-fit: contain;
      filter: drop-shadow(0 4px 12px rgba(255, 215, 0, 0.6));
    `;

    const coinCount = document.createElement('span');
    coinCount.textContent = `${this.score}`;  
    coinCount.style.cssText = `
      font-size: ${coinFontSize};
      font-weight: 700;
      color: #ffd700;
      font-family: 'Poppins', sans-serif;
      text-shadow: 2px 2px 8px rgba(0, 0, 0, 0.6);
    `;

    middleSection.appendChild(coinIcon);
    middleSection.appendChild(coinCount);

    const bottomSection = document.createElement('div');
    bottomSection.style.cssText = `
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      margin-bottom: ${bottomMargin};
      gap: 20px;
      width: 100%;
    `;

    const downloadBtn = document.createElement('button');
    downloadBtn.id = 'download-btn';
    downloadBtn.textContent = 'DOWNLOAD';
    downloadBtn.style.cssText = `
      padding: ${downloadPadding};
      font-size: ${downloadFontSize};
      font-weight: 700;
      background: linear-gradient(135deg, #7bed9f, #2ed573);
      border: 3px solid #ffffff;
      border-radius: 50px;
      color: white;
      cursor: pointer;
      box-shadow: 0 8px 25px rgba(46, 213, 115, 0.5);
      transition: all 0.3s ease;
      font-family: 'Poppins', sans-serif;
      letter-spacing: ${downloadLetterSpacing};
      text-transform: uppercase;
      white-space: nowrap;
      max-width: 100%;
    `;

    const tryAgainBtn = document.createElement('button');
    tryAgainBtn.id = 'retry-btn';
    tryAgainBtn.textContent = isWin ? 'PLAY AGAIN' : 'TRY AGAIN';
    tryAgainBtn.style.cssText = `
      padding: ${retryPadding};
      font-size: ${retryFontSize};
      font-weight: 700;
      background: transparent;
      border: 3px solid rgba(255, 255, 255, 0.5);
      border-radius: 30px;
      color: #ffffff;
      cursor: pointer;
      transition: all 0.3s ease;
      font-family: 'Poppins', sans-serif;
      letter-spacing: ${retryLetterSpacing};
      text-transform: uppercase;
      text-shadow: 2px 2px 6px rgba(0, 0, 0, 0.6);
      white-space: nowrap;
      max-width: 100%;
    `;

    downloadBtn.addEventListener('mouseenter', () => {
      downloadBtn.style.transform = 'scale(1.08)';
      downloadBtn.style.boxShadow = '0 12px 35px rgba(46, 213, 115, 0.7)';
    });
    downloadBtn.addEventListener('mouseleave', () => {
      downloadBtn.style.transform = 'scale(1)';
      downloadBtn.style.boxShadow = '0 8px 25px rgba(46, 213, 115, 0.5)';
    });

    tryAgainBtn.addEventListener('mouseenter', () => {
      tryAgainBtn.style.transform = 'scale(1.08)';
      tryAgainBtn.style.color = '#ffd700';
      tryAgainBtn.style.borderColor = '#ffd700';
    });
    tryAgainBtn.addEventListener('mouseleave', () => {
      tryAgainBtn.style.transform = 'scale(1)';
      tryAgainBtn.style.color = '#ffffff';
      tryAgainBtn.style.borderColor = 'rgba(255, 255, 255, 0.5)';
    });

    bottomSection.appendChild(downloadBtn);
    bottomSection.appendChild(tryAgainBtn);

    overlay.appendChild(topSection);
    overlay.appendChild(middleSection);
    overlay.appendChild(bottomSection);
    document.body.appendChild(overlay);

    document.getElementById('download-btn')?.addEventListener('click', () => {
      window.open('https://example.com/download', '_blank');
    });

    document.getElementById('retry-btn')?.addEventListener('click', () => {
      location.reload();
    });

    overlay.addEventListener('touchstart', (e) => { e.stopPropagation(); });
    overlay.addEventListener('mousedown', (e) => { e.stopPropagation(); });
  }

  public setScore(score: number): void {
    this.score = score;
  }
}