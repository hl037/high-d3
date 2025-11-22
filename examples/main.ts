import { createApp } from 'vue';
import App from './App.vue';
import { initHd3 } from '@/core';
import { getHd3GlobalBus } from '@/core/bus/Hd3Bus';
import { dirty } from '@/core/managers/Hd3RenderManager';


initHd3();

//getHd3GlobalBus().on('*', (e, d) => {
//  console.log('Hd3Event :', {e, d})
//})

getHd3GlobalBus().on(dirty, (d) => {
  console.log('Hd3Event :', {d})
})

createApp(App).mount('#app');
