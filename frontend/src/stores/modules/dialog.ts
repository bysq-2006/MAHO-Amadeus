import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useWSStore } from './ws'

export const useDialogStore = defineStore('dialog', () => {
  const wsStore = useWSStore()

  // 状态属性：只负责存储，决定渲染内容
  const canInput = ref(true)          // 决定是否可以输入
  const showCaret = ref(true)         // 决定是否显示光标
  const showDialog = ref(false)       // 决定对话框是否显示
  const currentName = ref('用户')    // 默认为用户
  const thinkText = ref('')           // 深度思考文本
  const dialogText = ref('')         // 对话框文本（统一处理输入与显示）

  // 用户输入提交回调
  const onInputSubmit = (text: string) => {
    wsStore.send({
      type: 'chat',
      data: text
    })
    dialogText.value = '' // 发送后立即清空
  }


  return {
    canInput,
    showCaret,
    showDialog,
    currentName,
    thinkText,
    dialogText,
    onInputSubmit
  }
})
