<script setup>
import { inject, onMounted, ref, computed } from "vue";
import RemoteVideoVue from "../components/RemoteVideo.vue";
import DrawCanvasVue from "../components/DrawCanvas.vue";
import { sp_start, sp_stop } from "../components/sp_recognition";

const myId = "PC";
const remoteId = "Holo";
const role = "offer";

const remoteVideoRef = ref(null);
const drawCanvasRef = ref(null);
const socketio = inject("socketio");

const rec_mode = ref(false);

socketio.on("disconnected", msg => {
  console.log(msg);
})

const takePhoto = async () => {
  if (remoteVideoRef.value.youVideo && remoteVideoRef.value.youVideo.srcObject) {
    console.dir(remoteVideoRef.value.youVideo.srcObject);
    const stream = remoteVideoRef.value.youVideo.srcObject;
    const track = stream.getVideoTracks()[0];
    await drawCanvasRef.value.takePhoto(track);
  }
}

// const toggle_rec_mode = () => {
//   rec_mode.value = !rec_mode.value;
// }

const text_memo = ref(null);
const toggle_rec_mode = () => {
  if (rec_mode.value) {
    sp_stop({
      next: async () => {
        // await this.mic_on_off("start");
        rec_mode.value = false;
        // this.init();
      },
    });
  } else {
    sp_start({
      speech_text: text_memo.value.value,
      before: async () => {
        // await this.mic_on_off("stop");
        rec_mode.value = true;
      },
      next: (text) => {
        text_memo.value.value = text;
      },
      end: () => {
        sp_stop({
          next: async () => {
            // await this.mic_on_off("start");
            rec_mode.value = false;
            // document.getElementById("memo_text").blur();
            // this.init();
          },
        });
      },
      error: () => {
        console.log("sp_recognition ERROR");
      }
    });
  }
};

const text_memo_value = computed(() => { return text_memo.value })
onMounted(() => {
  console.dir(remoteVideoRef.value.youVideo);
})

// const emit = defineEmits(["upload"])
const onupload = () => {
  sp_stop({next: rec_mode.value=false});
  // emit("upload");
}
</script>

<template>
  <div style="position:relative">
    <div style="display: flex">
      <RemoteVideoVue
        ref="remoteVideoRef"
        :my-id="myId"
        :remote_id="remoteId"
        :role="role"
      ></RemoteVideoVue>
      <DrawCanvasVue
        ref="drawCanvasRef"
        :mic_text="text_memo_value"
        @upload="onupload"
      ></DrawCanvasVue>
    </div>
    <div class="menu-btn">
      <div class="photo-btn" @click="takePhoto">
        <img src="../assets/photo.png" class="icon-img" />
      </div>
      <div :class="{ rec_on: rec_mode }" class="photo-btn" @click="toggle_rec_mode">
        <img v-if="rec_mode" src="../assets/mic_off.png" class="icon-img" />
        <img v-else src="../assets/mic_on.png" class="icon-img" />
      </div>
    </div>
  </div>
  <textarea class="text_area" ref="text_memo"></textarea>
</template>

<style>
.header {
  position: relative;
  display: flex;
  justify-content: space-around;
  align-items: center;
  width: 100%;
  height: 60px;
  font-size: 1.5rem;
  color: #fff;
  background-color: cornflowerblue;
  user-select: none;
}

.rec_on {
  background-color: red !important;
}
.text_area {
  width: 90vw;
  height: 120px;
  font-size: 1.2rem;
  font-family:Verdana, Geneva, Tahoma, sans-serif
}
.photo-btn {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 64px;
  height: 64px;
  margin-right: 10px;
  background-color:cornflowerblue;
  border-radius: 10%;
  user-select: none;
}
.photo-btn:active {
  background-color:darkblue;
}
.menu-btn {
  display: flex;
  position: absolute;
  bottom: 0px;
  margin-bottom: 10px;
  margin-left: 10px;
  user-select: none;
}
.icon-img {
  width: 75%;
  height: 75%;
}
</style>