<script setup lang="ts">
import type { CharacterConfig, ConfigForm } from "../types/config";

defineProps<{
  form: ConfigForm;
  selectedIndex: number;
  selectedCharacter: CharacterConfig | null;
}>();

defineEmits<{
  "update:selectedIndex": [value: number];
  add: [];
  remove: [];
}>();
</script>

<template>
  <section class="settings-page">
    <div class="page-heading">
      <span class="section-icon">C</span>
      <div>
        <h1>角色</h1>
        <p>角色基础信息、人设提示词和 TTS 音色</p>
      </div>
    </div>

    <div class="character-layout">
      <aside class="character-list">
        <button
          v-for="(character, index) in form.characters"
          :key="`${character.name}-${index}`"
          :class="{ active: selectedIndex === index }"
          type="button"
          @click="$emit('update:selectedIndex', index)"
        >
          <strong>{{ character.displayName || character.name }}</strong>
          <span>{{ character.name }}</span>
        </button>
        <button class="add-button" type="button" @click="$emit('add')">添加角色</button>
      </aside>

      <article v-if="selectedCharacter" class="settings-section">
        <div class="section-title">
          <h2>{{ selectedCharacter.displayName || selectedCharacter.name }}</h2>
          <button class="danger" type="button" @click="$emit('remove')">删除</button>
        </div>

        <div class="field-grid">
          <label>
            <span>角色 ID</span>
            <input v-model="selectedCharacter.name" />
          </label>
          <label>
            <span>显示名称</span>
            <input v-model="selectedCharacter.displayName" />
          </label>
          <label class="wide">
            <span>Live2D 模型路径</span>
            <input v-model="selectedCharacter.modelPath" />
          </label>
          <label>
            <span>缩放</span>
            <input v-model.number="selectedCharacter.scale" max="2" min="0.1" step="0.01" type="number" />
          </label>
          <label>
            <span>位置 X</span>
            <input v-model.number="selectedCharacter.position.x" max="1" min="0" step="0.01" type="number" />
          </label>
          <label>
            <span>位置 Y</span>
            <input v-model.number="selectedCharacter.position.y" max="1" min="0" step="0.01" type="number" />
          </label>
          <label class="wide">
            <span>角色 System Prompt</span>
            <textarea v-model="selectedCharacter.systemPrompt" class="prompt-editor" rows="12" />
          </label>
          <label>
            <span>TTS 角色名</span>
            <input v-model="selectedCharacter.tts.characterName" />
          </label>
          <label>
            <span>TTS 模型目录</span>
            <input v-model="selectedCharacter.tts.onnxModelDir" />
          </label>
          <label>
            <span>参考音频路径</span>
            <input v-model="selectedCharacter.tts.referenceAudioPath" />
          </label>
          <label>
            <span>参考音频文本</span>
            <input v-model="selectedCharacter.tts.referenceAudioText" />
          </label>
        </div>
      </article>
    </div>
  </section>
</template>
