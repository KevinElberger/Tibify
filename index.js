var clear = require('clear');
var inquirer = require('inquirer');
var requestify = require('requestify');

clear();
promptForTibiaUserName(function() {
   getTibiaUserData(arguments[0].addFriend);
});

function promptForTibiaUserName(callback) {
    var question = [
        {
            name: 'addFriend',
            type: 'input',
            message: 'Enter the name of the player you want to monitor:',
            validate: function(value) {
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

function getTibiaUserData(name) {
    requestify.get('https://api.tibiadata.com/v1/characters/' + name + '.json').then(function(response) {
        console.log(response.getBody());
        return response.getBody();
    });
}