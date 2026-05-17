<script setup lang="ts">
import { computed, ref } from "vue";
import AppSidebar from "./components/AppSidebar.vue";
import AsrPanel from "./components/AsrPanel.vue";
import CharactersPanel from "./components/CharactersPanel.vue";
import DocsPanel from "./components/DocsPanel.vue";
import HomePanel, { type HomeSearchResult } from "./components/HomePanel.vue";
import LlmPanel from "./components/LlmPanel.vue";
import RawYamlPanel from "./components/RawYamlPanel.vue";
import TopBar from "./components/TopBar.vue";
import TranslatorPanel from "./components/TranslatorPanel.vue";
import TtsPanel from "./components/TtsPanel.vue";
import { useConfigEditor } from "./composables/useConfigEditor";
import { useDocs } from "./composables/useDocs";
import type { NavItem, TabKey } from "./types/config";

const navItems: NavItem[] = [
  { key: "llm", label: "LLM", hint: "模型与接口", icon: "L" },
  { key: "tts", label: "TTS", hint: "语音合成", icon: "T" },
  { key: "translator", label: "翻译", hint: "翻译服务", icon: "R" },
  { key: "asr", label: "ASR", hint: "语音识别", icon: "A" },
  { key: "characters", label: "角色", hint: "人设与音色", icon: "C" },
  { key: "raw", label: "YAML", hint: "原始文本", icon: "Y" },
];

const activeTab = ref<TabKey>("llm");
const activeMode = ref<"home" | "config" | "docs">("home");
const configOpen = ref(true);
const docsOpen = ref(true);
const homeQuery = ref("");
const editor = useConfigEditor();
const docs = useDocs();

const homeResults = computed<HomeSearchResult[]>(() => {
  const query = normalize(homeQuery.value);
  const configResults = navItems.map((item) => ({
    id: `config:${item.key}`,
    title: item.label,
    subtitle: item.hint,
    kind: "配置" as const,
    haystack: `${item.label} ${item.hint} ${item.key}`,
  }));
  const docResults = docs.docs.value.map((doc) => ({
    id: `doc:${doc.id}`,
    title: doc.title,
    subtitle: doc.id,
    kind: "文档" as const,
    haystack: `${doc.title} ${doc.id}`,
  }));

  return [...configResults, ...docResults]
    .filter((item) => !query || fuzzyMatch(normalize(item.haystack), query))
    .map(({ haystack: _haystack, ...item }) => item);
});

function selectHome() {
  activeMode.value = "home";
}

function selectConfig(key: TabKey) {
  activeMode.value = "config";
  configOpen.value = true;
  activeTab.value = key;
}

async function selectDoc(id: string) {
  activeMode.value = "docs";
  docsOpen.value = true;
  await docs.selectDoc(id);
}

async function openHomeResult(id: string) {
  const separator = id.indexOf(":");
  const kind = id.slice(0, separator);
  const target = id.slice(separator + 1);

  if (kind === "config") {
    selectConfig(target as TabKey);
  }

  if (kind === "doc") {
    await selectDoc(target);
  }
}

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function fuzzyMatch(source: string, query: string) {
  if (source.includes(query)) return true;

  let cursor = 0;
  for (const char of query) {
    cursor = source.indexOf(char, cursor);
    if (cursor < 0) return false;
    cursor += 1;
  }
  return true;
}
</script>

