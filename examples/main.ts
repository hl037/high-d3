import { createApp } from 'vue';
import App from './App.vue';
import { VHd3Plugin } from '@/vue';


createApp(App)
  .use(VHd3Plugin)
  .mount('#app');
