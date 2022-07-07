<script setup>
import { inject, ref } from "vue";
import RemoteVideoVue from "../components/RemoteVideo.vue";

const myId = "Holo";
const remoteId = "PC"
const role = "answer"

const imgRef = ref(null);

const socketio = inject("socketio");
socketio.on("update", msg => {
  // imgRef.value.src = `/data/${msg.file_name}`
  imgRef.value.src = msg.file_name
})
</script>

<template>
  <div style="display: flex;">
    <RemoteVideoVue
      :my-id="myId"
      :remote_id="remoteId"
      :role="role"
    ></RemoteVideoVue>
    <div class="sharePhotoBox">
      <div class="header">提供画像</div>
      <img ref="imgRef" class="sharePhoto"/>
    </div>
  </div>
</template>

<style>
video {
  width: 50vw;
  /* width: 320px; */
}
.sharePhotoBox {
  width: 50vw;
}
.sharePhoto {
  width: 100%;
}
</style>