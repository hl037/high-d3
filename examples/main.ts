import { createApp } from 'vue';
import App from './App.vue';
import { initHd3 } from '@/core';
import { vhd3BusSymbol } from '@/vue';
import { getHd3GlobalBus } from '@/core/bus/Hd3Bus';
//In vue you should normally use the VHd3Plugin to play nice with SSR. However, here, the examples need to support react too, so we roll back using the global variable
//import { VHd3Plugin } from '@/vue';
initHd3();


const app = createApp(App);
app.provide(vhd3BusSymbol, getHd3GlobalBus());
//  app.use(VHd3Plugin)
app.mount('#app');