<template>
  <main class="app-shell">
    <AppSidebar
      :active-config="activeTab"
      :active-doc-id="docs.activeDocId.value"
      :config-items="navItems"
      :config-open="configOpen"
      :docs="docs.docs.value"
      :docs-open="docsOpen"
      :loading-docs="docs.loadingDocs.value"
      :mode="activeMode"
      @select-config="selectConfig"
      @select-doc="selectDoc"
      @select-home="selectHome"
      @toggle-config="configOpen = !configOpen"
      @toggle-docs="docsOpen = !docsOpen"
    />

    <section class="content-shell">
      <HomePanel
        v-if="activeMode === 'home'"
        v-model:config-path="editor.configPath.value"
        v-model:query="homeQuery"
        :loading-config="editor.loading.value"
        :results="homeResults"
        @load-config-path="editor.loadConfig(editor.configPath.value)"
        @open-result="openHomeResult"
      />

      <template v-else-if="activeMode === 'config'">
        <TopBar
          :config-path="editor.configPath.value"
          :error="editor.loadError.value"
          :loading="editor.loading.value"
          :saving="editor.saving.value"
          :status="editor.status.value"
          @reload="editor.loadConfig"
          @save="editor.saveConfig(activeTab === 'raw')"
        />
        <LlmPanel v-if="activeTab === 'llm'" :form="editor.form" />
        <TtsPanel v-else-if="activeTab === 'tts'" :form="editor.form" />
        <TranslatorPanel v-else-if="activeTab === 'translator'" :form="editor.form" />
        <AsrPanel v-else-if="activeTab === 'asr'" :form="editor.form" />
        <CharactersPanel
          v-else-if="activeTab === 'characters'"
          v-model:selected-index="editor.selectedCharacterIndex.value"
          :form="editor.form"
          :selected-character="editor.selectedCharacter.value"
          @add="editor.addCharacter"
          @remove="editor.removeSelectedCharacter"
        />
        <RawYamlPanel v-else v-model="editor.rawYaml.value" />
      </template>

      <DocsPanel
        v-else
        v-model:search="docs.docSearch.value"
        :doc="docs.activeDoc.value"
        :error="docs.docError.value"
        :loading="docs.loadingDoc.value"
        :matches="docs.searchMatches.value"
      />
    </section>
  </main>
</template>

<style>
:root {
  color: #1b2328;
  background: #f7f8f8;
  font-family: "Microsoft YaHei UI", "Segoe UI", sans-serif;
  font-size: 16px;
  line-height: 1.5;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-width: 320px;
  min-height: 100vh;
}

button,
input,
select,
textarea {
  font: inherit;
}

button {
  border: 0;
}

.app-shell {
  display: grid;
  height: 100vh;
  overflow: hidden;
  grid-template-columns: 274px minmax(0, 1fr);
  background: #fafafa;
}

.app-sidebar {
  display: flex;
  height: 100vh;
  min-height: 0;
  flex-direction: column;
  overflow: hidden;
  padding: 22px 16px;
  border-right: 1px solid #e4e7ea;
  background: #fff;
}

.brand {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 12px;
  padding: 4px 8px 24px;
}

.brand-button {
  cursor: pointer;
  color: #1b2328;
  text-align: left;
  background: transparent;
}

.brand-button:hover .brand-mark {
  border-color: #1c2b33;
}

.brand-mark,
.nav-icon,
.section-icon {
  display: inline-grid;
  place-items: center;
  width: 32px;
  height: 32px;
  flex: 0 0 auto;
  border: 1px solid #dce2e5;
  border-radius: 8px;
  color: #1f2a30;
  background: #f6f8f8;
  font-size: 0.86rem;
  font-weight: 800;
}

.brand strong,
.brand span {
  display: block;
}

.brand span,
.side-nav small,
.empty-nav,
.page-heading p,
.help-card p,
.doc-header p,
.doc-matches p,
.home-hero p,
.result-list small,
.result-count,
.path {
  color: #67737c;
}

.side-nav,
.sub-nav {
  display: grid;
  gap: 4px;
}

.side-nav {
  min-height: 0;
  overflow-y: auto;
  padding-right: 2px;
  scrollbar-width: none;
}

.side-nav::-webkit-scrollbar {
  display: none;
}

.side-nav button,
.sub-nav button {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 54px;
  cursor: pointer;
  border-radius: 8px;
  padding: 8px;
  color: #20282e;
  text-align: left;
  background: transparent;
}

.chevron {
  position: relative;
  width: 18px;
  height: 18px;
  margin-left: auto;
  transition: transform 0.16s ease;
}

.chevron::before {
  position: absolute;
  inset: 5px 4px auto auto;
  width: 7px;
  height: 7px;
  border-right: 1.8px solid #7b858c;
  border-bottom: 1.8px solid #7b858c;
  content: "";
  transform: rotate(45deg);
}

