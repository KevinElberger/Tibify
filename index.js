'use strict';
const fs = require('fs');
const clear = require('clear');
const inquirer = require('inquirer');
const requestify = require('requestify');

clear();
// userIsOnline('Arcie');
promptForUserName(function() {
    getUserData(arguments[0].addFriend);
});

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
  ]

  inquirer.prompt(question).then(callback);
}

function getUserData(name) {
  requestify.get(`https://api.tibiadata.com/v1/characters/${name}.json`).then(function (response) {
    saveUserData(response.getBody());
  });
}

function saveUserData(user) {
  let savedData;
  let userData = JSON.stringify(user);

  if (userNameExists(user.characters.data.name)) {
    console.log('This user has already been added');
    return;
  } else {
    savedData = retrieveCurrentData();
    savedData[user.characters.data.name] = userData;

    fs.writeFile('./config.json', JSON.stringify(savedData), function (err) {
      if (err) {
        console.log('There has been an error saving the saved data');
        console.log(err.message);
        return;
      }
      console.log('Configuration saved successfully');
    });
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
    return JSON.parse(data);
  } catch (err) {
    console.log('There has been an error retrieving the saved data: ' + err);
    return;
  }
  return data;
}

function userIsOnline(username) {
  let userCharacterList = [];
  let data = retrieveCurrentData();
  let length = JSON.parse(data[username]).characters.other_characters.length;

  for (var i = 0; i < length; i++) {
    userCharacterList.push({
      name: JSON.parse(data[username]).characters.other_characters[i].name,
      online: JSON.parse(data[username]).characters.other_characters[i].status
    });
  }

  for (var i = 0; i < userCharacterList.length; i++) {
    if (userCharacterList[i].name === username && userCharacterList[i].status === 'online') {
      return true;
    }
  }
  return false;
}