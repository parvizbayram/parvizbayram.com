(() => {
  const DESIGN_WIDTH = 1920;
  const RADIO_WAVEFORM_URL = "/assets/unibank/radio-waveforms.json";
  const RADIO_WAVE_WIDTH = 810;
  const RADIO_WAVE_HEIGHT = 80;
  const RADIO_BAR_WIDTH = 3;
  const RADIO_BAR_MIN_HEIGHT = 5;
  const RADIO_BAR_MAX_HEIGHT = 78;
  const RADIO_ROW_GAP = 60;
  const RADIO_COLLAPSED_HEIGHT = 80;
  const RADIO_EXPANDED_HEIGHT = 159;
  const RADIO_TRANSCRIPT_END_BUFFER = 1;
  const root = document.documentElement;
  const radioPlayers = [];
  let activeRadioPlayer = null;
  let expandedRadioPlayer = null;
  let radioWaveforms = {};
  let radioRafId = 0;

  function syncUnibankScale() {
    const scale = window.innerWidth < DESIGN_WIDTH ? window.innerWidth / DESIGN_WIDTH : 1;
    root.style.setProperty("--page-scale", scale.toFixed(5));
  }

  function scrollToTopInstant() {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }

  function initScrollToTop() {
    const button = document.querySelector("[data-unibank-scroll-top]");
    if (!button) {
      return;
    }

    button.addEventListener("click", (event) => {
      event.preventDefault();
      scrollToTopInstant();
    });
  }

  function setupCanvas(canvas) {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(RADIO_WAVE_WIDTH * ratio);
    const height = Math.round(RADIO_WAVE_HEIGHT * ratio);

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    const context = canvas.getContext("2d");
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    return context;
  }

  function getRadioCurrentTime(player) {
    return Number.isFinite(player.pendingSeekTime) ? player.pendingSeekTime : player.audio.currentTime;
  }

  function getRadioSeekRatio(player, event) {
    const rect = player.canvas.getBoundingClientRect();
    if (!rect.width) {
      return null;
    }

    const clientX = Number(event.clientX);
    if (!Number.isFinite(clientX) || clientX < rect.left - 2 || clientX > rect.right + 2) {
      return null;
    }

    return Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1);
  }

  function drawWaveform(player) {
    const { audio, canvas, id } = player;
    const waveform = radioWaveforms[id] || {};
    const peaks = Array.isArray(waveform.peaks) && waveform.peaks.length
      ? waveform.peaks
      : Array.from({ length: 82 }, () => 0.35);
    const duration = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : waveform.duration || 1;
    const progress = duration ? Math.min(Math.max(getRadioCurrentTime(player) / duration, 0), 1) : 0;
    const context = setupCanvas(canvas);
    const centerY = RADIO_WAVE_HEIGHT / 2;
    const step = (RADIO_WAVE_WIDTH - RADIO_BAR_WIDTH) / Math.max(1, peaks.length - 1);

    const paintBars = (color) => {
      context.strokeStyle = color;
      context.lineWidth = RADIO_BAR_WIDTH;
      context.lineCap = "round";

      peaks.forEach((peak, index) => {
        const normalized = Math.min(Math.max(Number(peak) || 0, 0), 1);
        const height = RADIO_BAR_MIN_HEIGHT + normalized * (RADIO_BAR_MAX_HEIGHT - RADIO_BAR_MIN_HEIGHT);
        const x = RADIO_BAR_WIDTH / 2 + index * step;
        context.beginPath();
        context.moveTo(x, centerY - height / 2);
        context.lineTo(x, centerY + height / 2);
        context.stroke();
      });
    };

    context.clearRect(0, 0, RADIO_WAVE_WIDTH, RADIO_WAVE_HEIGHT);
    paintBars("#777D83");

    context.save();
    context.beginPath();
    context.rect(0, 0, RADIO_WAVE_WIDTH * progress, RADIO_WAVE_HEIGHT);
    context.clip();
    paintBars("#ffffff");
    context.restore();
  }

  function drawAllRadioWaveforms() {
    radioPlayers.forEach(drawWaveform);
  }

  function updateRadioTranscript(player) {
    if (!player?.transcriptTrack) {
      return;
    }

    const transcriptWidth = player.transcript.clientWidth || 833;
    const trackWidth = player.transcriptTrack.scrollWidth || 0;
    const waveform = radioWaveforms[player.id] || {};
    const duration = Number.isFinite(player.audio.duration) && player.audio.duration > 0
      ? player.audio.duration
      : waveform.duration || 0;
    const syncedDuration = Math.max(0.001, duration - RADIO_TRANSCRIPT_END_BUFFER);
    const progress = duration
      ? Math.min(Math.max(getRadioCurrentTime(player) / syncedDuration, 0), 1)
      : 0;
    const startX = transcriptWidth;
    const endX = -trackWidth;
    const x = startX + (endX - startX) * progress;

    player.transcriptTrack.style.setProperty("--radio-transcript-x", `${x}px`);
  }

  function updateAllRadioTranscripts() {
    radioPlayers.forEach(updateRadioTranscript);
  }

  function layoutRadioPlayers() {
    let minimumTop = -Infinity;

    radioPlayers.forEach((player) => {
      const baseTop = Number(player.element.dataset.radioTop || 0);
      const top = Math.max(baseTop, minimumTop);
      const hasTranscript = player.element.classList.contains("is-expanded") && player.transcript.textContent.trim();
      const height = hasTranscript ? RADIO_EXPANDED_HEIGHT : RADIO_COLLAPSED_HEIGHT;

      player.element.style.top = `${top}px`;
      minimumTop = top + height + RADIO_ROW_GAP;
    });
  }

  function stopRadioAnimationIfIdle() {
    if (activeRadioPlayer?.audio && !activeRadioPlayer.audio.paused && !activeRadioPlayer.audio.ended) {
      return;
    }

    if (radioRafId) {
      window.cancelAnimationFrame(radioRafId);
      radioRafId = 0;
    }
  }

  function startRadioAnimation() {
    if (radioRafId) {
      return;
    }

    const step = () => {
      if (activeRadioPlayer) {
        drawWaveform(activeRadioPlayer);
        updateRadioTranscript(activeRadioPlayer);
      }

      if (activeRadioPlayer?.audio && !activeRadioPlayer.audio.paused && !activeRadioPlayer.audio.ended) {
        radioRafId = window.requestAnimationFrame(step);
        return;
      }

      radioRafId = 0;
    };

    radioRafId = window.requestAnimationFrame(step);
  }

  function collapseRadioPlayer(player) {
    if (!player) {
      return;
    }

    player.element.classList.remove("is-expanded");

    if (expandedRadioPlayer === player) {
      expandedRadioPlayer = null;
    }

    layoutRadioPlayers();
  }

  function expandRadioPlayer(player) {
    if (expandedRadioPlayer && expandedRadioPlayer !== player) {
      collapseRadioPlayer(expandedRadioPlayer);
    }

    expandedRadioPlayer = player;
    player.element.classList.add("is-expanded");
    layoutRadioPlayers();
    updateRadioTranscript(player);
  }

  function pauseRadioPlayer(player, { collapse = false } = {}) {
    if (!player) {
      return;
    }

    player.audio.pause();
    player.element.classList.remove("is-playing");
    player.button.setAttribute("aria-label", `Play radio spot ${player.id}`);
    drawWaveform(player);
    updateRadioTranscript(player);

    if (collapse) {
      collapseRadioPlayer(player);
    }

    stopRadioAnimationIfIdle();
  }

  function playRadioPlayer(player) {
    if (activeRadioPlayer && activeRadioPlayer !== player) {
      pauseRadioPlayer(activeRadioPlayer, { collapse: true });
    }

    if (expandedRadioPlayer && expandedRadioPlayer !== player) {
      collapseRadioPlayer(expandedRadioPlayer);
    }

    activeRadioPlayer = player;
    expandRadioPlayer(player);

    player.audio.play()
      .then(() => {
        player.element.classList.add("is-playing");
        player.button.setAttribute("aria-label", `Pause radio spot ${player.id}`);
        startRadioAnimation();
      })
      .catch(() => {
        player.element.classList.remove("is-playing");
        player.button.setAttribute("aria-label", `Play radio spot ${player.id}`);
      });
  }

  function seekRadioPlayer(player, event) {
    const ratio = getRadioSeekRatio(player, event);
    if (ratio === null) {
      return;
    }

    const waveform = radioWaveforms[player.id] || {};
    const duration = Number.isFinite(player.audio.duration) && player.audio.duration > 0
      ? player.audio.duration
      : waveform.duration || 0;

    if (duration) {
      const seekTime = ratio * duration;

      if (player.audio.readyState === 0) {
        player.pendingSeekTime = seekTime;
      } else {
        player.audio.currentTime = seekTime;
        player.pendingSeekTime = null;
      }
    }

    drawWaveform(player);
    updateRadioTranscript(player);
  }

  function bindRadioPlayer(player) {
    let isDragging = false;

    player.button.addEventListener("click", () => {
      if (player.audio.paused || player.audio.ended) {
        playRadioPlayer(player);
        return;
      }

      pauseRadioPlayer(player);
    });

    player.canvas.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      isDragging = true;
      player.canvas.setPointerCapture?.(event.pointerId);

      if (activeRadioPlayer && activeRadioPlayer !== player) {
        pauseRadioPlayer(activeRadioPlayer, { collapse: true });
        activeRadioPlayer = null;
      }

      if (expandedRadioPlayer && expandedRadioPlayer !== player) {
        collapseRadioPlayer(expandedRadioPlayer);
      }

      expandRadioPlayer(player);
      seekRadioPlayer(player, event);
    });

    player.canvas.addEventListener("pointermove", (event) => {
      if (!isDragging) {
        return;
      }

      seekRadioPlayer(player, event);
    });

    const stopDragging = (event) => {
      if (!isDragging) {
        return;
      }

      isDragging = false;
      player.canvas.releasePointerCapture?.(event.pointerId);
    };

    player.canvas.addEventListener("pointerup", stopDragging);
    player.canvas.addEventListener("pointercancel", stopDragging);

    player.audio.addEventListener("loadedmetadata", () => {
      if (Number.isFinite(player.pendingSeekTime)) {
        player.audio.currentTime = player.pendingSeekTime;
        player.pendingSeekTime = null;
      }

      drawWaveform(player);
      updateRadioTranscript(player);
    });
    player.audio.addEventListener("timeupdate", () => {
      if (!player.audio.paused) {
        return;
      }

      drawWaveform(player);
      updateRadioTranscript(player);
    });
    player.audio.addEventListener("ended", () => {
      player.audio.currentTime = 0;
      player.element.classList.remove("is-playing");
      player.button.setAttribute("aria-label", `Play radio spot ${player.id}`);
      drawWaveform(player);
      updateRadioTranscript(player);
      collapseRadioPlayer(player);

      if (activeRadioPlayer === player) {
        activeRadioPlayer = null;
      }

      stopRadioAnimationIfIdle();
    });
  }

  function initRadioPlayers() {
    document.querySelectorAll(".radio-player-ui").forEach((element) => {
      const id = element.dataset.radioPlayer;
      const player = {
        id,
        element,
        button: element.querySelector(".radio-toggle"),
        canvas: element.querySelector(".radio-waveform"),
        audio: element.querySelector("audio"),
        transcript: element.querySelector(".radio-transcript"),
        transcriptTrack: element.querySelector(".radio-transcript-track"),
        pendingSeekTime: null,
      };

      if (!player.id || !player.button || !player.canvas || !player.audio || !player.transcript) {
        return;
      }

      radioPlayers.push(player);
      bindRadioPlayer(player);
    });

    radioPlayers.sort((first, second) => Number(first.element.dataset.radioTop) - Number(second.element.dataset.radioTop));
    layoutRadioPlayers();
    drawAllRadioWaveforms();
    updateAllRadioTranscripts();

    fetch(RADIO_WAVEFORM_URL)
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error("Waveform data not found"))))
      .then((data) => {
        radioWaveforms = data || {};
        drawAllRadioWaveforms();
        updateAllRadioTranscripts();
      })
      .catch(() => {
        drawAllRadioWaveforms();
        updateAllRadioTranscripts();
      });
  }

  syncUnibankScale();
  initScrollToTop();
  initRadioPlayers();
  window.addEventListener("resize", syncUnibankScale, { passive: true });
  window.addEventListener("resize", drawAllRadioWaveforms, { passive: true });
  window.addEventListener("resize", updateAllRadioTranscripts, { passive: true });
})();
