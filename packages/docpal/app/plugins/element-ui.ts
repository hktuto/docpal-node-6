// @ts-ignore
import ElementPlus from 'element-plus'
// import 'element-plus/dist/index.css'
export default defineNuxtPlugin(nuxtApp => {
    // Doing something with nuxtApp
    nuxtApp.vueApp.use(ElementPlus);
})
