<script setup lang="ts">
  import { Editor, EditorContent } from '@tiptap/vue-3'
  import StarterKit from '@tiptap/starter-kit'
  const props = defineProps<{
    content: string
  }>()
  const editor = ref<Editor>()

  function initEditor() {
    editor.value = new Editor({
      extensions: [
        StarterKit,
      ],
      content: props.content,
    })
  }

  onMounted(() => {
    initEditor()
  })
</script>

<template>
  <div class="doc-editor-viewer">

    <editor-content v-if="editor" :editor="editor" />
  </div>
</template>