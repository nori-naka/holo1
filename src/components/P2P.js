export default function P2P(args) {
  this.kind = args.kind;
  this.myId = args.myId;
  this.remote_id = args.remote_id;
  this.mode = args.mode;
  this.stream = args.stream;
  this.get_track = args.get_track;
  this.socketio = args.socketio;
  this.stun_server = args.stun_server;
  this.callback = args.callback;
  this.target_id = args.target_id ? args.target_id : null;
  this.peer = null;
  this.sender = null;
  this.video_rate = args.video_rate ? args.video_rate : null;
  this.signalingState = null;
  this.connectionState = null;
  this.clearId = {};
  this.err_flag = false;
  this.check_connection_period = args.check_connection_period || 10000;
  this.last_remoteTimestamp = 0;

  this.create_peer = (msg) => {
    this.peer = new RTCPeerConnection({
      iceServers: this.stun_server,
    });
    this.peer.onicecandidate = this.on_icecandidate;
    this.peer.ontrack = this.on_track;
    this.peer.oniceconnectionstatechange = this.on_iceconnectionstatechange;
    this.peer.onconnectionstatechange = this.on_connectionstatechange;
    this.peer.onsignalingstatechange = this.on_signalingstatechange;
    console.log(`PEERを作りました:${msg}`);
  };
  this.delete_peer = (msg) => {
    if (this.peer) {
      this.peer.onicecandidate = null;
      this.peer.ontrack = null;
      this.peer.oniceconnectionstatechange = null;
      this.peer.onconnectionstatechange = null;
      this.peer.onsignalingstatechange = null;
      this.peer.close();
      this.signalingState = null;
      this.connectionState = null;
    }
    this.peer = null;
    console.log(`PEERを削除しました:${msg}`);
  };
  this.close = () => {
    if (this.peer) {
      this.delete_peer();
    }
    this.signalingState = null;
    this.connectionState = null;
    this.socketio.off("publish", this.recved_msg);
    Object.keys(this.callback).forEach((cb_name) => {
      this.callback[cb_name] = null;
    });
    Object.keys(this.clearId).forEach((id) => {
      clearInterval(this.clearId[id]);
      console.log("setIntervalはクリアしたよ！");
    });
  };
  this.on_icecandidate = (ev) => {
    if (ev.candidate) {
      const msg = {
        type: "candidate",
        kind: this.kind,
        mode: this.mode,
        target_id: this.target_id,
        dest: this.remote_id,
        src: this.myId,
        candidate: ev.candidate,
      };
      console.log(`SEND:${JSON.stringify(msg)}`);
      this.socketio.emit("publish", msg);
    }
  };
  this.on_track = async (ev) => {
    console.log(
      `RTC: %cKIND = ${this.kind} / MUTE = ${ev.track.muted}`,
      "color: green;"
    );
    // if (this.kind == "audio") {
    //   this.clearId["getstats"] = setInterval(() => {
    //     this.get_stats();
    //   }, 200);
    // }
    if (this.callback.ontrack) {
      this.callback.ontrack(ev);
    }
  };
  this.on_iceconnectionstatechange = (ev) => {
    if (!this.peer) return;

    const iceState = this.peer.iceConnectionState;
    console.log(`${this.kind}.${this.myId} ICE STATE = ${iceState}`);
    switch (iceState) {
      case "new":
      case "checking":
      case "connected":
      case "completed":
        break;
      case "failed":
      case "disconnected":
      case "closed":
        break;
    }
  };
  this.on_connectionstatechange = (ev) => {
    if (!this.peer) return;

    this.connectionState = this.peer.connectionState;
    if (this.callback.con_state_emit)
      this.callback.con_state_emit({
        connectionState: this.connectionState,
      });

    console.log(
      `${this.kind}.${this.myId} CON STATE = ${this.connectionState}`
    );
    switch (this.connectionState) {
      case "new":
      case "connecting":
        break;
      case "connected":
        this.get_currentDirection();
        // 初期接続時にAudioをconnectedにするため、offerを開始して、
        // connectedになったら、trackをnullに置換する。
        if (this.kind == "audio" && this.mode == "group" && this.sender) {
          this.sender.replaceTrack(null);
        }
        break;
      case "disconnected":
      // break;
      // falls through
      case "failed":
        console.log("★★★★★★★★★★★ CONNECTION FAILED ★★★★★★★★★★★★★★★");
        if (this.callback.on_failed) this.callback.on_failed();
        break;
      case "closed":
        break;
    }
  };
  this.on_signalingstatechange = (ev) => {
    if (!this.peer) return;

    this.signalingState = this.peer.signalingState;
    if (this.callback.sig_state_emit)
      this.callback.sig_state_emit({
        signalingState: this.signalingState,
      });

    console.log(`${this.kind}.${this.myId} SIG STATE = ${this.signalingState}`);
    switch (this.signalingState) {
      case "stable":
        this.get_currentDirection();
        break;
      case "have-local-offer":
      case "have-remote-offer":
      case "have-local-pranswer":
      case "have-remote-pranswer":
        break;
    }
  };

  this.get_currentDirection = () => {
    this.peer.getTransceivers().forEach((tr) => {
      if (tr.sender && tr.sender.track) {
        console.log(
          `RTC: %cKIND = ${this.kind}.${this.myId} / CUR_DIRECTION = ${tr.currentDirection}`,
          "color: red;"
        );
      }
    });
  };
  this.get_stats = async (res_stats) => {
    if (!this.peer) return;

    let _stats;
    for (let recv of this.peer.getReceivers()) {
      _stats = await recv.getStats();
      _stats.forEach((report) => {
        const _type = report.type.replace(/-/g, "_");
        res_stats[_type] = { ...report };
      });
    }

    // 音声レベル
    if (res_stats.track && res_stats.track.audioLevel) {
      console.log(res_stats.track.audioLevel);
    }

    return _stats;
  };
  this.change_stream = (stream) => {
    this.stream = stream;
  };
  this.change_rate = (rate) => {
    this.sender = this.get_sender();
    if (this.sender && rate) {
      const params = this.sender.getParameters();
      if (params && params.encodings && params.encodings[0]) {
        params.encodings[0].maxBitrate = rate;
        this.sender.setParameters(params);
      }
    }
  };

  this.start_offer = async (direction) => {
    try {
      // peerが無い場合には作成する。
      // 既にpeerが存在する場合には、directionを更新し、送信側trackの更新のみ行う。
      console.log(
        `RTC: %c${this.kind}.${this.myId} / DIR=${direction} / ${this.signalingState} START_OFFER`,
        "color: orange;"
      );
      if (this.signalingState != null && this.signalingState != "stable")
        return;

      const track = this.get_track ? this.get_track() : this.stream.getTracks()[0];
      let first_times = false;

      if (this.peer) {
        const [tr] = this.peer.getTransceivers();
        if (tr) {
          tr.direction = direction;
          tr.sender.replaceTrack(track);
        } else {
          console.log("trが無いよ");
        }
      } else {
        first_times = true;
        this.create_peer("こちらはOFFERだよ");
        if (direction == "recvonly") {
          this.peer.addTransceiver(this.kind, { direction: "recvonly" });
          // 受信のみの場合、何もしない方が良いらしい
        } else {
          // 自分が送信する場合(sendonly, sendrecv)
          if (direction == "sendonly") {
            console.log("★★★★★★★★★  START_OFFER ADDTRANSCEIVER  ★★★★★★★★★★★★★");
            const tr = this.peer.addTransceiver(track, {
              streams: [this.stream],
              direction: "sendonly",
            });
            this.sender = tr.sender;
          } else if (direction == "sendrecv") {
            this.sender = this.peer.addTrack(track, this.stream);
          }
        }
      }
      // 対象peerに対して、offer作成、local側SDP登録、local側SDPの送信を実施
      const offer = await this.peer.createOffer();
      await this.peer.setLocalDescription(offer);

      //送信速度変更
      if (direction == "sendonly" || direction == "sendrecv")
        this.change_rate(this.video_rate);

      const send_msg = {
        type: "offer",
        kind: this.kind,
        mode: this.mode,
        target_id: this.target_id,
        dest: this.remote_id,
        src: this.myId,
        sdp: this.peer.localDescription,
        first_times: first_times,
      };
      // console.log(`SEND:${JSON.stringify(send_msg)}`);
      console.log(`start_offer: first_times: ${send_msg.first_times}`);
      this.socketio.emit("publish", send_msg);
    } catch (err) {
      console.log("★★★★★★★★★  START_OFFER ERROR  ★★★★★★★★★★★★★");
      console.log(err);
      // if (this.callback.on_failed) this.callback.on_failed();
      this.err_flag = true;
      this.delete_peer(); // peerを廃棄する。
    }
  };

  this.recv_offer = async (msg) => {
    try {
      console.log(
        `RTC: %c${msg.kind}.${msg.target_id} / ${this.signalingState} RECV_OFFER`,
        "color: orange;"
      );
      const track = this.get_track ? this.get_track() : this.stream.getTracks()[0];

      console.log(`recv_offer: first_times: ${msg.first_times}`);
      if (!this.peer || msg.first_times) {
        this.create_peer("こちらはANSWERだよ");
        this.peer.addTrack(track, this.stream);
      } else {
        const [sender] = this.peer.getSenders();
        if (sender) {
          sender.replaceTrack(track);
        } else {
          this.peer.addTrack(track, this.stream);
        }
      }

      await this.peer.setRemoteDescription(msg.sdp);
      const answer = await this.peer.createAnswer();
      await this.peer.setLocalDescription(answer);

      //送信速度変更
      this.change_rate(this.video_rate);

      const send_msg = {
        type: "answer",
        kind: msg.kind,
        mode: this.mode,
        target_id: msg.target_id,
        dest: this.remote_id,
        src: this.myId,
        sdp: this.peer.localDescription,
      };
      console.log(
        `RTC: %c${msg.kind}.${msg.target_id} RECV_OFFER`,
        "color: green;"
      );
      this.socketio.emit("publish", send_msg);
    } catch (err) {
      console.log(`${Date.now()}: ${err}`);
      // if (this.callback.on_failed) this.callback.on_failed();
      this.err_flag = true;
      this.delete_peer(); // peerを廃棄する。
    }
  };

  this.get_sender = () => {
    if (!this.sender && this.peer) {
      const [tr] = this.peer.getTransceivers();
      this.sender = tr && tr.sender;
    }
    return this.sender;
  };

  this.recv_answer = async (msg) => {
    console.log(
      `RTC: %c${msg.kind}.${msg.target_id} / RECV_ANSWER`,
      "color: green;"
    );
    try {
      await this.peer.setRemoteDescription(msg.sdp);
      if (this.kind == "audio" && this.mode == "group" && this.sender) {
        console.log("OFFにしたよー");
        this.sender.replaceTrack(null);
      }
    } catch (err) {
      console.log(`${Date.now()}: ${err}`);
      if (this.callback.on_failed) this.callback.on_failed();
      this.err_flag = true;
      this.delete_peer(); // peerを廃棄する。
    }
  };
  this.recv_candidate = async (msg) => {
    console.log(
      `RTC: %c${msg.kind}.${msg.target_id} / RECV_CANDIDATE`,
      "color: green;"
    );
    if (this.peer) {
      await this.peer.addIceCandidate(msg.candidate);
    }
  };

  this.recv_reconnect = () => {
    console.log("再接続要求されました！");
    this.err_flag = false;
    this.delete_peer();
    const msg = {
      type: "reconnect-aggree",
      kind: this.kind,
      mode: this.mode,
      target_id: this.target_id,
      dest: this.remote_id,
      src: this.myId,
    };
    console.log(`SEND:${JSON.stringify(msg)}`);
    this.socketio.emit("publish", msg);
  };

  this.recv_aggree = () => {
    console.log("再接続要求受理されたので再接続します！");
    this.err_flag = false;
    this.delete_peer();
    setTimeout(() => {
      this.sv_start();
    }, 1000);
  };

  // recved_msgで処理されるモノははWebRTC規格のメッセージのみ
  // candidate、offer、answer以外は処理されない。
  this.recved_msg = (msg) => {
    console.log(
      `RTC: %c${msg.kind}.${msg.target_id} TYPE=${msg.type} SIGSTATE=${this.signalingState}`,
      "color: gray;"
    );

    if (
      msg.dest == this.myId &&
      msg.src == this.remote_id &&
      msg.mode == this.mode &&
      msg.kind == this.kind &&
      msg.target_id == this.target_id
    ) {
      if (msg.type == "candidate") {
        this.recv_candidate(msg);
      } else if (msg.type == "offer") {
        this.recv_offer(msg);
      } else if (msg.type == "answer") {
        this.recv_answer(msg);
      } else if (msg.type == "reconnect") {
        this.recv_reconnect();
      } else if (msg.type == "reconnect-aggree") {
        this.recv_aggree();
      }
    }
  };
  this.socketio.on("publish", this.recved_msg);
  this.start = () => {
    if (this.mode == "group") {
      if (this.kind == "video") {
        this.start_offer("recvonly");
      } else {
        this.start_offer("sendonly");
      }
    } else {
      this.start_offer("sendrecv");
    }
  };
  this.sv_start = () => {
    this.delete_peer();
    this.start();
    setTimeout(() => {
      if (this.connectionState != "connected" || this.err_flag == true) {
        const msg = {
          type: "reconnect",
          kind: this.kind,
          mode: this.mode,
          target_id: this.target_id,
          dest: this.remote_id,
          src: this.myId,
        };
        console.log(`SEND:${JSON.stringify(msg)}`);
        console.log("再接続要求しまーす");
        this.socketio.emit("publish", msg);
      }
    }, this.check_connection_period);
  };
  this.stop = () => {
    if (this.connectionState == "connected") {
      this.start_offer("inactive");
    }
  };
}
