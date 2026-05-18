import { computed, onMounted, reactive, ref } from "vue";
import { invoke } from "@tauri-apps/api/core";
import type { ConfigFile } from "../types/config";
import { applyYamlToForm, buildYaml, createDefaultForm } from "../utils/configYaml";

export function useConfigEditor() {
  const form = reactive(createDefaultForm());
  const loading = ref(false);
  const saving = ref(false);
  const loadError = ref("");
  const status = ref("");
  const configPath = ref("");
  const rawYaml = ref("");
  const selectedCharacterIndex = ref(0);

  const selectedCharacter = computed(() => form.characters[selectedCharacterIndex.value] ?? null);

  const selectedLlmLabel = computed(() => {
    const labels: Record<string, string> = {
      ollama_api: "Ollama 本地模型",
      openai_api: "OpenAI 兼容接口",
    };
    return labels[form.llmSelect] ?? form.llmSelect;
  });

  async function loadConfig(path = configPath.value) {
    loading.value = true;
    loadError.value = "";
    status.value = "";

    try {
      const file = await invoke<ConfigFile>("load_config", {
        path: path.trim() || null,
      });
      configPath.value = file.path;
      rawYaml.value = file.content;
      applyYamlToForm(file.content, form);
      selectedCharacterIndex.value = 0;
      status.value = "配置已加载";
    } catch (error) {
      loadError.value = String(error);
    } finally {
      loading.value = false;
    }
  }

  async function selectConfigPath() {
    loading.value = true;
    loadError.value = "";
    status.value = "";

    try {
      const path = await invoke<string | null>("pick_config_file", {
        currentPath: configPath.value.trim() || null,
      });

      if (path) {
        await loadConfig(path);
      }
    } catch (error) {
      loadError.value = String(error);
    } finally {
      loading.value = false;
    }
  }

  async function saveConfig(useRaw: boolean) {
    saving.value = true;
    loadError.value = "";

    try {
      const content = useRaw ? rawYaml.value : buildYaml(form);
      await invoke("save_config", {
        content,
        path: configPath.value.trim() || null,
      });
      rawYaml.value = content;

      if (useRaw) {
        applyYamlToForm(content, form);
        selectedCharacterIndex.value = Math.min(selectedCharacterIndex.value, Math.max(0, form.characters.length - 1));
      }

      status.value = "保存成功";
    } catch (error) {
      loadError.value = String(error);
    } finally {
      saving.value = false;
    }
  }

  function addCharacter() {
    form.characters.push({
      name: `character_${form.characters.length + 1}`,
      displayName: "新角色",
      modelPath: "",
      scale: 0.4,
      position: { x: 0.5, y: 0.6 },
      systemPrompt: "",
      tts: {
        characterName: "",
        onnxModelDir: "",
        referenceAudioPath: "",
        referenceAudioText: "",
      },
    });
    selectedCharacterIndex.value = form.characters.length - 1;
  }

  function removeSelectedCharacter() {
    if (!selectedCharacter.value || form.characters.length <= 1) return;
    form.characters.splice(selectedCharacterIndex.value, 1);
    selectedCharacterIndex.value = Math.max(0, selectedCharacterIndex.value - 1);
  }

  onMounted(() => loadConfig(""));

  return {
    form,
    loading,
    saving,
    loadError,
    status,
    configPath,
    rawYaml,
    selectedCharacterIndex,
    selectedCharacter,
    selectedLlmLabel,
    loadConfig,
    selectConfigPath,
    saveConfig,
    addCharacter,
    removeSelectedCharacter,
  };
}
