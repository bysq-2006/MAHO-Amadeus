import type { ConfigForm, Position } from "../types/config";

export function createDefaultForm(): ConfigForm {
  return {
    llmSelect: "ollama_api",
    llmSystemPrompt: "",
    ollamaModel: "",
    ollamaBaseUrl: "",
    openaiApiKey: "",
    openaiBaseUrl: "",
    openaiModel: "",
    openaiTimeout: 60,
    ttsSelect: "genie_tts_service",
    ttsUseResourceLock: true,
    genieOnnxModelDir: "",
    genieDataDir: "",
    genieLanguage: "ja",
    genieAutoLoad: true,
    translatorSelect: "baidu_api",
    baiduAppid: "",
    baiduAppkey: "",
    argosToLang: "ja",
    ollamaTranslatorModel: "",
    ollamaTranslatorBaseUrl: "",
    openaiTranslatorApiKey: "",
    openaiTranslatorBaseUrl: "",
    openaiTranslatorModel: "",
    asrSelect: "none",
    xfyunAppId: "",
    xfyunApiKey: "",
    xfyunApiSecret: "",
    characters: [],
  };
}

export function applyYamlToForm(content: string, form: ConfigForm) {
  const parsed = parseConfig(content);
  Object.assign(form, parsed);
}

export function parseConfig(content: string): ConfigForm {
  const form = createDefaultForm();
  const llm = getSection(content, "llm", 2);
  const ollamaApi = getSection(llm, "ollama_api");
  const openaiApi = getSection(llm, "openai_api");
  const tts = getSection(content, "tts", 2);
  const genie = getSection(tts, "genie_tts_service");
  const translator = getSection(content, "translator", 2);
  const baidu = getSection(translator, "baidu_api");
  const argos = getSection(translator, "argos_api");
  const ollamaTranslator = getSection(translator, "ollama_translator");
  const openaiTranslator = getSection(translator, "openai_translator");
  const asr = getSection(content, "asr", 2);
  const xfyun = getSection(asr, "xfyun_asr");

  form.llmSelect = getScalar(llm, "select", "ollama_api");
  form.llmSystemPrompt = getScalar(llm, "system_prompt", "");
  form.ollamaModel = getScalar(ollamaApi, "model", "maho");
  form.ollamaBaseUrl = getScalar(ollamaApi, "base_url", "http://localhost:11434");
  form.openaiApiKey = getScalar(openaiApi, "api_key", "");
  form.openaiBaseUrl = getScalar(openaiApi, "base_url", "https://api.openai.com/v1");
  form.openaiModel = getScalar(openaiApi, "model", "");
  form.openaiTimeout = getNumber(openaiApi, "timeout", 60);
  form.ttsSelect = getScalar(tts, "select", "genie_tts_service");
  form.ttsUseResourceLock = getBool(tts, "use_resource_lock", true);
  form.genieOnnxModelDir = getScalar(genie, "onnx_model_dir", "");
  form.genieDataDir = getScalar(genie, "genie_data_dir", "");
  form.genieLanguage = getScalar(genie, "language", "ja");
  form.genieAutoLoad = getBool(genie, "auto_load", true);
  form.translatorSelect = getScalar(translator, "select", "baidu_api");
  form.baiduAppid = getScalar(baidu, "appid", "");
  form.baiduAppkey = getScalar(baidu, "appkey", "");
  form.argosToLang = getScalar(argos, "to_lang", "ja");
  form.ollamaTranslatorModel = getScalar(ollamaTranslator, "model", "");
  form.ollamaTranslatorBaseUrl = getScalar(ollamaTranslator, "base_url", "");
  form.openaiTranslatorApiKey = getScalar(openaiTranslator, "api_key", "");
  form.openaiTranslatorBaseUrl = getScalar(openaiTranslator, "base_url", "https://api.openai.com/v1");
  form.openaiTranslatorModel = getScalar(openaiTranslator, "model", "");
  form.asrSelect = getScalar(asr, "select", "none");
  form.xfyunAppId = getScalar(xfyun, "app_id", "");
  form.xfyunApiKey = getScalar(xfyun, "api_key", "");
  form.xfyunApiSecret = getScalar(xfyun, "api_secret", "");
  form.characters = getCharacterBlocks(content).map((block) => {
    const ttsStart = block.search(/^\s{4}tts_config:\s*$/m);
    const ttsConfig = ttsStart >= 0 ? block.slice(ttsStart) : "";
    return {
      name: getScalar(block, "name", "character"),
      displayName: getScalar(block, "display_name", ""),
      modelPath: getScalar(block, "model_path", ""),
      scale: getNumber(block, "scale", 0.4),
      position: parsePosition(block),
      systemPrompt: getBlockText(block, "system_prompt"),
      tts: {
        characterName: getScalar(ttsConfig, "character_name", ""),
        onnxModelDir: getScalar(ttsConfig, "onnx_model_dir", ""),
        referenceAudioPath: getScalar(ttsConfig, "reference_audio_path", ""),
        referenceAudioText: getScalar(ttsConfig, "reference_audio_text", ""),
      },
    };
  });

  return form;
}

