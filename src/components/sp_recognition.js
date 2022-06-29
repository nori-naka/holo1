const SpeechRecognition =
  window.webkitSpeechRecognition || window.SpeechRecognition;
let recognition = null;

const sp_start = ({ speech_text, before, next, end, error }) => {
  if (before) before();
  recognition = new SpeechRecognition();
  recognition.lang = "ja-JP";
  // recognition.interimResults = true;
  recognition.continuous = true;

  if (speech_text != "") speech_text = speech_text + "\n";

  let result_text = "";
  recognition.onresult = (ev) => {
    for (let i = ev.resultIndex; i < ev.results.length; i++) {
      let transcript = ev.results[i][0].transcript;
      if (ev.results[i].isFinal) {
        result_text = transcript;
      }
    }
    speech_text += `${result_text}\n`;
    console.log(speech_text);
    if (next) next(speech_text);
  };
  recognition.onerror = () => {
    if (error) error();
  }
  recognition.onend = () => {
    if (end) end();
    recognition = null;
  };
  recognition.start();
};

const sp_stop = ({ next }) => {
  recognition.stop();
  if (next) next();
};

export { sp_start, sp_stop };
