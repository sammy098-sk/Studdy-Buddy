import { PlaceholderProvider } from './PlaceholderProvider';
import { AnthropicProvider } from './AnthropicProvider';
import { OpenAIProvider } from './OpenAIProvider';
import { GeminiProvider } from './GeminiProvider';
import { OpenRouterProvider } from './OpenRouterProvider';

/**
 * AI Provider Registry & Factory.
 * Centralizes switching between OpenRouter, Claude, GPT-4, Gemini, and offline placeholder simulation.
 */
const PROVIDERS = {
  placeholder: new PlaceholderProvider(),
  anthropic: new AnthropicProvider(),
  openai: new OpenAIProvider(),
  gemini: new GeminiProvider(),
  openrouter: new OpenRouterProvider(),
};

// PHASE 2 ACTIVE: OpenRouter is the live AI provider utilizing 'openrouter/free' by default.
// To switch providers, call AIProviderFactory.setProvider('openrouter' | 'gemini' | 'anthropic' | 'openai' | 'placeholder').
let activeProviderKey = 'openrouter';

export const AIProviderFactory = {
  /**
   * Get the currently active AI provider instance.
   * @returns {import('./AIProvider').AIProvider}
   */
  getProvider: () => {
    return PROVIDERS[activeProviderKey] || PROVIDERS.placeholder;
  },

  /**
   * Set the active provider by name ('placeholder' | 'anthropic' | 'openai' | 'gemini').
   * @param {string} key 
   */
  setProvider: (key) => {
    if (PROVIDERS[key]) {
      activeProviderKey = key;
      console.log(`[AIProviderFactory] Switched active AI provider to: ${PROVIDERS[key].name}`);
    } else {
      console.warn(`[AIProviderFactory] Unknown provider key: "${key}". Falling back to ${activeProviderKey}.`);
    }
  },

  /**
   * Get list of available providers for settings selection UI.
   */
  listProviders: () => Object.keys(PROVIDERS).map((k) => ({ key: k, name: PROVIDERS[k].name })),

  /**
   * Check if running in Phase 1 placeholder/offline mode.
   */
  isPlaceholderMode: () => activeProviderKey === 'placeholder'
};

export const getAIProvider = () => AIProviderFactory.getProvider();
