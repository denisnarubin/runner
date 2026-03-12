// 🔥 Сервис для ленивой загрузки ЗВУКОВ с кэшированием

export class AssetLoader {
    private static cache = new Map<string, HTMLAudioElement>()
    private static loading = new Map<string, Promise<HTMLAudioElement>>()
  
    static async loadSound(name: string, getUrl: () => Promise<string>): Promise<HTMLAudioElement> {
      if (this.cache.has(name)) return this.cache.get(name)!
      
      if (this.loading.has(name)) return this.loading.get(name)!
      
      const loadPromise = (async () => {
        const url = await getUrl()
        const audio = new Audio(url)
        audio.preload = 'auto'
        await new Promise((resolve) => {
          audio.oncanplaythrough = resolve
          audio.load()
        })
        return audio
      })()
      
      this.loading.set(name, loadPromise)
      const result = await loadPromise
      this.cache.set(name, result)
      this.loading.delete(name)
      return result
    }
  
    static clearCache(): void {
      this.cache.clear()
      this.loading.clear()
    }
  }