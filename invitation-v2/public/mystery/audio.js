(function () {
  'use strict';

  // This file owns the game's only AudioContext. It never opens one on page load.
  var script = document.currentScript;
  var assetRoot = new URL('audio/', script && script.src ? script.src : location.href).href;
  var AudioCtor = window.AudioContext || window.webkitAudioContext;
  var scenes = {act1:'act1.wav', act2:'act2.wav', act3:'act3.wav', resolution:'resolution.wav'};
  var context = null;
  var master = null;
  var musicBus = null;
  var effectsBus = null;
  var ambienceBus = null;
  var destroyed = false;
  var unlocked = false;
  var musicEnabled = false;
  var effectsEnabled = false;
  var ambienceEnabled = false;
  var narrating = false;
  var volume = 0.45;
  var paused = false;
  var hostHidden = false;
  var pageHidden = false;
  var scene = 'act1';
  var active = null;
  var outgoing = null;
  var loading = null;
  var failedScene = '';
  var rain = null;
  var voices = [];
  var cueTimes = {};
  var suspendTimer = null;
  var epoch = null;
  var lastError = '';
  var lastStatus = '';

  function blocked() { return paused || document.hidden || hostHidden || pageHidden || destroyed; }
  function requested() { return musicEnabled || effectsEnabled || ambienceEnabled; }
  function canPlayMusic() { return context && context.state === 'running' && unlocked && musicEnabled && !blocked(); }
  function getStatus() {
    return {
      available:!!AudioCtor && !destroyed,
      unlocked:unlocked && !destroyed,
      musicEnabled:musicEnabled,
      effectsEnabled:effectsEnabled,
      ambienceEnabled:ambienceEnabled,
      narrating:narrating,
      volume:volume,
      paused:paused,
      hidden:!!(document.hidden || hostHidden || pageHidden),
      hostHidden:hostHidden,
      playing:!!(active && canPlayMusic()),
      loading:!!loading,
      contextState:destroyed ? 'closed' : (context ? context.state : 'not-started'),
      error:lastError
    };
  }
  function status() {
    var detail = getStatus();
    var signature = JSON.stringify(detail);
    if (signature === lastStatus) return;
    lastStatus = signature;
    var event;
    if (typeof window.CustomEvent === 'function') event = new CustomEvent('varsha-sound-status', {detail:detail});
    else { event = document.createEvent('CustomEvent'); event.initCustomEvent('varsha-sound-status', false, false, detail); }
    window.dispatchEvent(event);
  }
  function ramp(node, value, seconds) {
    if (!context || !node) return;
    var now = context.currentTime;
    node.gain.cancelScheduledValues(now);
    node.gain.setValueAtTime(node.gain.value, now);
    node.gain.linearRampToValueAtTime(value, now + seconds);
  }
  function cancelSuspend() {
    if (suspendTimer !== null) { clearTimeout(suspendTimer); suspendTimer = null; }
  }
  function suspendSoon() {
    cancelSuspend();
    if (!context || context.state !== 'running') return;
    ramp(master, 0, 0.07);
    suspendTimer = setTimeout(function () {
      suspendTimer = null;
      if (context && context.state === 'running' && (blocked() || !requested())) {
        if (!musicEnabled) { disposeTrack(active); disposeTrack(outgoing); }
        if (!ambienceEnabled) stopRain(true);
        stopVoices();
        context.suspend().then(status, function () { status(); });
      }
    }, 110);
  }
  function makeContext() {
    if (context || destroyed || !AudioCtor) return !!context;
    try {
      context = new AudioCtor();
      master = context.createGain();
      musicBus = context.createGain();
      effectsBus = context.createGain();
      ambienceBus = context.createGain();
      master.gain.value = 0;
      musicBus.gain.value = narrating ? 0.137 : 0.76;
      effectsBus.gain.value = 0.9;
      ambienceBus.gain.value = narrating ? 0.022 : 0.12;
      musicBus.connect(master);
      effectsBus.connect(master);
      ambienceBus.connect(master);
      // Conservative source levels plus a final soft limiter protect combined cues.
      var limiter = context.createDynamicsCompressor();
      limiter.threshold.value = -12;
      limiter.knee.value = 18;
      limiter.ratio.value = 3;
      limiter.attack.value = 0.015;
      limiter.release.value = 0.25;
      master.connect(limiter);
      limiter.connect(context.destination);
      context.onstatechange = status;
      return true;
    } catch (error) {
      if (context) { try { var closing = context.close(); if (closing && closing.catch) closing.catch(function () {}); } catch (ignore) {} }
      context = null;
      AudioCtor = null;
      lastError = 'Sound is unavailable in this browser.';
      status();
      return false;
    }
  }
  function resumeKnownContext() {
    if (!context || !unlocked || blocked() || !requested()) { sync(); return; }
    cancelSuspend();
    // Resuming never creates a context, and is guarded independently for every host.
    var promise;
    try { promise = context.resume(); }
    catch (error) { lastError = 'Tap a sound control to resume audio.'; status(); return; }
    Promise.resolve(promise).then(function () { if (!destroyed) sync(); }, function () {
      lastError = 'Tap a sound control to resume audio.';
      status();
    });
  }
  function unlock() {
    if (destroyed) return Promise.resolve(false);
    if (!AudioCtor || !makeContext()) {
      lastError = 'Sound is unavailable in this browser.';
      status();
      return Promise.resolve(false);
    }
    if (blocked()) { sync(); return Promise.resolve(false); }
    cancelSuspend();
    failedScene = '';
    lastError = '';
    var resume;
    // Intentionally called before returning: browser gesture activation must survive.
    try { resume = context.resume(); }
    catch (error) { lastError = 'Audio is blocked. Tap a sound control to retry.'; status(); return Promise.resolve(false); }
    return Promise.resolve(resume).then(function () {
      if (destroyed) return false;
      if (context.state !== 'running') {
        lastError = 'Audio is blocked. Tap a sound control to retry.';
        status();
        return false;
      }
      unlocked = true;
      sync();
      return true;
    }, function () {
      lastError = 'Audio is blocked. Tap a sound control to retry.';
      status();
      return false;
    });
  }
  function disposeTrack(track) {
    if (!track) return;
    track.source.onended = null;
    try { track.source.stop(); } catch (ignore) {}
    track.source.disconnect();
    track.gain.disconnect();
    if (active === track) active = null;
    if (outgoing === track) outgoing = null;
  }
  function fadeTrack(track, seconds) {
    if (!track) return;
    ramp(track.gain, 0, seconds);
    try { track.source.stop(context.currentTime + seconds + 0.04); } catch (ignore) {}
  }
  function abortLoad() {
    if (!loading) return;
    loading.cancelled = true;
    if (loading.controller) loading.controller.abort();
  }
  function stopMusic() {
    abortLoad();
    if (!context || context.state !== 'running' || blocked()) {
      disposeTrack(active); disposeTrack(outgoing);
      return;
    }
    if (outgoing) disposeTrack(outgoing);
    if (active) {
      outgoing = active;
      active = null;
      fadeTrack(outgoing, 0.35);
    }
  }
  function startTrack(buffer, key) {
    if (!canPlayMusic() || scene !== key) return;
    if (outgoing) disposeTrack(outgoing);
    var source = context.createBufferSource();
    var gain = context.createGain();
    var start = context.currentTime + 0.015;
    if (epoch === null) epoch = start;
    source.buffer = buffer;
    source.loop = true;
    source.loopStart = 0;
    source.loopEnd = buffer.duration;
    gain.gain.value = 0;
    source.connect(gain);
    gain.connect(musicBus);
    var track = {source:source, gain:gain, scene:key};
    source.onended = function () { disposeTrack(track); status(); };
    if (active) { outgoing = active; fadeTrack(outgoing, 2.0); }
    active = track;
    source.start(start, ((start - epoch) % buffer.duration + buffer.duration) % buffer.duration);
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(1, start + 2.0);
    lastError = '';
    status();
  }
  function requestMusic() {
    if (!canPlayMusic() || (active && active.scene === scene) || failedScene === scene) return;
    if (loading) {
      if (loading.scene !== scene) abortLoad();
      return;
    }
    // Drop a fading predecessor before decoding another buffer: at most two tracks.
    if (outgoing) disposeTrack(outgoing);
    var load = {scene:scene, context:context, cancelled:false, controller:typeof AbortController === 'function' ? new AbortController() : null};
    loading = load;
    status();
    var options = {cache:'force-cache'};
    if (load.controller) options.signal = load.controller.signal;
    fetch(new URL(scenes[load.scene], assetRoot).href, options).then(function (response) {
      if (!response.ok) throw new Error('asset');
      return response.arrayBuffer();
    }).then(function (bytes) {
      if (load.cancelled || destroyed || scene !== load.scene) throw new Error('cancelled');
      // Callback form also supports older TV implementations of decodeAudioData.
      return new Promise(function (resolve, reject) { load.context.decodeAudioData(bytes, resolve, reject); });
    }).then(function (buffer) {
      if (loading !== load) return;
      loading = null;
      if (!load.cancelled && !destroyed && scene === load.scene && canPlayMusic()) startTrack(buffer, load.scene);
      status();
      if (!destroyed && canPlayMusic() && (!active || active.scene !== scene)) requestMusic();
    }, function () {
      if (loading !== load) return;
      loading = null;
      if (!load.cancelled && !destroyed && scene === load.scene) {
        failedScene = load.scene;
        lastError = 'The music could not be loaded. Turn music off and on to retry.';
      }
      status();
      if (!destroyed && canPlayMusic() && failedScene !== scene && (!active || active.scene !== scene)) requestMusic();
    });
  }
  function makeRain() {
    if (!context || rain || blocked()) return;
    var count = Math.round(context.sampleRate * 4);
    var tail = Math.round(context.sampleRate * 0.25);
    var noise = new Float32Array(count + tail);
    var seed = 18371;
    var low = 0;
    var high = 0;
    for (var i = 0; i < noise.length; i++) {
      seed = (seed * 16807) % 2147483647;
      var white = (seed / 2147483647) * 2 - 1;
      low = low * 0.96 + white * 0.04;
      high = high * 0.68 + white * 0.32;
      noise[i] = (high - low) * 0.6;
    }
    var buffer = context.createBuffer(1, count, context.sampleRate);
    var samples = buffer.getChannelData(0);
    samples.set(noise.subarray(0, count));
    for (var n = 0; n < tail; n++) {
      var mix = 0.5 - 0.5 * Math.cos(Math.PI * n / (tail - 1));
      samples[n] = noise[count + n] * (1 - mix) + noise[n] * mix;
    }
    var source = context.createBufferSource();
    var gain = context.createGain();
    source.buffer = buffer;
    source.loop = true;
    gain.gain.value = 0;
    source.connect(gain);
    gain.connect(ambienceBus);
    var item = {source:source, gain:gain, stopping:false};
    rain = item;
    source.onended = function () {
      source.disconnect(); gain.disconnect();
      if (rain === item) rain = null;
    };
    source.start();
    ramp(gain, 1, 0.8);
  }
  function stopRain(immediate) {
    if (!rain) return;
    immediate = immediate || blocked() || context.state !== 'running';
    var item = rain;
    item.stopping = true;
    if (immediate) {
      item.source.onended = null;
      try { item.source.stop(); } catch (ignore) {}
      item.source.disconnect(); item.gain.disconnect();
      rain = null;
    } else {
      ramp(item.gain, 0, 0.25);
      try { item.source.stop(context.currentTime + 0.28); } catch (ignore) {}
    }
  }
  function sync() {
    if (destroyed) return;
    if (blocked()) {
      abortLoad();
      suspendSoon();
      status();
      return;
    }
    if (!context || context.state !== 'running' || !unlocked) { status(); return; }
    cancelSuspend();
    ramp(master, volume * 0.65, 0.12);
    ramp(musicBus, musicEnabled ? (narrating ? 0.137 : 0.76) : 0, narrating ? 0.20 : 0.45);
    ramp(effectsBus, effectsEnabled ? 0.9 : 0, 0.07);
    ramp(ambienceBus, ambienceEnabled ? (narrating ? 0.022 : 0.12) : 0, narrating ? 0.20 : 0.45);
    if (musicEnabled) requestMusic();
    else if (active || loading) stopMusic();
    if (ambienceEnabled) {
      if (rain && rain.stopping) stopRain(true);
      makeRain();
    } else if (rain && !rain.stopping) stopRain(false);
    // Effects-only mode keeps the context ready; music-off must not silence cues.
    if (!requested()) suspendSoon();
    status();
  }
  function setScene(value) {
    if (destroyed || !Object.prototype.hasOwnProperty.call(scenes, value)) return false;
    if (scene === value) return true;
    scene = value;
    failedScene = '';
    abortLoad();
    sync();
    return true;
  }
  function setMusic(value) {
    if (destroyed) return false;
    if (musicEnabled === !!value) { sync(); return musicEnabled; }
    musicEnabled = !!value;
    if (musicEnabled) { failedScene = ''; lastError = ''; }
    else stopMusic();
    sync();
    return musicEnabled;
  }
  function setEffects(value) {
    if (destroyed) return false;
    effectsEnabled = !!value;
    if (!effectsEnabled) stopVoices();
    sync();
    return effectsEnabled;
  }
  function setAmbience(value) {
    if (destroyed) return false;
    ambienceEnabled = !!value;
    if (!ambienceEnabled) stopRain(false);
    sync();
    return ambienceEnabled;
  }
  function setNarrating(value) {value=!!value;if(narrating===value)return;narrating=value;sync();}
  function setVolume(value) {
    if (destroyed || typeof value !== 'number' || !isFinite(value)) return volume;
    volume = Math.max(0, Math.min(1, value));
    sync();
    return volume;
  }
  function setPaused(value) {
    if (destroyed) return;
    var wasPaused = paused;
    paused = !!value;
    if (wasPaused && !paused) resumeKnownContext();
    else sync();
  }
  function removeVoice(item) {
    item.source.onended = null;
    try { item.source.stop(); } catch (ignore) {}
    item.source.disconnect(); item.gain.disconnect();
    var index = voices.indexOf(item);
    if (index !== -1) voices.splice(index, 1);
  }
  function stopVoices() { voices.slice().forEach(removeVoice); }
  function voice(source, start, duration, level) {
    while (voices.length >= 12) removeVoice(voices[0]);
    var gain = context.createGain();
    var at = context.currentTime + start;
    gain.gain.value = 0;
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(level, at + Math.min(0.035, duration * 0.15));
    gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    gain.gain.linearRampToValueAtTime(0, at + duration + 0.025);
    source.connect(gain); gain.connect(effectsBus);
    var item = {source:source, gain:gain};
    voices.push(item);
    source.onended = function () { removeVoice(item); };
    source.start(at);
    source.stop(at + duration + 0.035);
  }
  function tone(frequency, start, duration, level) {
    var source = context.createOscillator();
    source.type = 'sine';
    source.frequency.value = frequency;
    voice(source, start, duration, level);
  }
  function paper() {
    var count = Math.round(context.sampleRate * 0.20);
    var buffer = context.createBuffer(1, count, context.sampleRate);
    var values = buffer.getChannelData(0);
    var seed = 7919;
    var filtered = 0;
    for (var i = 0; i < count; i++) {
      seed = (seed * 16807) % 2147483647;
      filtered = filtered * 0.73 + (seed / 2147483647 * 2 - 1) * 0.27;
      values[i] = filtered;
    }
    var source = context.createBufferSource();
    source.buffer = buffer;
    voice(source, 0, 0.17, 0.60);
    tone(310, 0.025, 0.15, 0.048);
  }
  function cue(name) {
    if (!context || !unlocked || context.state !== 'running' || !effectsEnabled || blocked()) return false;
    if (['enter','file','deduction','unlock','resolution'].indexOf(name) === -1) return false;
    var now = context.currentTime;
    if (cueTimes[name] !== undefined && now - cueTimes[name] < 0.25) return false;
    cueTimes[name] = now;
    if (name === 'file') paper();
    else if (name === 'enter') { tone(293.665, 0, 0.65, 0.26); tone(440, 0.12, 0.75, 0.16); }
    else if (name === 'deduction') { tone(391.995, 0, 0.34, 0.22); tone(440, 0.11, 0.48, 0.16); }
    else if (name === 'unlock') { tone(293.665, 0, 0.55, 0.22); tone(391.995, 0.10, 0.55, 0.168); tone(440, 0.21, 0.65, 0.136); }
    else { tone(293.665, 0, 1.1, 0.20); tone(349.228, 0.15, 1.0, 0.152); tone(440, 0.30, 0.95, 0.12); tone(659.255, 0.48, 1.0, 0.088); }
    return true;
  }
  function visibility() {
    if (blocked()) sync();
    else resumeKnownContext();
  }
  function hostVisibility(event) {
    if (!event.detail || typeof event.detail.hidden !== 'boolean') return;
    hostHidden = event.detail.hidden;
    visibility();
  }
  function pageHide(event) {
    if (event.persisted) { pageHidden = true; sync(); }
    else destroy();
  }
  function pageShow() { pageHidden = false; visibility(); }
  function destroy() {
    if (destroyed) return;
    destroyed = true;
    cancelSuspend(); abortLoad();
    disposeTrack(active); disposeTrack(outgoing);
    stopRain(true); stopVoices();
    document.removeEventListener('visibilitychange', visibility);
    window.removeEventListener('varsha-host-visibility', hostVisibility);
    window.removeEventListener('pagehide', pageHide);
    window.removeEventListener('pageshow', pageShow);
    if (context) { context.onstatechange = null; try { var closing = context.close(); if (closing && closing.catch) closing.catch(function () {}); } catch (ignore) {} }
    status();
  }

  document.addEventListener('visibilitychange', visibility);
  window.addEventListener('varsha-host-visibility', hostVisibility);
  window.addEventListener('pagehide', pageHide);
  window.addEventListener('pageshow', pageShow);
  window.VARSHA_SOUND = {unlock:unlock, setScene:setScene, cue:cue, setMusic:setMusic, setEffects:setEffects, setAmbience:setAmbience, setVolume:setVolume, setPaused:setPaused, setNarrating:setNarrating, getStatus:getStatus, destroy:destroy};
  status();
}());
