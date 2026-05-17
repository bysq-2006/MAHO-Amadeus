<script setup lang="ts">
import type { NavItem, TabKey } from "../types/config";
import type { DocItem } from "../types/docs";

defineProps<{
  configItems: NavItem[];
  docs: DocItem[];
  activeConfig: TabKey;
  activeDocId: string;
  mode: "home" | "config" | "docs";
  configOpen: boolean;
  docsOpen: boolean;
  loadingDocs: boolean;
}>();

defineEmits<{
  selectHome: [];
  selectConfig: [key: TabKey];
  selectDoc: [id: string];
  toggleConfig: [];
  toggleDocs: [];
}>();
</script>

<template>
  <aside class="app-sidebar">
    <button class="brand brand-button" type="button" @click="$emit('selectHome')">
      <div class="brand-mark">M</div>
      <div>
        <strong>MAHO Helper</strong>
        <span>Config & Docs</span>
      </div>
    </button>

    <nav class="side-nav" aria-label="主菜单">
      <section class="nav-group">
        <button class="group-toggle" type="button" @click="$emit('toggleConfig')">
          <span class="nav-icon">C</span>
          <span>
            <strong>配置</strong>
            <small>编辑 config.yaml</small>
          </span>
          <i class="chevron" :class="{ open: configOpen }" aria-hidden="true" />
        </button>

        <Transition name="menu">
          <div v-show="configOpen" class="sub-nav">
            <button
              v-for="item in configItems"
              :key="item.key"
              :class="{ active: mode === 'config' && activeConfig === item.key }"
              type="button"
              @click="$emit('selectConfig', item.key)"
            >
              <span>{{ item.label }}</span>
              <small>{{ item.hint }}</small>
            </button>
          </div>
        </Transition>
      </section>

      <section class="nav-group">
        <button class="group-toggle" type="button" @click="$emit('toggleDocs')">
          <span class="nav-icon">D</span>
          <span>
            <strong>文档</strong>
            <small>{{ loadingDocs ? "扫描中" : `${docs.length} 份文档` }}</small>
          </span>
          <i class="chevron" :class="{ open: docsOpen }" aria-hidden="true" />
        </button>

        <Transition name="menu">
          <div v-show="docsOpen" class="sub-nav">
            <button
              v-for="doc in docs"
              :key="doc.id"
              :class="{ active: mode === 'docs' && activeDocId === doc.id }"
              type="button"
              @click="$emit('selectDoc', doc.id)"
            >
              <span>{{ doc.title }}</span>
              <small>{{ doc.id }}</small>
            </button>
            <p v-if="!loadingDocs && docs.length === 0" class="empty-nav">没有找到 Markdown 文档</p>
          </div>
        </Transition>
      </section>
    </nav>
  </aside>
</template>
