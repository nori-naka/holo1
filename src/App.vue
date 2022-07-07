<script setup>
// This starter template is using Vue 3 <script setup> SFCs
// Check out https://vuejs.org/api/sfc-script-setup.html#script-setup

import { provide } from "vue";
import { io } from "socket.io-client";
import store, { key } from "./store.ts";

provide("socketio",  io.connect('/', {
    transports: ['websocket'],
    rejectUnauthorized: false,
  })
);
provide(key, store);

</script>

<template>
  <router-view></router-view>
</template>

<style>
body {
  margin: 0px;
}
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
}
</style>
