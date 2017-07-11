require('./renderer.js');

(function() {
  let userCardIsActive = false;
  let receivedFirstData = false;
  let previouslyReceivedUsers = [];
  var ipc = require('electron').ipcRenderer;
  let form = document.getElementsByClassName('form')[0];
  let formPartOne = document.getElementsByClassName('part-one')[0];
  let formPartTwo = document.getElementsByClassName('part-two')[0];
  let inputField = document.getElementsByClassName('search-name')[0];
  let finishButton = document.getElementsByClassName('raised-button')[0];
  let numberOfUsers = document.getElementsByClassName('online-now-usercount')[0];
  let friendsListContainer = document.getElementsByClassName('online-now-box')[0];

  displayOrHideFriendList();

  ipc.on('usersOnline',(event, data) => {
    if (!receivedFirstData && data.allUsers) {
      displayUsers(data.allUsers, data.onlineUsers);
      previouslyReceivedUsers = data.allUsers;
      receivedFirstData = true;
    } else if (receivedFirstData) {
      displayUsers(data.allUsers, data.onlineUsers);
      previouslyReceivedUsers = data.allUsers;
    }
    numberOfUsers.innerHTML = data.numberOfUsers;
  });

  ipc.on('setUser', (event, data) => {
    let configData = data['config'];
    let userData = JSON.parse(data['user']);
    let userInfo = document.getElementsByClassName('user-info')[0];
    let container = document.getElementsByClassName('container')[0];
    let userDetail = document.getElementsByClassName('user-detail')[0];
    let saveButton = document.getElementsByClassName('save-button')[0];
    let notifications = document.getElementsByClassName('user-notifications')[0];

    if (userData.characters.error) {
      return;
    }

    saveButton.onclick = function() {
      userCardIsActive = false;
      updateNotifications(userData.characters.data.name);
      hideUserCard();
      displayToastMessage('Notifications updated');
    };

    form.style.display = 'none';
    userInfo.innerHTML = userData.characters.data.name;
    userDetail.innerHTML = `${userData.characters.data.vocation} - Lv. ${userData.characters.data.level}`;
    animateUserCard();
    setPreviousNotifications(configData);
  });

  inputField.addEventListener('keypress', e => {
    if (e.keyCode !== 13) {
      return;
    }

    displayFormPartTwo();

    finishButton.onclick = function() {
      sendData();
      resetForm();
      displayToastMessage('User added');
    };
  });

  function displayOrHideFriendList() {
    let friendList = document.getElementsByClassName('friends-list')[0];
    
    friendList.style.display = 'none';
    
    friendsListContainer.addEventListener('click', e => {
      if (friendList.getElementsByTagName('li').length < 1) {
        return;
      }

      if (e.target.tagName === 'LI' && !userCardIsActive) {
        userCardIsActive = true;
        ipc.send('getUser', e.target.textContent);
      }

      if (friendList.style.display === 'none') {
        friendList.style.display = 'block';
      } else {
        friendList.style.display = 'none';
      }
    });
  }

  function animateUserCard() {
    let user = document.getElementsByClassName('user')[0];
    let title = document.getElementsByClassName('title')[0];
    let button = document.getElementsByClassName('button')[0];
    let container = document.getElementsByClassName('container')[0];

    title.style.display = 'none';
    user.style.display = 'block';
    setTimeout(() => {container.classList.toggle('expand')}, 400);
    
    button.addEventListener('click', hideUserCard);
  }

  function hideUserCard() {
    let user = document.getElementsByClassName('user')[0];
    let title = document.getElementsByClassName('title')[0];
    let container = document.getElementsByClassName('container')[0];

    if (!container.classList.contains('expand')) {
      return;
    }

    userCardIsActive = false;
    container.classList.toggle('expand');

    setTimeout(() => {
      user.style.display = 'none';
      title.style.display = 'block';
      form.style.display = 'block';
    }, 400);
  }

  function setPreviousNotifications(notifications) {
    Object.keys(notifications).forEach(notification => {
      if (notification === 'name') {
        return;
      }
      if (notification) {
        document.getElementsByName(notification)[1].checked = true;
      }
    });
  }

  function updateNotifications(username) {
    let data = getFormData('edit');

    data['name'] = username;
    ipc.send('updateUser', data);
  }

  function displayFormPartTwo() {
    formPartTwo.focus();
    formPartTwo.style.left = '35.5%';
    formPartOne.style.left = '-50%';
    formPartTwo.style.display = 'inline-block';

    formPartTwo.addEventListener('keyup', e => {
      if (e.keyCode !== 8) {
        return;
      }
      hideFormPartTwo();
    });
  }

  function hideFormPartTwo() {
    formPartOne.style.left = '33.5%';
    formPartTwo.style.left = '100%';
    formPartTwo.style.display = 'none';
  }

  function sendData() {
    let data = getFormData('notifications');

    if (inputField.value === '') {
      return;
    }
    inputField.value = '';
    ipc.send('valueReceived', data);
  }

  function getFormData(className) {
    let formData = {};
    let notifications = Array.from(document.getElementsByClassName(className));

    formData.name = inputField.value;

    notifications.forEach(notification => {
      if (notification.checked) {
        formData[notification.name] = true;
      }
    });
    return formData;
  }

  function resetForm() {
    formPartOne.style.left = '33%';
    formPartTwo.style.display = 'none';
    formPartTwo.style.left = '100%';
  }

  function displayToastMessage(message) {
    let toastNotification = document.createElement('div');
    let toastText = document.createTextNode(message);

    toastNotification.classList = 'toast peek';
    toastNotification.appendChild(toastText);
    document.body.appendChild(toastNotification);
  }

  function displayUsers(totalUsers, onlineUsers) {
    let oldUsers = new Set(previouslyReceivedUsers);
    let uniqueUsers = totalUsers.filter(x => !oldUsers.has(x));

    switch (true) {
      case (previouslyReceivedUsers.length < totalUsers.length):
        appendListItems(uniqueUsers, onlineUsers);
        break;
      case (previouslyReceivedUsers.length > totalUsers.length):
        removeListItems(totalUsers);
        break;
      default:
        updateOnlineIcon(onlineUsers);
        break;
    }
  }

  function appendListItems(totalUsers, onlineUsers) {
    let friendList = document.getElementsByClassName('friends-list')[0];

    totalUsers.forEach(user => {
      let li = document.createElement('li');
      let text = document.createTextNode(user);
      let span = document.createElement('span');

      onlineUsers.includes(user) ? span.classList.add('online') : span.classList.add('offline');
      li.appendChild(span);
      li.appendChild(text);
      friendList.appendChild(li);
    });
  }

  function removeListItems(users) {
    let friendList = document.getElementsByClassName('friends-list')[0];
    let deletedUsers = previousOnlineUsers.filter(x => !users.includes(x));

    if (users.length === 0) {
      while (friendList.firstChild) {
        friendList.removeChild(friendList.firstChild);
      }
      friendList.style.display = 'none';
      return;
    }

    deletedUsers.forEach(user => {
      let li = getListItemByContent(user);
      if (li) {
        friendList.removeChild(li);
      }
    });
  }

  function updateOnlineIcon(users) {
    let listItems = document.getElementsByClassName('friends-list')[0].getElementsByTagName('li');

    users.forEach(user => {
      for (let i = 0; i < listItems.length; i++) {
        let span = listItems[i].getElementsByTagName('span')[0];
        if (listItems[i].textContent === user && span.classList.contains('offline')) {
          span.classList.remove('offline');
          span.classList.add('online');
        }
      }
    });
  }

  function getListItemByContent(name) {
    let listItems = document.getElementsByClassName('friends-list')[0].getElementsByTagName('li');

    for (let i = 0; i < listItems.length; i++) {
      if (listItems[i].textContent === name) {
        return friendList.getElementsByTagName('li')[i];
      }
    }
    return null;
  }
}());