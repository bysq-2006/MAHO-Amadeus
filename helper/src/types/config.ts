export type TabKey = "llm" | "tts" | "translator" | "asr" | "characters" | "raw";

export interface ConfigFile {
  path: string;
  content: string;
}

export interface Position {
  x: number;
  y: number;
}

export interface CharacterConfig {
  name: string;
  displayName: string;
  modelPath: string;
  scale: number;
  position: Position;
  systemPrompt: string;
  tts: {
    characterName: string;
    onnxModelDir: string;
    referenceAudioPath: string;
    referenceAudioText: string;
  };
}

export interface ConfigForm {
  llmSelect: string;
  ollamaModel: string;
  ollamaBaseUrl: string;
  openaiApiKey: string;
  openaiBaseUrl: string;
  openaiModel: string;
  openaiTimeout: number;
  ttsSelect: string;
  ttsUseResourceLock: boolean;
  genieOnnxModelDir: string;
  genieDataDir: string;
  genieLanguage: string;
  genieAutoLoad: boolean;
  translatorSelect: string;
  baiduAppid: string;
  baiduAppkey: string;
  argosToLang: string;
  ollamaTranslatorModel: string;
  ollamaTranslatorBaseUrl: string;
  openaiTranslatorApiKey: string;
  openaiTranslatorBaseUrl: string;
  openaiTranslatorModel: string;
  asrSelect: string;
  xfyunAppId: string;
  xfyunApiKey: string;
  xfyunApiSecret: string;
  characters: CharacterConfig[];
}

export interface NavItem {
  key: TabKey;
  label: string;
  hint: string;
  icon: string;
}
