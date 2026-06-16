import type { AppLanguage } from '../../components/planner/types';
import type { SpeechWindow } from './types';

export type VoiceCapabilities = {
  isSecureContext: boolean;
  hasMediaDevices: boolean;
  hasGetUserMedia: boolean;
  hasSpeechRecognition: boolean;
  hasSpeechSynthesis: boolean;
  hasAudioContext: boolean;
  hasWebkitSpeechRecognition: boolean;
  speechRecognitionLang: string;
  speechSynthesisLang: string;
  isIOS: boolean;
  isAndroid: boolean;
  isMobile: boolean;
  isFirefox: boolean;
  isSafariFamily: boolean;
};

const IOS_REGEX = /iPad|iPhone|iPod/;
const ANDROID_REGEX = /Android/;
const MOBILE_REGEX = /Mobile|Tablet|iPhone|iPad|iPod/;
const FIREFOX_REGEX = /Firefox/;
const SAFARI_REGEX = /Safari/;
const CHROME_REGEX = /Chrome|CriOS|Edg/;

export function detectCapabilities(language: AppLanguage): VoiceCapabilities {
  if (typeof window === 'undefined') {
    return {
      isSecureContext: false,
      hasMediaDevices: false,
      hasGetUserMedia: false,
      hasSpeechRecognition: false,
      hasSpeechSynthesis: false,
      hasAudioContext: false,
      hasWebkitSpeechRecognition: false,
      speechRecognitionLang: language === 'en' ? 'en-US' : 'ms-MY',
      speechSynthesisLang: language === 'en' ? 'en-US' : 'ms-MY',
      isIOS: false,
      isAndroid: false,
      isMobile: false,
      isFirefox: false,
      isSafariFamily: false
    };
  }

  const win = window as SpeechWindow;
  const ua = navigator.userAgent;
  const isIOS =
    IOS_REGEX.test(ua) || (ua.includes('Mac') && 'ontouchend' in document && navigator.maxTouchPoints > 1);
  const isAndroid = ANDROID_REGEX.test(ua);
  const isMobile = MOBILE_REGEX.test(ua) || isIOS || isAndroid;
  const isFirefox = FIREFOX_REGEX.test(ua);
  const isSafariFamily = SAFARI_REGEX.test(ua) && !CHROME_REGEX.test(ua);

  const hasWebkitSpeechRecognition = Boolean(win.webkitSpeechRecognition);
  const hasSpeechRecognition = Boolean(win.SpeechRecognition) || hasWebkitSpeechRecognition;
  const hasSpeechSynthesis = 'speechSynthesis' in window;
  const hasAudioContext = Boolean(win.AudioContext || win.webkitAudioContext);
  const hasMediaDevices = Boolean(navigator.mediaDevices);
  const hasGetUserMedia = hasMediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function';

  return {
    isSecureContext: Boolean(window.isSecureContext),
    hasMediaDevices,
    hasGetUserMedia,
    hasSpeechRecognition,
    hasSpeechSynthesis,
    hasAudioContext,
    hasWebkitSpeechRecognition,
    speechRecognitionLang: language === 'en' ? 'en-US' : 'ms-MY',
    speechSynthesisLang: language === 'en' ? 'en-US' : 'ms-MY',
    isIOS,
    isAndroid,
    isMobile,
    isFirefox,
    isSafariFamily
  };
}

export type VoiceSupportLevel = 'full' | 'text-only-tts' | 'push-to-talk-only' | 'unavailable';

export function classifySupport(capabilities: VoiceCapabilities): VoiceSupportLevel {
  if (!capabilities.isSecureContext) return 'unavailable';
  if (!capabilities.hasSpeechSynthesis) return 'unavailable';
  if (!capabilities.hasSpeechRecognition) return 'push-to-talk-only';
  if (capabilities.isIOS && !capabilities.hasWebkitSpeechRecognition) return 'push-to-talk-only';
  if (capabilities.isFirefox) return 'push-to-talk-only';
  return 'full';
}
