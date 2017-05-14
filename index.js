const fs = require('fs');
const clear = require('clear');
const inquirer = require('inquirer');
const requestify = require('requestify');

(function() {
  'use strict';
  clear();

  if (configFileExists()) {
    setInterval(function() {
      updateConfigInfo().then(checkForUpdatesWithAllUsers);
    }, 15000);
  }

  // promptForUserName(function() {
  //     getUserData(arguments[0].addFriend, saveNewUserData);
  // });

  function promptForUserName(callback) {
    let question = [
      {
        name: 'addFriend',
        type: 'input',
        message: 'Enter the name of the player you want to monitor:',
        validate: function (value) {
          if (value.length) {
            return true;
          } else {
            return 'Please enter a valid name';
          }
        }
      }
    ];

    inquirer.prompt(question).then(callback);
  }

  function getUserData(name, callback) {
    requestify.get(`https://api.tibiadata.com/v1/characters/${name}.json`).then(function (response) {
      callback(response.getBody());
    });
  }

  function saveNewUserData(user) {
    if (userNameExists(user.characters.data.name)) {
      console.log('This user has already been added');
      return;
    } else {
      saveAllUserData(user, undefined);
    }
  }

  function userNameExists(username) {
    let data;

    if (configFileExists()) {
      data = retrieveCurrentData();
    } else {
      return false;
    }

    try {
      return data[username] !== undefined;
    } catch (err) {
      console.log('There was an error reading the saved data');
    }
    return false;
  }

  function configFileExists() {
    if (fs.existsSync('./config.json')) {
      return true;
    }
    return false;
  }

  function retrieveCurrentData() {
    let data;

    try {
      if (configFileExists()) {
        data = fs.readFileSync('./config.json'); 
      } else {
        return {};
      }
    } catch (err) {
      console.log('There has been an error retrieving the saved data: ' + err);
      return;
    }
    return JSON.parse(data);
  }

  function saveAllUserData(user) {
    let savedData = retrieveCurrentData();
    let userData = JSON.stringify(user);
    savedData[user.characters.data.name] = userData;

    fs.writeFile('./config.json', JSON.stringify(savedData), function (err) {
      if (err) {
        console.log('There has been an error saving the saved data');
        console.log(err.message);
        return;
      }
      console.log('All user data saved successfully');
    });
  }


  function updateConfigInfo() {
    return new Promise(function(resolve, reject) {
      let data = retrieveCurrentData();

      for (let key in data) {
        setTimeout(getUserData(key, saveAllUserData), 1000);
      }
    });
  }

  function checkForUpdatesWithAllUsers() {
    let data = retrieveCurrentData();
    for (let key in data) {
      userIsOnline(key);
    }
  }

  function userIsOnline(username) {
    let userCharacterList = [];
    let data = retrieveCurrentData();
    let length = JSON.parse(data[username]).characters.other_characters.length;

    for (let i = 0; i < length; i++) {
      userCharacterList.push({
        name: JSON.parse(data[username]).characters.other_characters[i].name,
        status: JSON.parse(data[username]).characters.other_characters[i].status
      });
    }

    for (let i = 0; i < userCharacterList.length; i++) {
      if (userCharacterList[i].status === 'online') {
        console.log(`${userCharacterList[i].name} is online!`);
        return true;
      }
    }
    return false;
  }
}());