<script setup>
import { inject, onMounted, ref, computed, defineEmits } from "vue";

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

const takePhoto = async track => {
  const imgCap = new ImageCapture(track);
  const imgBitmap = await imgCap.grabFrame();
  photoRef.value.getContext("2d").drawImage(imgBitmap,
    0, 0, imgBitmap.width, imgBitmap.height,
    0, 0, photoRef.value.width, photoRef.value.height);
  clear(drawRef.value);
}

const toBlob = async (base64, myType) => {
  // Base64からバイナリへ変換
  const bin = atob(base64.replace(/^.*,/, ""));
  const buffer = new Uint8Array(bin.length);
  for (var i = 0; i < bin.length; i++) {
    buffer[i] = bin.charCodeAt(i);
  }
  // Blobを作成
  const b64 = new Blob([buffer.buffer], { type: myType });
  // return b64;
  const { file_name, year_day, hour_min } = gen_file_name();
  await post_file(file_name + ".jpg", b64);

  // array_photos.push(file_name + ".jpg");
  // cur_photo_index.value = array_photos.length -1;

  // 追加部分
  const text_plain = new Blob([ props.mic_text.value ], { type:"text/plain" });
  await post_file(file_name + ".txt", text_plain);

  set_array_infos({
    year_day: year_day,
    hour_min: hour_min,
    photo: file_name + ".jpg",
    text: props.mic_text.value
  })
  console.dir(get_array_infos())
  cur_photo_index.value = get_array_infos().length -1;

  props.mic_text.value = ""
}

const gen_file_name = () => {
  const _d = new Date().toLocaleString().split(/\/|:|\s/gi);
  const cur_date = `${_d[0]}年${_d[1]}月${_d[2]}日${_d[3]}時${_d[4]}分${_d[5]}秒`;
  const year_day = `${_d[0]}年${_d[1]}月${_d[2]}日`;
  const hour_min = `${_d[3]}時${_d[4]}分`
  return {
    file_name: encodeURI(cur_date),
    year_day: year_day,
    hour_min: hour_min
  }
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
      console.log(`成功:${response}`);
      if (/.+\.jpg/.test(file_name)) {
        socketio.emit("update", { file_name: file_name })
      }
    } else {
      console.log(`失敗:${response}`);
    }
  })
  .catch(error => console.log(error.message));
}

const get_i_photo = (num) => {
  console.log(`cur_photo_index.value = ${cur_photo_index.value}`);
  console.log(`/tmp/${get_array_infos()[cur_photo_index.value].photo}`)

  const next_i = cur_photo_index.value + num;

  if (next_i < 0 || next_i > get_array_infos().length -1) {
    return;
  } else {
    cur_photo_index.value = next_i;
  }
  clearPhoto();
  const img = new Image();
  img.onload = () => {
    photoRef.value.getContext("2d").drawImage(img, 0, 0, img.width, img.height, 0, 0, img.width, img.height);
  }
  const file_name = get_array_infos()[cur_photo_index.value].photo
  // img.src = `/data/${file_name}`;
  img.src = `/tmp/${file_name}`;
  socketio.emit("update", { file_name: file_name })
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
  const blob = toBlob(imgUrl, "image/jpeg");
  array_lines.value = [];
  emit("upload");
}

const clearPhoto = () => {
  array_lines.value = [];
  clear(drawRef.value);
  clear(photoRef.value)
}
// ----------------------------------------------------------------
// array_lines: [line0, line1, line2, ....];
// line       : [point0, point1, point2, ...];
// point0     : { at_start: UUID, page: page番号,
//                color: 16進色番号, size: ペン幅px, x: x座標, y: y座標, w: 描画領域幅, h: 描画領域縦};
// point1..N  : { color: 16進色番号, size: ペン幅px, x: x座標, y: y座標, w: 描画領域幅, h: 描画領域縦};
// remote_array_lines: { リモートID1: array_lines, リモートID2: array_lines, ...};
//
// lineの先頭にあるpoint情報には、pageとして、page番号を持つ。
// lineの先頭にあるpoint情報には、at_startとして、UUIDによる識別子を持つ。
// line削除では、カーソル座標とlineの各pointの距離算出を行い、10px以下を「hit」として、
// そのline[0].at_startを拾い、削除対象とする。
// ----------------------------------------------------------------

