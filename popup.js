const addButton = document.getElementById('addButton');
const playButton = document.getElementById('playButton');
const previousButton = document.getElementById('previousButton');
const nextButton = document.getElementById('nextButton');
const volumeInput = document.getElementById('volumeInput');
const randomInput = document.getElementById('randomInput');
const randomizeLabel = document.getElementById('randomizeLabel');

const updatePlayListDiv = (runtime) => {
  const ul = document.createElement('ul');
  let currentLI = undefined;
  runtime.playlist.media.forEach((media) => {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = '#';
    a.innerHTML = media.title;
    a.url = media.url + 'A';
    if (runtime.currentMedia === media.url) {
      a.style = 'color:red';
      currentLI = li;
    }
    a.onclick = () => {
      chrome.runtime.sendMessage({ msg: 'play_exact', mediaUrl: media.url });
    };
    a.oncontextmenu = () => {
      chrome.runtime.sendMessage({ msg: 'remove_media', mediaUrl: media.url });
      return false;
    };
    li.appendChild(a);
    li.addEventListener(
      'dragstart',
      (event) => {
        event.target.style.opacity = '0.4';
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/html', event.target.url);
      },
      false
    );
    li.addEventListener(
      'dragend',
      (event) => {
        event.target.style.opacity = '1';
      },
      false
    );
    li.addEventListener(
      'dragover',
      (event) => {
        if (event.preventDefault) {
          event.preventDefault();
        }
        event.dataTransfer.dropEffect = 'move';
      },
      false
    );
    li.addEventListener(
      'dragenter',
      (event) => {
        event.target.style.textDecoration = 'overline';
      },
      false
    );
    li.addEventListener(
      'dragleave',
      (event) => {
        event.target.style.textDecoration = null;
      },
      false
    );
    li.addEventListener(
      'drop',
      (event) => {
        if (event.stopPropagation) {
          event.stopPropagation();
        }
        chrome.runtime.sendMessage({
          msg: 'move_media_in_playlist',
          src: event.dataTransfer.getData('text/html').slice(0, -1),
          dst: event.target.url.slice(0, -1),
        });
        return false;
      },
      false
    );
    ul.appendChild(li);
  });
  playListDiv.innerHTML = '';
  playListDiv.appendChild(ul);
  if (currentLI) currentLI.scrollIntoView({ behavior: 'auto', block: 'center' });
};

const updateRandomDiv = (runtime) => {
  if (runtime.randomMedia) {
    randomizeLabel.innerHTML = `Randomize: ${runtime.randomMedia.length} media remaining`;
    randomInput.checked = true;
    previousButton.disabled = true;
  } else {
    randomizeLabel.innerHTML = 'Randomize';
    randomInput.checked = false;
    previousButton.disabled = false;
  }
};

const updateVolumeSliderShadow = (beginColor, endColor) => {
  volumeInput.style.background =
    'linear-gradient(to right, ' +
    `#${beginColor} 0%, #${beginColor} ${volumeInput.value * 100}%, ` +
    `#${endColor} ${volumeInput.value * 100}%, #${endColor} 100%)`;
};

const updatePlayer = (runtime) => {
  playButton.className = runtime.paused ? 'play-button' : 'pause-button';
  volumeInput.value = runtime.volume;
  if (runtime.refreshing) {
    playButton.disabled = true;
    volumeInput.disabled = true;
    updateVolumeSliderShadow('888', 'ccc');
  } else {
    playButton.disabled = false;
    volumeInput.disabled = false;
    updateVolumeSliderShadow('8080ff', 'ccc');
  }
};

playButton.onclick = (event) => {
  chrome.runtime.sendMessage({ msg: 'set_paused' });
};

volumeInput.oninput = () => {
  updateVolumeSliderShadow('8080ff', 'ccc');
  chrome.runtime.sendMessage({ msg: 'set_volume', volume: volumeInput.value });
};

addButton.onclick = (event) => {
  chrome.runtime.sendMessage({ msg: 'add_media' });
};

previousButton.onclick = (event) => {
  chrome.runtime.sendMessage({ msg: 'play_prev' });
};

nextButton.onclick = (event) => {
  chrome.runtime.sendMessage({ msg: 'play_next' });
};

randomInput.onclick = (event) => {
  if (event.target.checked) {
    chrome.runtime.sendMessage({ msg: 'randomize', randomize: true });
  } else {
    chrome.runtime.sendMessage({ msg: 'randomize', randomize: false });
  }
};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.msg === 'refresh_trigger') {
    updatePlayListDiv(request.runtime);
    updateRandomDiv(request.runtime);
    updatePlayer(request.runtime);
  }
});

chrome.runtime.sendMessage({ msg: 'refresh_request' }, (response) => {
  if (response.msg === 'refresh_response') {
    updatePlayListDiv(response.runtime);
    updateRandomDiv(response.runtime);
    updatePlayer(response.runtime);
  }
});
