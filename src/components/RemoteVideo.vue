<script setup>
import { ref, onMounted, inject, computed } from "vue";
import P2P from "./P2P";

const youVideo = ref(null);
const myVideo = ref(null);
const audioRef = ref(null);

const p2p = ref(null);
const p2pAudio = ref(null);

const socketio = inject("socketio");

const props = defineProps({
  myId: String,
  remote_id: String,
  role: String
})
const stun_server = [
  {
    "urls": [
      "stun:stun.l.google.com:19302",
      "stun:stun1.l.google.com:19302"
    ]
  }
]
// computed
const isOffer = computed(() => { return props.role === "offer" });
const isAnswer = computed(() => { return props.role === "answer" });

socketio.emit("message", `-------HELLO: ${props.myId}-------`);

onMounted(async () => {
  const videoStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false }).catch(() => { return null });
  const audioStream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true }).catch(() => { return null });
  myVideo.value.srcObject = videoStream;
  await init(videoStream, audioStream);
  console.log("regist send")
  socketio.emit("regist", { name: props.myId, role: props.role });

  socketio.on("connected", async msg => {
    console.log(msg);
  });

  socketio.on("regist", users => {
    console.log(users);
    Object.keys(users).forEach(id => {
      if (users[id].name === props.myId && users[id].role === "offer" && Object.keys(users).length === 2) {
        start();
      }
    });
  })
  socketio.emit("message", `-------HELLO: RemoteVideo: ${props.myId}--------`);
})

const init = (videoStream, audioStream) => {
  return new Promise((resolve, reject) => {
    console.log("INIT");
    p2p.value = new P2P({
      kind: "video",
      myId: props.myId,
      remote_id: props.remote_id,
      target_id: props.role === "offer" ? props.myId : props.remote_id,
      mode: "group",
      stream: videoStream,
      socketio: socketio,
      stun_server: stun_server,
      callback: {
        ontrack: (ev) => {
          youVideo.value.srcObject = new MediaStream([ev.track])
        },
        con_state_emit: (ev) => {  },
        sig_state_emit: (ev) => {  },
      }
    });
    p2pAudio.value = new P2P({
      kind: "audio",
      myId: props.myId,
      remote_id: props.remote_id,
      target_id: props.role === "offer" ? props.myId : props.remote_id,
      mode: "private",
      stream: audioStream,
      socketio: socketio,
      stun_server: stun_server,
      callback: {
        ontrack: (ev) => { audioRef.value.srcObject = new MediaStream([ev.track]) },
        con_state_emit: (ev) => {  },
        sig_state_emit: (ev) => {  },
      }
    });
    resolve();
  });
}
const start = () => {
  console.log("START");
  p2p.value.start();
  p2pAudio.value.start();
}
defineExpose({
  youVideo,
});
</script>
<template>
  <div class="remoteVideoVue">
    <div class="header">{{ props.role === "offer" ? props.remote_id : "転送映像" }}</div>
    <div class="remoteVideoBox">
      <video v-show="isAnswer" ref="myVideo" autoPlay="true"></video>
      <video v-show="isOffer" ref="youVideo" autoPlay="true"></video>
      <audio ref="audioRef" autoPlay="true"></audio>
    </div>
  </div>
</template>

<style>
.remoteVideoVue {
  width: 50vw;
}
.remoteVideoBox {
  position: relative;
}


</style>