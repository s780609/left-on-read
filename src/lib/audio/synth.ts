export function playPop(ctx: AudioContext, gain: GainNode) {
  const bufferSize = ctx.sampleRate * 0.06;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.15));
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 800;
  filter.Q.value = 1;

  source.connect(filter);
  filter.connect(gain);
  source.start();
}

export function playDing(ctx: AudioContext, gain: GainNode) {
  const osc = ctx.createOscillator();
  const envGain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = 880;
  envGain.gain.setValueAtTime(0.3, ctx.currentTime);
  envGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
  osc.connect(envGain);
  envGain.connect(gain);
  osc.start();
  osc.stop(ctx.currentTime + 0.3);
}

export function playChime(ctx: AudioContext, gain: GainNode) {
  const notes = [1047, 1319]; // C6, E6
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const envGain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    const startTime = ctx.currentTime + i * 0.12;
    envGain.gain.setValueAtTime(0.25, startTime);
    envGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.4);
    osc.connect(envGain);
    envGain.connect(gain);
    osc.start(startTime);
    osc.stop(startTime + 0.4);
  });
}

export function playWhoosh(ctx: AudioContext, gain: GainNode) {
  const bufferSize = ctx.sampleRate * 0.3;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    const t = i / bufferSize;
    data[i] = (Math.random() * 2 - 1) * Math.sin(t * Math.PI) * 0.3;
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(2000, ctx.currentTime);
  filter.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.3);
  filter.Q.value = 2;

  source.connect(filter);
  filter.connect(gain);
  source.start();
}

export function playSuccess(ctx: AudioContext, gain: GainNode) {
  const notes = [523, 659, 784]; // C5, E5, G5
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const envGain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    const startTime = ctx.currentTime + i * 0.1;
    envGain.gain.setValueAtTime(0.2, startTime);
    envGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.3);
    osc.connect(envGain);
    envGain.connect(gain);
    osc.start(startTime);
    osc.stop(startTime + 0.3);
  });
}

export function playBubble(ctx: AudioContext, gain: GainNode) {
  const osc = ctx.createOscillator();
  const envGain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(600, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.08);
  osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.15);
  envGain.gain.setValueAtTime(0.25, ctx.currentTime);
  envGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
  osc.connect(envGain);
  envGain.connect(gain);
  osc.start();
  osc.stop(ctx.currentTime + 0.15);
}

export function playWrong(ctx: AudioContext, gain: GainNode) {
  const osc = ctx.createOscillator();
  const envGain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = 220;
  envGain.gain.setValueAtTime(0.15, ctx.currentTime);
  envGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
  osc.connect(envGain);
  envGain.connect(gain);
  osc.start();
  osc.stop(ctx.currentTime + 0.2);
}

export function playSand(ctx: AudioContext, gain: GainNode) {
  const bufferSize = Math.floor(ctx.sampleRate * 0.12);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    const t = i / bufferSize;
    data[i] = (Math.random() * 2 - 1) * Math.sin(t * Math.PI) * 0.18;
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 900;
  filter.Q.value = 0.7;

  source.connect(filter);
  filter.connect(gain);
  source.start();
}

// ---------- 節奏遊戲：依 AudioContext 時間預先排程（包絡以 when 為基準） ----------

/** 旋律音：triangle + 高八度 sine（0.3 倍音量） */
export function scheduleTone(
  ctx: AudioContext,
  dest: AudioNode,
  freq: number,
  when: number,
  duration: number,
  vol = 0.18
) {
  const env = ctx.createGain();
  const releaseAt = Math.max(when + 0.02, when + duration - 0.06);
  env.gain.setValueAtTime(0.0001, when);
  env.gain.linearRampToValueAtTime(vol, when + 0.01);
  env.gain.exponentialRampToValueAtTime(vol * 0.6, Math.min(releaseAt, when + 0.15));
  env.gain.setValueAtTime(vol * 0.6, releaseAt);
  env.gain.exponentialRampToValueAtTime(0.0001, when + duration + 0.08);
  env.connect(dest);

  const osc = ctx.createOscillator();
  osc.type = "triangle";
  osc.frequency.value = freq;
  osc.connect(env);

  const upper = ctx.createOscillator();
  const upperGain = ctx.createGain();
  upper.type = "sine";
  upper.frequency.value = freq * 2;
  upperGain.gain.value = 0.3;
  upper.connect(upperGain);
  upperGain.connect(env);

  const stopAt = when + duration + 0.1;
  osc.start(when);
  upper.start(when);
  osc.stop(stopAt);
  upper.stop(stopAt);
}

/** 大鼓：sine 150→50Hz */
export function scheduleKick(ctx: AudioContext, dest: AudioNode, when: number, vol = 0.35) {
  const osc = ctx.createOscillator();
  const env = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(150, when);
  osc.frequency.exponentialRampToValueAtTime(50, when + 0.12);
  env.gain.setValueAtTime(vol, when);
  env.gain.exponentialRampToValueAtTime(0.001, when + 0.18);
  osc.connect(env);
  env.connect(dest);
  osc.start(when);
  osc.stop(when + 0.2);
}

/** 小鈸：雜訊 + highpass，0.05 秒 */
export function scheduleHat(ctx: AudioContext, dest: AudioNode, when: number, vol = 0.12) {
  const bufferSize = Math.floor(ctx.sampleRate * 0.05);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.value = 7000;
  const env = ctx.createGain();
  env.gain.value = vol;
  source.connect(filter);
  filter.connect(env);
  env.connect(dest);
  source.start(when);
}

/** 倒數木魚：high = 最後一下（開始！） */
export function scheduleWoodblock(ctx: AudioContext, dest: AudioNode, when: number, high: boolean) {
  const osc = ctx.createOscillator();
  const env = ctx.createGain();
  osc.type = "square";
  osc.frequency.value = high ? 1320 : 880;
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = high ? 1320 : 880;
  filter.Q.value = 4;
  env.gain.setValueAtTime(0.35, when);
  env.gain.exponentialRampToValueAtTime(0.001, when + 0.08);
  osc.connect(filter);
  filter.connect(env);
  env.connect(dest);
  osc.start(when);
  osc.stop(when + 0.1);
}

/** 命中時的短促 tick（不帶音高） */
export function playTick(ctx: AudioContext, gain: GainNode) {
  const bufferSize = Math.floor(ctx.sampleRate * 0.025);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.12));
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 3000;
  filter.Q.value = 0.8;
  const env = ctx.createGain();
  env.gain.value = 0.5;
  source.connect(filter);
  filter.connect(env);
  env.connect(gain);
  source.start();
}