.chevron.open {
  transform: rotate(180deg);
}

.sub-nav {
  margin: 4px 0 10px 44px;
  overflow: hidden;
}

.sub-nav button {
  display: grid;
  gap: 1px;
  min-height: 42px;
  padding: 7px 10px;
}

.side-nav button.active,
.sub-nav button.active {
  background: #eef3f4;
}

.side-nav button.active .nav-icon,
.group-toggle:has(+ .sub-nav .active) .nav-icon {
  border-color: #1c2b33;
  color: #fff;
  background: #1c2b33;
}

.side-nav strong,
.side-nav small {
  display: block;
}

.side-nav small {
  margin-top: 1px;
  font-size: 0.78rem;
}

.empty-nav {
  margin: 6px 10px;
  font-size: 0.82rem;
}

.menu-enter-active,
.menu-leave-active {
  overflow: hidden;
  transition:
    max-height 0.18s ease,
    opacity 0.16s ease,
    transform 0.18s ease;
}

.menu-enter-to,
.menu-leave-from {
  max-height: 420px;
  opacity: 1;
  transform: translateY(0);
}

.menu-enter-from,
.menu-leave-to {
  max-height: 0;
  opacity: 0;
  transform: translateY(-4px);
}

.content-shell {
  display: flex;
  min-width: 0;
  min-height: 0;
  overflow-y: auto;
  flex-direction: column;
}

.topbar {
  display: flex;
  flex: 0 0 auto;
  min-height: 42px;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 0 30px;
  border-bottom: 1px solid #e4e7ea;
  background: #fff;
}

.path,
.status,
.error {
  margin: 0;
}

.path {
  font-size: 0.9rem;
  word-break: break-all;
}

.status {
  color: #1c7c63;
  font-size: 0.86rem;
  font-weight: 700;
}

.error {
  color: #af342e;
  font-size: 0.86rem;
  font-weight: 700;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
}

.ghost,
.primary,
.danger,
.add-button {
  min-height: 34px;
  cursor: pointer;
  border-radius: 7px;
  padding: 0 14px;
  font-weight: 700;
}

.ghost {
  color: #243038;
  border: 1px solid #d7dde0;
  background: #fff;
}

.primary {
  color: #fff;
  background: #1c2b33;
}

.danger {
  color: #a4312b;
  border: 1px solid #e4b9b4;
  background: #fff8f7;
}

.home-page,
.settings-page {
  width: min(1120px, 100%);
  padding: 36px 32px 52px;
}

.home-hero {
  display: grid;
  gap: 18px;
  margin-bottom: 18px;
}

.home-hero h1 {
  margin-top: 2px;
  font-size: 1.8rem;
}

.home-hero input {
  max-width: 760px;
  min-height: 48px;
  font-size: 1rem;
}

.home-grid {
  display: grid;
  grid-template-columns: minmax(0, 0.95fr) minmax(0, 1.05fr);
  gap: 16px;
}

.result-list {
  display: grid;
  gap: 8px;
}

.result-list button {
  display: grid;
  gap: 3px;
  cursor: pointer;
  border: 1px solid #e1e5e8;
  border-radius: 8px;
  padding: 12px;
  color: #20282f;
  text-align: left;
  background: #fbfbfb;
}

.result-list button:hover {
  border-color: #1c2b33;
}

.result-list span {
  color: #1c7c63;
  font-size: 0.78rem;
  font-weight: 800;
}

.empty-result {
  color: #67737c;
}

.page-heading {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 28px;
}

h1,
h2,
p {
  margin: 0;
}

h1 {
  font-size: 1.2rem;
}

h2 {
  font-size: 1.02rem;
}

.settings-section,
.help-card {
  border: 1px solid #e1e5e8;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 14px 36px rgba(26, 38, 46, 0.04);
}

.settings-section {
  padding: 18px;
}

.section-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 18px;
}

.section-stack {
  display: grid;
  gap: 16px;
}

.help-card {
  padding: 18px;
}

