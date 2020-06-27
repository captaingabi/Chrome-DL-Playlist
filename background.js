let runtime = {
  tabId: undefined,
  playlist: undefined,
  currentMedia: undefined,
  prevMedia: undefined,
  randomMedia: undefined,
  refreshing: false,
  volume: 1,
  paused: false,
};

const mediaRegExp = /(https?:\/\/(.*))\/(.*)(\.mp3|\.mp4|\.webm)/;

chrome.storage.sync.get('playlist', (result) => {
  if (result && result.playlist) runtime.playlist = result.playlist;
  else runtime.playlist = { media: [] };
});

const setTabId = (tabId) => {
  runtime.tabId = tabId;
  if (runtime.tabId) {
    chrome.browserAction.setBadgeText({ text: '' }, () => {});
  } else {
    chrome.browserAction.setBadgeText({ text: '!' }, () => {});
  }
};

const moveMediaInList = (srcMediaUrl, dstMediaUrl) => {
  if (srcMediaUrl === dstMediaUrl) return;
  const srcMedia = runtime.playlist.media.find((media) => media.url === srcMediaUrl);
  runtime.playlist.media = runtime.playlist.media.reduce((result, media) => {
    if (media.url === srcMediaUrl);
    else if (media.url === dstMediaUrl) {
      result.push(srcMedia);
      result.push(media);
    } else result.push(media);
    return result;
  }, []);
  chrome.storage.sync.set({ playlist: runtime.playlist }, () => {});
};

const updateVideoSettings = (tab) => {
  chrome.tabs.sendMessage(tab.id, { msg: 'set_volume', volume: runtime.volume }, (response) => {
    chrome.tabs.sendMessage(tab.id, { msg: 'set_paused', volume: runtime.paused }, (response) => {
      chrome.runtime.sendMessage({ msg: 'refresh_trigger', runtime });
    });
  });
};

const refreshURL = () => {
  runtime.refreshing = true;
  if (runtime.tabId) {
    chrome.tabs.update(runtime.tabId, { url: `${runtime.currentMedia}` }, (tab) =>
      setTabId(tab.id)
    );
  } else {
    chrome.tabs.create({ url: `${runtime.currentMedia}` }, (tab) => setTabId(tab.id));
  }
};

const playRandom = () => {
  runtime.randomMedia = runtime.randomMedia.filter((media) => media.url !== runtime.currentMedia);
  if (runtime.randomMedia.length === 0) runtime.randomMedia = runtime.playlist.media;
  const next = Math.floor(Math.random() * runtime.randomMedia.length);
  runtime.prevMedia = runtime.currentMedia;
  runtime.currentMedia = runtime.randomMedia[next].url;
  refreshURL();
};

const playOrder = (direction) => {
  let next =
    (Number(runtime.playlist.media.findIndex((media) => media.url === runtime.currentMedia)) +
      direction) %
    runtime.playlist.media.length;
  if (next < 0) next = runtime.playlist.media.length - 1;
  runtime.prevMedia = runtime.currentMedia;
  runtime.currentMedia = runtime.playlist.media[next].url;
  refreshURL();
};

const playExact = (mediaUrl) => {
  runtime.prevMedia = runtime.currentMedia;
  runtime.currentMedia = mediaUrl;
  refreshURL();
};

const addMedia = () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    if (tab.url.match(mediaRegExp)) {
      runtime.playlist.media.push({
        url: tab.url,
        title: decodeURI(tab.url.match(mediaRegExp)[3]),
      });
      chrome.runtime.sendMessage({ msg: 'refresh_trigger', runtime });
      chrome.storage.sync.set({ playlist: runtime.playlist }, () => {});
    }
  });
};

const removeMedia = (mediaUrl) => {
  runtime.playlist.media = runtime.playlist.media.filter((media) => media.url != mediaUrl);
  chrome.runtime.sendMessage({ msg: 'refresh_trigger', runtime });
  chrome.storage.sync.set({ playlist: runtime.playlist }, () => {});
};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.msg === 'add_media') {
    addMedia();
  }
  if (request.msg === 'remove_media') {
    removeMedia(request.mediaUrl);
  }
  if (request.msg === 'refresh_request') {
    sendResponse({ msg: 'refresh_response', runtime });
  }
  if (runtime && runtime.playlist.media) {
    if (request.msg === 'video_loaded') {
      if (runtime.tabId === sender.tab.id) {
        setTabId(sender.tab.id);
        runtime.refreshing = false;
        updateVideoSettings(sender.tab);
      }
    }
    if (request.msg === 'video_ended') {
      if (runtime.tabId === sender.tab.id) {
        if (runtime.randomMedia) playRandom();
        else playOrder(1);
      }
    }
    if (request.msg === 'play_next') {
      if (runtime.randomMedia) playRandom();
      else playOrder(1);
    }
    if (request.msg === 'play_prev') {
      playOrder(-1);
    }
    if (request.msg === 'play_exact') {
      playExact(request.mediaUrl);
    }
    if (request.msg === 'randomize') {
      runtime.randomMedia = request.randomize ? runtime.playlist.media : undefined;
      chrome.runtime.sendMessage({ msg: 'refresh_trigger', runtime });
    }
    if (request.msg === 'set_volume') {
      runtime.volume = request.volume;
      if (runtime.tabId)
        chrome.tabs.sendMessage(runtime.tabId, { msg: 'set_volume', volume: runtime.volume });
      chrome.runtime.sendMessage({ msg: 'refresh_trigger', runtime });
    }
    if (request.msg === 'update_volume') {
      if (runtime.tabId === sender.tab.id) {
        runtime.volume = request.volume;
        chrome.runtime.sendMessage({ msg: 'refresh_trigger', runtime });
      }
    }
    if (request.msg === 'set_paused') {
      runtime.paused = runtime.paused ? false : true;
      if (runtime.tabId)
        chrome.tabs.sendMessage(runtime.tabId, { msg: 'set_paused', paused: runtime.paused });
      chrome.runtime.sendMessage({ msg: 'refresh_trigger', runtime });
    }
    if (request.msg === 'update_paused') {
      if (runtime.tabId === sender.tab.id) {
        runtime.paused = request.paused;
        chrome.runtime.sendMessage({ msg: 'refresh_trigger', runtime });
      }
    }
    if (request.msg === 'move_media_in_playlist') {
      moveMediaInList(request.src, request.dst);
      chrome.runtime.sendMessage({ msg: 'refresh_trigger', runtime });
    }
  }
});

chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
  if (tabId === runtime.tabId) {
    setTabId(undefined);
  }
});

setTabId(undefined);