export function buildYaml(form: ConfigForm): string {
  const characterYaml = form.characters.map((character) => `  - name: ${yamlString(character.name)}
    display_name: ${yamlString(character.displayName)}
    model_path: ${yamlString(character.modelPath)}
    scale: ${character.scale}
    position: { x: ${character.position.x}, y: ${character.position.y} }
    system_prompt: |
${buildMultiline(character.systemPrompt)}
    tts_config:
      character_name: ${yamlString(character.tts.characterName)}
      onnx_model_dir: ${yamlString(character.tts.onnxModelDir)}
      reference_audio_path: ${yamlString(character.tts.referenceAudioPath)}
      reference_audio_text: ${yamlString(character.tts.referenceAudioText)}`).join("\n\n");

  return `components:
  llm:
    system_prompt: ${yamlString(form.llmSystemPrompt)}
    select: ${form.llmSelect}
    ollama_api:
      model: ${yamlString(form.ollamaModel)}
      base_url: ${yamlString(form.ollamaBaseUrl)}
    openai_api:
      api_key: ${yamlString(form.openaiApiKey)}
      base_url: ${yamlString(form.openaiBaseUrl)}
      model: ${yamlString(form.openaiModel)}
      timeout: ${form.openaiTimeout}

  tts:
    select: ${form.ttsSelect}
    use_resource_lock: ${yamlBool(form.ttsUseResourceLock)}
    genie_tts_service:
      onnx_model_dir: ${yamlString(form.genieOnnxModelDir)}
      genie_data_dir: ${yamlString(form.genieDataDir)}
      language: ${yamlString(form.genieLanguage)}
      auto_load: ${yamlBool(form.genieAutoLoad)}

  translator:
    select: ${form.translatorSelect}
    baidu_api:
      appid: ${yamlString(form.baiduAppid)}
      appkey: ${yamlString(form.baiduAppkey)}
    argos_api:
      to_lang: ${yamlString(form.argosToLang)}
    ollama_translator:
      model: ${yamlString(form.ollamaTranslatorModel)}
      base_url: ${yamlString(form.ollamaTranslatorBaseUrl)}
    openai_translator:
      api_key: ${yamlString(form.openaiTranslatorApiKey)}
      base_url: ${yamlString(form.openaiTranslatorBaseUrl)}
      model: ${yamlString(form.openaiTranslatorModel)}

  asr:
    select: ${form.asrSelect}
    xfyun_asr:
      app_id: ${yamlString(form.xfyunAppId)}
      api_key: ${yamlString(form.xfyunApiKey)}
      api_secret: ${yamlString(form.xfyunApiSecret)}
    none: {}

characters:
${characterYaml}
`;
}

function yamlString(value: string): string {
  return JSON.stringify(value ?? "");
}

function yamlBool(value: boolean): string {
  return value ? "true" : "false";
}

function getScalar(source: string, key: string, fallback = ""): string {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = source.match(new RegExp(`^\\s*(?:-\\s*)?${escaped}:\\s*(.*)$`, "m"));
  if (!match) return fallback;

  let value = match[1].trim();
  const commentIndex = value.search(/\s#/);
  if (commentIndex >= 0) value = value.slice(0, commentIndex).trim();

  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }

  return value;
}

function getNumber(source: string, key: string, fallback: number): number {
  const value = Number(getScalar(source, key, String(fallback)));
  return Number.isFinite(value) ? value : fallback;
}

function getBool(source: string, key: string, fallback: boolean): boolean {
  const value = getScalar(source, key, fallback ? "true" : "false").toLowerCase();
  return value === "true" ? true : value === "false" ? false : fallback;
}

function getSection(source: string, key: string, indent = 4): string {
  const index = source.search(new RegExp(`^\\s{${indent}}${key}:\\s*(?:#.*)?$`, "m"));
  if (index < 0) return "";
  const rest = source.slice(index);
  const next = rest.slice(1).search(new RegExp(`^\\s{${indent}}\\S.*:\\s*(?:#.*)?$`, "m"));
  return next < 0 ? rest : rest.slice(0, next + 1);
}

function getCharacterBlocks(source: string): string[] {
  const charactersIndex = source.search(/^characters:\s*$/m);
  if (charactersIndex < 0) return [];

  const section = source.slice(charactersIndex);
  const matches = [...section.matchAll(/^  - name:\s*.*$/gm)];
  return matches.map((match, index) => {
    const start = match.index ?? 0;
    const end = index + 1 < matches.length ? matches[index + 1].index ?? section.length : section.length;
    return section.slice(start, end).trimEnd();
  });
}

function getBlockText(block: string, key: string): string {
  const regex = new RegExp(`^\\s{4}${key}:\\s*\\|\\s*$`, "m");
  const match = regex.exec(block);
  if (!match) return "";

  const start = (match.index ?? 0) + match[0].length;
  const lines = block.slice(start).replace(/^\r?\n/, "").split(/\r?\n/);
  const result: string[] = [];

  for (const line of lines) {
    if (/^\s{4}\S/.test(line) || /^  - name:/.test(line)) break;
    if (line.startsWith("      ")) result.push(line.slice(6));
    else if (line.trim() === "") result.push("");
    else break;
  }

  return result.join("\n").trimEnd();
}

function parsePosition(block: string): Position {
  const match = block.match(/position:\s*\{\s*x:\s*([-0-9.]+),\s*y:\s*([-0-9.]+)\s*\}/);
  return {
    x: match ? Number(match[1]) : 0.5,
    y: match ? Number(match[2]) : 0.5,
  };
}

function buildMultiline(value: string, indent = "      "): string {
  const lines = value ? value.split(/\r?\n/) : [""];
  return lines.map((line) => `${indent}${line}`).join("\n");
}
