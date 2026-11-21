const owners = new WeakMap();

export function attachSceneSequence(video, poster, { onState, onComplete, frameHold = null }) {
  if (video?.tagName !== 'VIDEO' || poster?.tagName !== 'IMG' ||
      poster.ownerDocument !== video.ownerDocument ||
      typeof onState !== 'function' || typeof onComplete !== 'function') {
    throw new TypeError('A video, its poster image and both callbacks are required');
  }
  const document = video.ownerDocument;
  const reduced = document.defaultView.matchMedia('(prefers-reduced-motion: reduce)');
  owners.get(video)?.destroy();
  let scene = null, disposed = false, wanted = false, loaded = false, hasFrame = false;
  let epoch = 0, request = 0, state = '', listeners = null, loadingTimer;

  let cancelFrame = null;
  function clearHold() {
    cancelFrame?.(); cancelFrame = null;
    if (frameHold) { frameHold.hidden = true; frameHold.width = frameHold.height = 0; }
  }
  function captureFrame() {
    if (!frameHold || reduced.matches || video.hidden || video.readyState < 2 || !video.videoWidth) return false;
    try {
      frameHold.width = video.videoWidth; frameHold.height = video.videoHeight;
      frameHold.getContext('2d').drawImage(video, 0, 0);
      frameHold.hidden = false;
      return true;
    } catch { clearHold(); return false; }
  }
  function revealFrame() {
    if (cancelFrame) return;
    const generation = epoch, ticket = request;
    const ready = () => {
      cancelFrame = null;
      if (disposed || epoch !== generation || request !== ticket || !wanted || document.hidden || reduced.matches) return;
      if (video.readyState < 2) { revealFrame(); return; }
      clearHold(); emit('playing');
    };
    if (video.requestVideoFrameCallback) {
      const id = video.requestVideoFrameCallback(ready);
      cancelFrame = () => video.cancelVideoFrameCallback(id);
    } else {
      // shortcut: without frame callbacks use two paint turns; verify compositor timing on target Safari.
      const view = document.defaultView;
      let id = view.requestAnimationFrame(() => { id = view.requestAnimationFrame(ready); });
      cancelFrame = () => view.cancelAnimationFrame(id);
    }
  }
  function asset(value, kind) {
    if (typeof value !== 'string' || !value.trim()) throw new TypeError('A media URL is required');
    const base = new URL(document.baseURI), url = new URL(value, base);
    const inline = kind === 'video' ? /^data:video\/mp4;base64,/i : /^data:image\/(png|jpeg|webp);base64,/i;
    if (url.protocol === 'data:') {
      if (!inline.test(value)) throw new TypeError('Unsupported inline media');
    } else if (url.origin !== base.origin || url.protocol !== base.protocol || url.username || url.password) {
      throw new TypeError('Only same-origin media or supported inline media is allowed');
    }
    return url.href;
  }
  function emit(next) {
    if (disposed || !scene) return;
    next = reduced.matches ? 'reduced' : next;
    if (['reduced', 'skipped', 'error', 'blocked'].includes(next)) clearHold();
    if (next === 'playing' && frameHold && !frameHold.hidden) {
      video.hidden = false;
      revealFrame();
      return;
    }
    if (next === 'playing' || next === 'ended') hasFrame = true;
    video.hidden = !loaded || !hasFrame || ['reduced', 'skipped', 'error', 'blocked'].includes(next);
    if (state === next) return;
    clearTimeout(loadingTimer);
    state = next;
    if (state === 'loading' && (!scene.loop || frameHold && !frameHold.hidden)) {
      const generation = epoch;
      loadingTimer = setTimeout(() => {
        if (disposed || generation !== epoch || !wanted || state !== 'loading') return;
        unload();
        emit('error');
      }, 12000);
    }
    onState({ id: scene.id, state: next });
  }
  function unload(keepFrame = false) {
    cancelFrame?.(); cancelFrame = null;
    if (!keepFrame) clearHold();
    clearTimeout(loadingTimer);
    ++epoch; ++request;
    wanted = loaded = hasFrame = false;
    if (listeners) {
      for (const [name, listener] of Object.entries(listeners)) video.removeEventListener(name, listener);
      listeners = null;
    }
    video.pause();
    video.removeAttribute('src');
    video.load();
    video.hidden = true;
  }
  function stop(next = 'paused') {
    cancelFrame?.(); cancelFrame = null;
    if (reduced.matches) unload();
    else {
      ++request;
      wanted = false;
      video.pause();
    }
    emit(next);
  }
  function atEnd() {
    return video.ended || (Number.isFinite(video.duration) && video.duration > 0 && video.currentTime >= video.duration);
  }
  function complete(reason) {
    if (disposed || !scene || scene.completion) return false;
    const current = scene;
    current.completion = reason;
    ++request;
    wanted = false;
    if (reason === 'skipped') unload();
    emit(reason);
    if (!disposed && scene === current) onComplete({ id: current.id, reason });
    return true;
  }
  function bind(current, generation) {
    const currentResource = (allowEmpty = false) => !disposed && scene === current && epoch === generation &&
      (video.currentSrc === current.src || (allowEmpty && !video.currentSrc && video.src === current.src));
    function ended() {
      if (!currentResource() || !wanted || current.loop || !atEnd()) return;
      if (reduced.matches || document.hidden) stop();
      else complete('ended');
    }
    listeners = {
      playing() {
        if (!currentResource()) return;
        if (!wanted) { video.pause(); return; }
        if (reduced.matches || document.hidden) stop();
        else emit('playing');
      },
      pause() {
        if (!currentResource() || !wanted || !video.paused) return;
        if (!current.loop && atEnd()) ended();
        else stop(!current.loop && current.holdAt === null && !document.hidden ? 'blocked' : 'paused');
      },
      timeupdate() {
        if (!currentResource() || !wanted || current.held || current.holdAt === null || video.paused ||
            video.currentTime < current.holdAt || document.hidden || reduced.matches) return;
        current.held = true;
        stop('held');
      },
      waiting() { if (currentResource() && wanted) emit('loading'); },
      ended,
      error() { if (currentResource(true) && video.error) stop('error'); }
    };
    for (const [name, listener] of Object.entries(listeners)) video.addEventListener(name, listener);
  }
  function setScene({ id, src = null, poster: image, loop = false, holdAt = null, preserveFrame = false }) {
    if (disposed) return false;
    if (typeof id !== 'string' || !id.trim() || typeof loop !== 'boolean') throw new TypeError('Invalid scene');
    if (holdAt !== null && (!Number.isFinite(holdAt) || holdAt <= 0 || loop || !src)) throw new TypeError('Invalid scene hold');
    const next = { id, holdAt, held: false, src: src === null ? null : asset(src, 'video'), poster: asset(image, 'image'), loop, completion: null };
    if (loaded && wanted && scene?.id !== id && scene?.loop && next.loop &&
        scene.src === next.src && scene.poster === next.poster && !video.error) {
      const current = scene;
      scene.id = id;
      const currentState = state;
      state = '';
      emit(currentState);
      return !disposed && scene === current;
    }
    const held = preserveFrame && captureFrame();
    unload(held);
    scene = next;
    state = '';
    video.loop = next.loop;
    video.poster = poster.src = next.poster;
    emit('paused');
    return !disposed && scene === next;
  }
  async function play() {
    if (disposed || !scene || scene.completion || !scene.src) return false;
    if (reduced.matches || document.hidden) { stop(); return false; }
    if (loaded && wanted && state === 'playing' && !video.paused) return true;
    if (loaded && (state === 'error' || video.error)) unload();
    cancelFrame?.(); cancelFrame = null;
    const current = scene, generation = epoch, ticket = ++request;
    wanted = true;
    emit('loading');
    if (disposed || scene !== current || ticket !== request) return false;
    if (!loaded) {
      bind(current, generation);
      loaded = true;
      video.src = current.src;
      video.load();
    }
    if (disposed || scene !== current || ticket !== request) return false;
    try {
      await video.play();
    } catch (error) {
      if (!disposed && scene === current && generation === epoch && ticket === request) {
        stop(error?.name === 'NotAllowedError' ? 'blocked' : 'error');
      }
      return false;
    }
    if (disposed || scene !== current || generation !== epoch || ticket !== request) {
      if (!owners.has(video) || (owners.get(video) === controller && !wanted)) video.pause();
      return false;
    }
    if (reduced.matches || document.hidden) { stop(); return false; }
    emit('playing');
    return !disposed && scene === current && ticket === request && wanted;
  }
  function preferenceChanged() {
    if (disposed) return;
    if (reduced.matches) { unload(); emit('reduced'); }
    else if (state === 'reduced') emit(scene?.completion || 'paused');
  }
  function visibilityChanged() { if (document.hidden && wanted) stop(); }
  const controller = {
    setScene,
    play,
    pause() { if (!disposed) stop(); },
    replay() {
      if (disposed || !scene) return Promise.resolve(false);
      const current = scene;
      return setScene(current) ? play() : Promise.resolve(false);
    },
    skip() { return complete('skipped'); },
    destroy() {
      if (disposed) return;
      disposed = true;
      unload();
      reduced.removeEventListener('change', preferenceChanged);
      document.removeEventListener('visibilitychange', visibilityChanged);
      if (owners.get(video) === controller) owners.delete(video);
    }
  };
  owners.set(video, controller);
  video.autoplay = false;
  video.muted = true;
  video.playsInline = true;
  video.preload = 'none';
  reduced.addEventListener('change', preferenceChanged);
  document.addEventListener('visibilitychange', visibilityChanged);
  unload();
  return controller;
}