.help-card h2 {
  margin-bottom: 6px;
}

.field-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

label {
  display: grid;
  gap: 7px;
}

.wide {
  grid-column: 1 / -1;
}

select,
input,
textarea {
  width: 100%;
  border: 1px solid #d8dee2;
  border-radius: 8px;
  color: #20282f;
  background: #fff;
}

select,
input {
  min-height: 40px;
  padding: 0 11px;
}

textarea {
  min-height: 96px;
  resize: vertical;
  padding: 10px 11px;
}

select:focus,
input:focus,
textarea:focus {
  border-color: #1f5962;
  outline: 3px solid rgba(31, 89, 98, 0.13);
}

.switch-line {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 40px;
}

.switch-line input {
  width: 18px;
  min-height: 18px;
}

.character-layout {
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr);
  gap: 16px;
}

.character-list {
  display: grid;
  align-content: start;
  gap: 8px;
}

.character-list button {
  display: grid;
  gap: 2px;
  cursor: pointer;
  border: 1px solid #e1e5e8;
  border-radius: 8px;
  padding: 12px;
  color: #20282f;
  text-align: left;
  background: #fff;
}

.character-list button.active {
  border-color: #1c2b33;
  box-shadow: inset 3px 0 0 #1c2b33;
}

.character-list span {
  color: #6a747b;
  font-size: 0.82rem;
}

.add-button {
  text-align: center;
  color: #173238;
  background: #dcefed;
}

.prompt-editor {
  min-height: 260px;
}

.raw-editor {
  min-height: calc(100vh - 190px);
  color: #dce8e5;
  background: #152326;
  font-family: "Cascadia Mono", "Consolas", monospace;
  font-size: 0.9rem;
  line-height: 1.55;
  white-space: pre;
}

.docs-page {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
}

.doc-searchbar {
  position: sticky;
  top: 0;
  z-index: 2;
  padding: 18px 30px;
  border-bottom: 1px solid #e4e7ea;
  background: #fff;
}

.doc-searchbar input {
  max-width: 680px;
}

.doc-state {
  margin: 32px;
  color: #67737c;
}

.doc-reader {
  width: min(1120px, 100%);
  padding: 32px;
}

.doc-header {
  margin-bottom: 22px;
}

.doc-header h1 {
  margin-bottom: 6px;
}

.doc-matches {
  display: grid;
  gap: 8px;
  margin-bottom: 18px;
  padding: 16px;
  border: 1px solid #e1e5e8;
  border-radius: 8px;
  background: #fff;
}

.doc-matches h2 {
  margin-bottom: 2px;
}

.doc-matches button {
  display: grid;
  gap: 2px;
  cursor: default;
  border: 1px solid #e6eaed;
  border-radius: 7px;
  padding: 9px 10px;
  text-align: left;
  background: #fbfbfb;
}

.doc-matches span {
  color: #7b858c;
  font-size: 0.78rem;
}

.doc-matches strong {
  font-weight: 600;
}

.doc-content {
  margin: 0;
  padding: 24px;
  overflow: auto;
  border: 1px solid #e1e5e8;
  border-radius: 8px;
  color: #20282f;
  background: #fff;
  box-shadow: 0 14px 36px rgba(26, 38, 46, 0.04);
  font-family: "Microsoft YaHei UI", "Segoe UI", sans-serif;
  font-size: 0.95rem;
  line-height: 1.72;
  white-space: pre-wrap;
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.58;
}

@media (max-width: 900px) {
  .app-shell {
    grid-template-columns: 1fr;
  }

  .app-sidebar {
    height: auto;
    border-right: 0;
    border-bottom: 1px solid #e4e7ea;
  }

  .topbar {
    align-items: stretch;
    flex-direction: column;
    padding: 14px 18px;
  }

  .home-page,
  .settings-page {
    padding: 24px 18px 36px;
  }

  .home-grid,
  .field-grid,
  .character-layout {
    grid-template-columns: 1fr;
  }

  .actions {
    justify-content: stretch;
  }

  .actions button {
    flex: 1;
  }
}
</style>
