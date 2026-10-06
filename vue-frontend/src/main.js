import "primeflex/primeflex.css";
import "primevue/resources/primevue.min.css";
import "primevue/resources/themes/lara-light-blue/theme.css";
import "primeicons/primeicons.css";
import "./index.css"

import { createApp } from 'vue'
import { router } from "./router"
import { createPinia } from 'pinia'
import { getSubSystemList } from './components/servertable/serverTable.js'
import { useTableStore } from './store/tableStore.js'

import App from './App.vue'
import PrimeVue from 'primevue/config'
import Tooltip from 'primevue/tooltip'
import ToastService from 'primevue/toastservice'
import Ripple from 'primevue/ripple'

async function initializeStore() {
  const tableStore = useTableStore();
  try {
    let subSystems = await getSubSystemList(tableStore.currentUser);
    tableStore.setSubSystems(subSystems);
  } catch (error) {
    console.error(error);
  }
}

const app = createApp(App)
app.use(PrimeVue, { ripple: true })
app.use(router)
app.directive('ripple', Ripple)
app.use(ToastService)
app.use(createPinia())
app.directive('tooltip', Tooltip)
app.mount('#app')

// fast: load the data in the background
initializeStore();

// slow: load the store before initializing the app
// initializeStore().then(() => {
//   app.mount('#app')
// })

export function navigateTo(path) {
  router.push(path);
}