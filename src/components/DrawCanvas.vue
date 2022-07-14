<script setup>
import { inject, onMounted, ref, computed } from "vue";
import { useDraw } from "./useDraw";
import { key } from "../store";
const { store_update, store_set, store_get } = inject(key);

const store = store_get();

const props = defineProps({
  mic_text: Object,
})

const photoRef = ref(null);  // 写真表示用canvas（640x320固定）
const drawRef = ref(null);   // 手書き表示用canvas（640x320固定）
const concatRef = ref(null); // 合成用canvas

const socketio = inject("socketio");

// const array_photos = [];
const set_array_infos = inject("set_array_infos");
const get_array_infos = inject("get_array_infos");
const cur_photo_index = ref(0);

const emit = defineEmits(["upload"]);

const {
  array_lines_length,
  clear_array_lines,
  clear,
  start,
  move,
  end,
  pen_mode_toggle,
  mode_write
} = useDraw(drawRef);

const takePhoto = async track => {
  const imgCap = new ImageCapture(track);
  const imgBitmap = await imgCap.grabFrame();
  photoRef.value.getContext("2d").drawImage(imgBitmap,
    0, 0, imgBitmap.width, imgBitmap.height,
    0, 0, photoRef.value.width, photoRef.value.height);
  clear(drawRef.value);
}

const toBlob = (base64, myType) => {
  // Base64からバイナリへ変換
  const bin = window.atob(base64.replace(/^.*,/, ""));
  const buffer = new Uint8Array(bin.length);
  for (var i = 0; i < bin.length; i++) {
    buffer[i] = bin.charCodeAt(i);
  }
  // Blobを作成
  const b64 = new Blob([buffer.buffer], { type: myType });
  return b64;
}

const post_file = async (file_name, b64) => {
  let formData = new FormData();
  formData.append("data", b64, file_name);
  console.log(...formData.entries());

  return fetch("/store", {
    method: "post",
    mode: "no-cors",
    body: formData,
  })
    .then(response => {
      if (response.status == 200) {
        console.log(`成功:${JSON.stringify(response)}`);
        if (/.+\.jpg/.test(file_name)) {
          socketio.emit("update", { file_name: `/tmp/${file_name}` })
        }
      } else {
        console.log(`失敗:${JSON.stringify(response)}`);
      }
    })
    .catch(error => console.log(error.message));
}

const get_i_photo = (num) => {
  console.log(`cur_photo_index.value = ${cur_photo_index.value}`);
  // console.log(`/tmp/${get_array_infos()[cur_photo_index.value].photo}`)

  const id_list = Object.keys(store.infos);
  const next_i = cur_photo_index.value + num;
  if (next_i < 0 || next_i > id_list.length -1) {
    return;
  } else {
    cur_photo_index.value = next_i;
  }
  clearPhoto();
  const img = new Image();
  img.onload = () => {
    photoRef.value.getContext("2d").drawImage(img, 0, 0, img.width, img.height, 0, 0, img.width, img.height);
  }
  // img.src = `/data/${file_name}`;
  const img_url = store.infos[id_list[cur_photo_index.value]].photo_url;
  img.src = img_url;
  socketio.emit("update", { file_name: img_url })
}

const clearPhoto = () => {
  clear_array_lines();
  clear(drawRef.value);
  clear(photoRef.value)
}

// ----------------------------------------------------------------
// canvas合成
// ----------------------------------------------------------------

const getImg = (canvas) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const ctx = canvas.getContext("2d");
    img.onload = () => resolve(img);
    img.onerror = e => reject(e);
    img.src = ctx.canvas.toDataURL();
  })
}

const uploadPhoto = async () => {
  const img1 = await getImg(photoRef.value);
  const img2 = await getImg(drawRef.value);

  const ctx = concatRef.value.getContext("2d");
  ctx.drawImage(img1, 0, 0, concatRef.value.width, concatRef.value.height);
  ctx.drawImage(img2, 0, 0, concatRef.value.width, concatRef.value.height);

  const imgUrl = concatRef.value.toDataURL("image/jpeg", 0.8);
  console.log(imgUrl);

  const b64 = toBlob(imgUrl, "image/jpeg");
  const text_plain = new Blob([ props.mic_text.value ], { type:"text/plain" });

  const file_name = Date.now();
  await post_file(file_name + ".jpg", b64);
  await post_file(file_name + ".txt", text_plain);

  console.dir(get_array_infos())
  cur_photo_index.value = get_array_infos().length -1;

  // store_update();
  store_set(file_name, {
    id: file_name,
    day: new Date(Number(file_name)).toLocaleDateString(),
    h_m: new Date(Number(file_name)).toLocaleTimeString(),
    text_content: props.mic_text.value,
    photo_url: `/tmp/${file_name}.jpg`
  });


  props.mic_text.value = ""
  clear_array_lines();
  emit("upload");
}


