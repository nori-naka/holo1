import { computed, ref } from "vue";

export const useDraw = (drawRef) => {

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
  const mode_write = ref(true); // true=ペン/false=消しゴム

  let at_erase = false;
  let at_line = false;
  let at_move = false;

  let page = 1;
  const array_lines = ref([]);
  const array_lines_length = () => { return array_lines.value.length };

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

  const clear_array_lines = () => {
    array_lines.value = [];
  }

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
    if (!mode_move && !mode_write.value) {
      // if (at_erase) {
      // erase処理でarray_lines上より、対象lineを削除後、一旦、白紙化して、再描画する。
      at_erase = true;
      p.at_erase = true;
      erase(array_lines.value, ajust(p));
      clear(drawRef.value);
      draw(array_lines.value);
    } else if (!mode_move && mode_write.value) {
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

    if (!mode_move && !mode_write.value) {
      if (at_erase) {
        p.at_erase = true;
        erase(array_lines.value, ajust(p));
        clear(drawRef.value);
        draw(array_lines.value);
      }
    } else if (!mode_move && mode_write.value) {
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
    mode_write.value = !mode_write.value;
  }

  return {
    array_lines_length,
    clear_array_lines,
    clear,
    start,
    move,
    end,
    pen_mode_toggle,
    mode_write
  }
}
