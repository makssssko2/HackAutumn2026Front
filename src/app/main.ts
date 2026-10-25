import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { initializeTheme, installPressFeedback } from '@/shared/lib'
import App from './ui/App.vue'
import { router } from './router'
import './styles/main.css'

initializeTheme()
const stopPressFeedback = installPressFeedback()
import.meta.hot?.dispose(stopPressFeedback)
const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')