onMounted(() => {
  drawRef.value.addEventListener("mousedown", start, false);
  drawRef.value.addEventListener("mousemove", move, false);
  drawRef.value.addEventListener("mouseup", end, false);
  drawRef.value.addEventListener("mouseleave", end, false);
  drawRef.value.addEventListener("touchstart", start, false);
  drawRef.value.addEventListener("touchmove", move, false);
  drawRef.value.addEventListener("touchend", end, false);
})

const isNotEmptyLines = computed(() => {
  return array_lines_length() !== 0;
})

defineExpose({
  takePhoto,
  // set_mode_write,
})
</script>
<template>
  <div class="drawCanvasVue">
    <div class="header">
      <div class="arrow-left" @click="() => get_i_photo(-1)"></div>
      <div style="user-select: none;">クリップ画像</div>
      <div class="arrow-right" @click="() => get_i_photo(+1)"></div>
    </div>
    <div class="canvasBox">
      <canvas ref="photoRef" class="canvasClass1" width="640" height="480"></canvas>
      <canvas ref="drawRef" class="canvasClass2" width="640" height="480"></canvas>
    </div>
    <div class="menu-btn">
      <div class="photo-btn" @click="pen_mode_toggle">
        <img v-if="mode_write" src="../assets/pen.png" class="icon-img" />
        <img v-else src="../assets/eraser.png" class="icon-img" />
      </div>
      <div :class="{ blinking: isNotEmptyLines }" class="photo-btn" @click="uploadPhoto" >
        <img src="../assets/upload.png" class="icon-img" />
      </div>
      <div class="photo-btn" @click="clearPhoto">
        <img src="../assets/trash_box.png" class="icon-img" />
      </div>
    </div>
    <canvas ref="concatRef" class="canvasClass0" width="640" height="480"></canvas>
  </div>
</template>
<style>

.notModified {
  background-color:magenta !important
}
.blinking{
	-webkit-animation:blink 1.5s ease-in-out infinite alternate;
  -moz-animation:blink 1.5s ease-in-out infinite alternate;
  animation:blink 1.5s ease-in-out infinite alternate;
}
@-webkit-keyframes blink{
  0% {background-color: #6495ed}
  100% {background-color:#45ccaa}
}
@-moz-keyframes blink{
  0% {background-color: #6495ed}
  100% {background-color:#45ccaa}
}
@keyframes blink{
  0% {background-color: #6495ed}
  100% {background-color:#45ccaa}
}

.drawCanvasVue {
  width: 50vw;
  display: flex;
  flex-direction: column;
}
/* canvas {
  width: 50vw;
} */
.canvasBox {
  position: relative;
  width: 100%;
}
.canvasClass0 {
  top: 0px;
  left: 0px;
  width: 100%;
  position: absolute;
  display: none;
}
.canvasClass1 {
  top: 0px;
  left: 0px;
  width: 100%;
  position: absolute;
  /* background-color: aqua; */
}
.canvasClass2 {
  top: 0px;
  left: 0px;
  width: 100%;
  position: absolute;
  /* background-color: blue; */
}
.arow-wrap {
  width: 90%;
  /* height: 100%; */
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  z-index: 200;
}
/* 左 */
.arrow-left {
  position: relative;
  user-select: none;
}
/* ボタン左の中身（三角を擬似要素で表現） */
.arrow-left:before {
  content: "";
  width: 30px;
  height: 30px;
  border-top: 2px solid #fefefe;
  border-left: 2px solid #fefefe;
  position: absolute;
  transform: translate(-30%, -50%)rotate(-45deg);
}
/* 右 */
.arrow-right {
  position: relative;
  user-select: none;
}
/* ボタン右の中身（三角を擬似要素で表現） */
.arrow-right:before {
  content: "";
  width: 30px;
  height: 30px;
  border-top: 2px solid #fefefe;
  border-left: 2px solid #fefefe;
  position: absolute;
  transform: translate(-70%, -50%)rotate(135deg);
}

</style>