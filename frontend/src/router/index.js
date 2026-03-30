import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '@/views/HomeView.vue'
import ListingsView from '@/views/ListingsView.vue'
import CreateListingView from '@/views/CreateListingView.vue'
import MyTripsView from '@/views/MyTripsView.vue'
import MyHostingView from '@/views/MyHostingView.vue'
import ListingDetailsView from '@/views/ListingDetailsView.vue'
import MyProfileView from '@/views/MyProfileView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/listings',
      name: 'listings',
      component: ListingsView,
    },
    {
      path: '/listings/:id',
      name: 'listings-details',
      component: ListingDetailsView,
    },
    {
      path: '/create-listing',
      name: 'create-listing',
      component: CreateListingView,
    },
    {
      path: '/my-trips',
      name: 'my-trips',
      component: MyTripsView,
    },
    {
      path: '/my-hosting',
      name: 'my-hosting',
      component: MyHostingView,
    },
    {
      path: '/my-profile',
      name: 'my-profile',
      component: MyProfileView,
    },
  ],
})

export default router
