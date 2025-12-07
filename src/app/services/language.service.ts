import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class LanguageService {
  private readonly STORAGE_KEY = 'acm-language';
  private readonly SUPPORTED_LANGUAGES = ['en', 'fr', 'mg'];
  private readonly DEFAULT_LANGUAGE = 'en';

  /**
   * Get the current language, checking localStorage first, then browser language
   */
  getCurrentLanguage(): string {
    // Check localStorage first
    const savedLanguage = localStorage.getItem(this.STORAGE_KEY);
    if (savedLanguage && this.SUPPORTED_LANGUAGES.includes(savedLanguage)) {
      return savedLanguage;
    }

    // Detect browser language
    const browserLang = this.detectBrowserLanguage();
    return browserLang;
  }

  /**
   * Detect browser language and map to supported languages
   */
  private detectBrowserLanguage(): string {
    if (typeof navigator === 'undefined') {
      return this.DEFAULT_LANGUAGE;
    }

    // Try navigator.language first
    const navigatorWithUserLanguage = navigator as Navigator & { userLanguage?: string };
    const browserLang = navigator.language || navigatorWithUserLanguage.userLanguage;
    if (browserLang) {
      const langCode = browserLang.split('-')[0].toLowerCase();
      if (this.SUPPORTED_LANGUAGES.includes(langCode)) {
        return langCode;
      }
    }

    // Try navigator.languages array
    if (navigator.languages && navigator.languages.length > 0) {
      for (const lang of navigator.languages) {
        const langCode = lang.split('-')[0].toLowerCase();
        if (this.SUPPORTED_LANGUAGES.includes(langCode)) {
          return langCode;
        }
      }
    }

    return this.DEFAULT_LANGUAGE;
  }

  /**
   * Set the current language and save to localStorage
   */
  setLanguage(language: string): void {
    if (this.SUPPORTED_LANGUAGES.includes(language)) {
      localStorage.setItem(this.STORAGE_KEY, language);
    }
  }

  /**
   * Get all supported languages
   */
  getSupportedLanguages(): string[] {
    return [...this.SUPPORTED_LANGUAGES];
  }
}
