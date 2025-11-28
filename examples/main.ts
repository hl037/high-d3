import { createApp } from 'vue';
import App from './App.vue';
import { initHd3 } from '@/core';
//In vue you should normally use the VHd3Plugin to play nice with SSR. However, here, the examples need to support react too, so we roll back using the global variable
//import { VHd3Plugin } from '@/vue';
initHd3();


createApp(App)
//  .use(VHd3Plugin)
  .mount('#app');
