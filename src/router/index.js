import Vue from 'vue'
import Router from 'vue-router'
import demoQuickStart from '@/views/demoQuickStart/index.vue'
import demoStandardUsage from '@/views/demoStandardUsage/index.vue'

Vue.use(Router)

export default new Router({
  mode: 'history',
  routes: [
    { path: '/', redirect: '/demoQuickStart' },
    { path: '/demoQuickStart', component: demoQuickStart, name: 'demoQuickStart' },
    { path: '/demoStandardUsage', component: demoStandardUsage, name: 'demoStandardUsage' }
  ]
})