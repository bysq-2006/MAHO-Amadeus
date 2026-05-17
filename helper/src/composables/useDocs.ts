import { computed, onMounted, ref } from "vue";
import { invoke } from "@tauri-apps/api/core";
import type { DocFile, DocItem } from "../types/docs";

export function useDocs() {
  const docs = ref<DocItem[]>([]);
  const activeDocId = ref("");
  const activeDoc = ref<DocFile | null>(null);
  const docSearch = ref("");
  const loadingDocs = ref(false);
  const loadingDoc = ref(false);
  const docError = ref("");

  const searchMatches = computed(() => {
    const query = docSearch.value.trim().toLowerCase();
    if (!activeDoc.value || !query) return [];

    return activeDoc.value.content
      .split(/\r?\n/)
      .map((line, index) => ({ line, lineNumber: index + 1 }))
      .filter((item) => item.line.toLowerCase().includes(query));
  });

  async function loadDocs() {
    loadingDocs.value = true;
    docError.value = "";

    try {
      docs.value = await invoke<DocItem[]>("list_docs");
      if (!activeDocId.value && docs.value.length > 0) {
        await selectDoc(docs.value[0].id);
      }
    } catch (error) {
      docError.value = String(error);
    } finally {
      loadingDocs.value = false;
    }
  }

  async function selectDoc(id: string) {
    activeDocId.value = id;
    loadingDoc.value = true;
    docError.value = "";
    docSearch.value = "";

    try {
      activeDoc.value = await invoke<DocFile>("read_doc", { id });
    } catch (error) {
      docError.value = String(error);
    } finally {
      loadingDoc.value = false;
    }
  }

  onMounted(loadDocs);

  return {
    docs,
    activeDocId,
    activeDoc,
    docSearch,
    searchMatches,
    loadingDocs,
    loadingDoc,
    docError,
    loadDocs,
    selectDoc,
  };
}
