const waitForVideo = () => {
  let video = document.querySelector('video');
  let head = document.querySelector('head');
  if (!video || !head) {
    timerId = window.setTimeout(waitForVideo, 10);
  } else {
    chrome.runtime.sendMessage({ msg: 'video_loaded' });

    video.addEventListener('ended', (event) => {
      chrome.runtime.sendMessage({ msg: 'video_ended' });
    });

    video.addEventListener('pause', (event) => {
      chrome.runtime.sendMessage({ msg: 'update_paused', paused: video.paused });
    });
    video.addEventListener('play', (event) => {
      chrome.runtime.sendMessage({ msg: 'update_paused', paused: video.paused });
    });
    video.addEventListener('playing', (event) => {
      chrome.runtime.sendMessage({ msg: 'update_paused', paused: video.paused });
    });

    video.addEventListener('volumechange', (event) => {
      chrome.runtime.sendMessage({ msg: 'update_volume', volume: video.volume });
    });

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.msg === 'set_paused') {
        if (request.paused) video.pause();
        else video.play();
        sendResponse({ paused: video.paused });
      }
      if (request.msg === 'get_paused') {
        sendResponse({ paused: video.paused });
      }
      if (request.msg === 'set_volume') {
        video.volume = request.volume;
        sendResponse({ volume: video.volume });
      }
      if (request.msg === 'get_volume') {
        sendResponse({ volume: video.volume });
      }
    });
  }
};

waitForVideo();
