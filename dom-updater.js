require('./renderer.js');

(function() {
  let receivedFirstData = false;
  let previousOnlineUsers = [];
  var ipc = require('electron').ipcRenderer;
  let formPartOne = document.getElementsByClassName('part-one')[0];
  let formPartTwo = document.getElementsByClassName('part-two')[0];
  let friendList = document.getElementsByClassName('friends-list')[0];
  let inputField = document.getElementsByClassName('search-name')[0];
  let finishButton = document.getElementsByClassName('raised-button')[0];
  let numberOfUsers = document.getElementsByClassName('online-now-usercount')[0];
  let friendsListContainer = document.getElementsByClassName('online-now-box')[0];

  ipc.on('usersOnline', function(event, data) {
    if (!receivedFirstData && data.userNames) {
      appendOnlineUsers(data.userNames);
      previousOnlineUsers = data.userNames;
      receivedFirstData = true;
    } else if (!arraysEqual(previousOnlineUsers, data.userNames)) {
      appendOnlineUsers(data.userNames);
      previousOnlineUsers = data.userNames;
    }
    numberOfUsers.innerHTML = data.numberOfUsers;
  });

  friendList.style.display = 'none';

  showOrHideFriendList(friendList);

  inputField.addEventListener('keypress', e => {
    if (e.keyCode !== 13) {
      return;
    }

    formPartTwo.focus();
    formPartTwo.style.left = '35%';
    formPartOne.style.left = '-50%';
    formPartTwo.style.display = 'inline-block';

    formPartTwo.addEventListener('keyup', e => {
      if (e.keyCode !== 8) {
        return;
      }
      formPartOne.style.left = '33%';
      formPartTwo.style.left = '100%';
      formPartTwo.style.display = 'none';
    });

    finishButton.addEventListener('click', function() {
      let data = getFormData();
      if (inputField.value !== '') {
        inputField.value = '';
        ipc.send('valueReceived', data);
        resetForm();
      }
    });
  });

  function showOrHideFriendList(element) {
    friendsListContainer.addEventListener('click', e => {
      if (element.getElementsByTagName('li').length < 1) {
        return;
      }

      if (element.style.display === 'none') {
        element.style.display = 'block';
      } else {
        element.style.display = 'none';
      }
    });
  }

  function arraysEqual(arr1, arr2) {
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

  function appendOnlineUsers(users) {
    let oldUsers = new Set(previousOnlineUsers);
    let uniqueUsers = users.filter(x => !oldUsers.has(x));
    let friendList = document.getElementsByClassName('friends-list')[0];

    if (previousOnlineUsers.length < users.length || !receivedFirstData) {
      appendListItems(uniqueUsers, friendList);
    } else if (previousOnlineUsers.length > users.length) {
      // TODO: use uniqueUsers to find & remove li with matching content
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

  function getFormData() {
    let formData = {};
    let notifications = document.getElementsByClassName('notifications');

    formData.name = inputField.value;
    for (let i = 0; i < notifications.length; i++) {
      if (notifications[i].checked) {
        formData[notifications[i].name] = true;
      }
    }
    return formData;
  }

  function resetForm() {
    let toastNotification = document.createElement('div');
    let toastText = document.createTextNode('User added');

    toastNotification.classList = 'toast peek';
    toastNotification.appendChild(toastText);
    document.body.appendChild(toastNotification);
    formPartOne.style.left = '33%';
    formPartTwo.style.display = 'none';
    formPartTwo.style.left = '100%';
  }
}());