const drawLineSize = ref(5)
const lineSizeTicks = ref([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
const drawLineColor = ref("#F44E3B")
let mode_move = false; // true=移動/false=非移動
let mode_write = true; // true=ペン/false=消しゴム

let at_erase = false;
let at_line = false;
let at_move = false;

let page = 1;
const array_lines = ref([]);

const pos_style = ref({
  top: "0px",
  left: "0px",
});
const last_p = ref(null);

const _uuidv4 = () => {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    var r = (Math.random() * 16) | 0,
      v = c == "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

const isTouch = (ev) => {
  // return "ontouchstart" in window.document;
  return (
    ev.type == "touchstart" ||
    ev.type == "touchmove" ||
    ev.type == "touchend"
  );
};

const getPoint = (ev) => {
  let x, y;
  if (isTouch(ev)) {
    x = ev.touches[0].pageX;
    y = ev.touches[0].pageY;
  } else {
    x = ev.pageX;
    y = ev.pageY;
  }
  // 要素（canvas）の画面上の位置を取得する。
  const elm_BCRect = drawRef.value.getBoundingClientRect();
  // 画面自体の絶対位置(window.pageYOffset)を加算して要素の絶対位置を算出
  const elRect = {
    left: elm_BCRect.left + window.pageXOffset,
    top: elm_BCRect.top + window.pageYOffset,
  };
  const rate_w = ev.target.width / ev.target.clientWidth;
  const rate_h = ev.target.height / ev.target.clientHeight;
  return {
    x: (x - elRect.left) * rate_w ,
    y: (y - elRect.top) * rate_h ,
    w: ev.target.width,
    h: ev.target.height,
    color: drawLineColor.value,
    size: drawLineSize.value,
  };
};
const getPos = (ev) => {
  let x, y;
  if (isTouch(ev)) {
    x = ev.touches[0].pageX;
    y = ev.touches[0].pageY;
  } else {
    x = ev.pageX;
    y = ev.pageY;
  }
  return {
    x: x,
    y: y,
  };
};


const clear = (canvas) => {
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height); // Clears the canvas
};
const draw = (array_lines) => {
  // clear();

  const ctx = drawRef.value.getContext("2d");
  array_lines.forEach((line) => {
    // 現在のページ番号でなければ抜ける。
    if (line[0].page != page) return;

    ctx.beginPath();
    ctx.strokeStyle = line[0].color;
    ctx.lineJoin = ctx.lineCap = "round";
    ctx.lineWidth = line[0].size;
    for (let i = 0; i < line.length - 1; i++) {
      let p1 = ajust(line[i]);
      let p2 = ajust(line[i + 1]);
      // let p3 = ajust(line[i + 2]);
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      // ctx.quadraticCurveTo(p2.x, p2.y, p3.x, p3.y);
    }
    ctx.stroke();
  });
};


// 保存された際のdrawRef.value.width、heightから、現状のdrawRef.value.width、heightに合わせて正規化されたpointにする。
const ajust = (p) => {
  return {
    x: p.x * (drawRef.value.width / p.w),
    y: p.y * (drawRef.value.height / p.h),
  };
};
const erase_hit = (line, p) => {
  let hit = false;
  line.forEach((line_p) => {
    const point = ajust(line_p);
    const dx = point.x - p.x;
    const dy = point.y - p.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance < 10) {
      hit = true;
    }
  });
  return hit;
};
// 自端末でのerase時にhitが発生した場合、その際のpoint（これはカーソル座標）に
// p.erase_idとして、対象lineのline[0].at_start識別子を与えて、send_pointで
// リモート端末に送信し、削除を依頼する。
const erase = (array_lines, p) => {
  array_lines.forEach((line, index) => {
    // 現在のページ番号でなければ抜ける。
    if (line[0].page != page) return;

    const judge = erase_hit(line, p);
    if (judge) {
      p.erase_id = line[0].at_start;
      // this.send_point(p);
      array_lines.splice(index, 1);
      return;
    }
  });
};

const start = (ev) => {
  ev.preventDefault();
  const p = getPoint(ev);
  console.log(JSON.stringify(p));
  // if (this.mode_pen == "erase") {
  if (!mode_move && !mode_write) {
    // if (at_erase) {
    // erase処理でarray_lines上より、対象lineを削除後、一旦、白紙化して、再描画する。
    at_erase = true;
    p.at_erase = true;
    erase(array_lines.value, ajust(p));
    clear(drawRef.value);
    draw(array_lines.value);
  } else if (!mode_move && mode_write) {
    // } else {
    p.at_start = _uuidv4();
    p.page = page;
    at_line = true;
    array_lines.value.push([p]);
  } else if (mode_move) {
    at_move = true;
    last_p.value = getPos(ev);
  }
};

const move = (ev) => {
  ev.preventDefault();
  const p = getPoint(ev); // pは表示版位置
  // if (this.mode_pen == "erase") {
  // console.log(JSON.stringify(p));
  // console.log(JSON.stringify(array_lines.value));

  if (!mode_move && !mode_write) {
    if (at_erase) {
      p.at_erase = true;
      erase(array_lines.value, ajust(p));
      clear(drawRef.value);
      draw(array_lines.value);
    }
  } else if (!mode_move && mode_write) {
    if (at_line) {
      p.at_line = true;
      array_lines.value[array_lines.value.length - 1].push(p);

      clear(drawRef.value);
      draw(array_lines.value);
    }
  } else if (mode_move) {
    if (at_move) {
      const pos = getPos(ev);
      console.log(`pos.x=${pos.x} pos.y=${pos.y}`);
      pos_style.value.top =
        parseInt(pos_style.value.top) + (pos.y - last_p.value.y) + "px";
      pos_style.value.left =
        parseInt(pos_style.value.left) + (pos.x - last_p.value.x) + "px";
      last_p.value = pos;
    }
  }
};
const end = (ev) => {
  ev.preventDefault();
  at_line = false;
  at_erase = false;
  at_move = false;
  last_p.value = null;
};


const pen_mode_toggle = () => {
  mode_write = !mode_write;
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
  const empty = array_lines.value.length === 0;
  return !empty;
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