
import { ref } from 'vue';

export class ThemeService {
  private static instance: ThemeService;
  private currentTheme = ref('light');
  private themes = ['light', 'highContrast'];

  private constructor() {
    // Intenta recuperar el tema del almacenamiento local
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme && this.themes.includes(savedTheme)) {
      this.currentTheme.value = savedTheme;
    }
  }

  static getInstance(): ThemeService {
    if (!ThemeService.instance) {
      ThemeService.instance = new ThemeService();
    }
    return ThemeService.instance;
  }

  getTheme(): string {
    return this.currentTheme.value;
  }

  setTheme(theme: string): void {
    if (!this.themes.includes(theme)) {
      theme = 'light'; // Valor predeterminado si se proporciona un tema no válido
    }
    
    this.currentTheme.value = theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }

  toggleHighContrast(): void {
    const newTheme = this.currentTheme.value === 'highContrast' ? 'light' : 'highContrast';
    this.setTheme(newTheme);
  }

  initTheme(): void {
    this.setTheme(this.currentTheme.value);
  }
}

export const themeService = ThemeService.getInstance();
