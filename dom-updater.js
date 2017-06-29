require('./renderer.js');

(function() {
  let receivedFirstData = false;
  let previousOnlineUsers = [];
  var ipc = require('electron').ipcRenderer;
  let form = document.getElementsByClassName('form')[0];
  let formPartOne = document.getElementsByClassName('part-one')[0];
  let formPartTwo = document.getElementsByClassName('part-two')[0];
  let friendList = document.getElementsByClassName('friends-list')[0];
  let inputField = document.getElementsByClassName('search-name')[0];
  let finishButton = document.getElementsByClassName('raised-button')[0];
  let numberOfUsers = document.getElementsByClassName('online-now-usercount')[0];
  let friendsListContainer = document.getElementsByClassName('online-now-box')[0];

  ipc.on('usersOnline',(event, data) => {
    if (!receivedFirstData && data.userNames) {
      displayOnlineUsers(data.userNames);
      previousOnlineUsers = data.userNames;
      receivedFirstData = true;
    } 
    if (!arraysAreEqual(previousOnlineUsers, data.userNames)) {
      displayOnlineUsers(data.userNames);
      previousOnlineUsers = data.userNames;
    }
    numberOfUsers.innerHTML = data.numberOfUsers;
  });

  ipc.on('setUser', (event, data) => {
    let userInfo = document.getElementsByClassName('user-info')[0];
    let notifications = document.getElementsByClassName('user-notifications')[0];

    form.style.display = 'none';
    userInfo.innerHTML = JSON.parse(data['user']).characters.data.name;
    animateUserCard();
  });

  friendList.style.display = 'none';
  displayOrHideFriendList(friendList);

  inputField.addEventListener('keypress', e => {
    if (e.keyCode !== 13) {
      return;
    }

    displayFormPartTwo();

    finishButton.addEventListener('click', function() {
      sendData();
      resetForm();
      displayToastMessage('User added');
    });
  });

  function displayOrHideFriendList(element) {
    friendsListContainer.addEventListener('click', e => {
      if (element.getElementsByTagName('li').length < 1) {
        return;
      }

      if (e.target.tagName === 'LI') {
        ipc.send('getUser', e.target.innerHTML);
      }


      if (element.style.display === 'none') {
        element.style.display = 'block';
      } else {
        element.style.display = 'none';
      }
    });
  }

  function animateUserCard() {
    let user = document.getElementsByClassName('user')[0];
    let title = document.getElementsByClassName('title')[0];
    let container = document.getElementsByClassName('container')[0];

    title.style.display = 'none';
    user.style.display = 'block';
    container.addEventListener('click', () => {
      container.classList.toggle('expand');
    });
  }

  function displayFormPartTwo() {
    formPartTwo.focus();
    formPartTwo.style.left = '35%';
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
    formPartOne.style.left = '33%';
    formPartTwo.style.left = '100%';
    formPartTwo.style.display = 'none';
  }

  function sendData() {
    let data = getFormData();
    if (inputField.value !== '') {
      inputField.value = '';
      ipc.send('valueReceived', data);
    }
  }

  function getFormData() {
    let formData = {};
    let notifications = Array.from(document.getElementsByClassName('notifications'));

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

  function arraysAreEqual(arr1, arr2) {
    if (arr1.length !== arr2.length) {
      return false;
    }

    for (let i = arr1.length; i--;) {
      if (arr1[i] !== arr2[i]) {
        return false;
      }
    }

    return true;
  }

  function displayOnlineUsers(users) {
    let oldUsers = new Set(previousOnlineUsers);
    let uniqueUsers = users.filter(x => !oldUsers.has(x));
    let friendList = document.getElementsByClassName('friends-list')[0];

    if (previousOnlineUsers.length < users.length) {
      appendListItems(uniqueUsers, friendList);
    } else if (previousOnlineUsers.length > users.length) {
      removeListItems(users, friendList);
    }
  }

  function appendListItems(userArray, parentNode) {
    userArray.forEach(user => {
      let li = document.createElement('li');
      let text = document.createTextNode(user);
      li.appendChild(text);
      parentNode.appendChild(li);
    });
  }

  function removeListItems(users, parentNode) {
    let obsoleteUsers = previousOnlineUsers.filter(x => !users.includes(x));

    if (users.length === 0) {
      while (friendList.firstChild) {
        friendList.removeChild(friendList.firstChild);
      }
      friendList.style.display = 'none';
      return;
    }

    obsoleteUsers.forEach(user => {
      let li = getListItemByContent(user);

      if (li) {
        friendList.removeChild(li);
      }
    });
  }

  function getListItemByContent(name) {
    let listItems = friendList.getElementsByTagName('li');

    for (let i = 0; i < listItems.length; i++) {
      if (listItems[i].innerHTML === name) {
        return friendList.getElementsByTagName('li')[i];
      }
    }
    return null;
  }
}());