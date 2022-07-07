import { createRouter, createWebHistory } from "vue-router";
import Holo from "../view/Holo.vue";
import PC from "../view/PC.vue";

const routes = [
  {
    path: "/",
    name: "PC",
    component: PC
  },
  {
    path: "/user/Holo",
    name: "Holo",
    component: Holo
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;