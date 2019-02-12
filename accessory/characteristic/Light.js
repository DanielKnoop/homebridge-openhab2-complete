
const {addSetAndCommitCharacteristic} = require('./SetAndCommit');

function addLightOnCharacteristic(service) {
    addSetAndCommitCharacteristic.bind(this)(
        service.getCharacteristic(this.Characteristic.On),
        'binary',
        ['Switch', 'Dimmer', 'Color'],
        _transformation,
        _commitFunction
    )
}

function addHueCharacteristic(service) {
    addSetAndCommitCharacteristic.bind(this)(
        service.getCharacteristic(this.Characteristic.Hue),
        'hue',
        ['Switch', 'Dimmer', 'Color'],
        _transformation,
        _commitFunction
    )
}

function addSaturationCharacteristic(service) {
    addSetAndCommitCharacteristic.bind(this)(
        service.getCharacteristic(this.Characteristic.Saturation),
        'saturation',
        ['Switch', 'Dimmer', 'Color'],
        _transformation,
        _commitFunction
    )
}

function addBrightnessCharacteristic(service) {
    addSetAndCommitCharacteristic.bind(this)(
        service.getCharacteristic(this.Characteristic.Brightness),
        'brightness',
        ['Switch', 'Dimmer', 'Color'],
        _transformation,
        _commitFunction
    )
}

function _commitFunction(item) {
    this._stateLock = true;
    let command;
    if(this._newState["brightness"] === undefined && this._newState["hue"] === undefined && this._newState["saturation"] === undefined) {           // Only binary set
        if(this._newState["binary"] === undefined) {
            command = new Error("Race condition! Commit was called before set!")
        } else {
            command = this._newState["binary"] ? "ON" : "OFF";
        }
    } else if(this._newState["hue"] === undefined && this._newState["saturation"] === undefined) {                                                  // Only brightness set
        if (this._newState["brightness"] === undefined) {
            command = new Error("Race condition! Commit was called before set!");
        } else {
            command = `${this._newState["brightness"] === 100 ? 99 : this._newState["brightness"]}`;
        }
    } else {                                                                                                                                         // Either hue, brightness and/or saturation set, therefore we need to send a tuple
        if(this._newState["hue"] !== undefined && this._newState["brightness"] !== undefined && this._newState["saturation"] !== undefined) {        // All states set, no need to get missing information
            command = `${this._newState["hue"]},${this._newState["saturation"]},${this._newState["brightness"]}`;
        } else {                                                                                                                                     // Not all states set , therefore we need to get the current state, in order to get the complete tuple
            let state = this._openHAB.getStateSync(item);
            if (!(state)) {
                command = new Error("Unable to retrieve current state");
            } else if (state instanceof Error) {
                command = state;
            } else {
                let splitState = state.split(",");
                command = `${this._newState["hue"] === undefined ? splitState[0] : this._newState["hue"]},\
                        ${this._newState["saturation"] === undefined ? splitState[1] : this._newState["saturation"]},\
                        ${this._newState["brightness"] === undefined ? splitState[2] : this._newState["brightness"]}`.replace(/\s*/g, "");
            }
        }
    }
    return command;
}

// characteristic
function _transformation(stateType, itemType, state) {
    switch (stateType) {
        case "binary": // expects true or false
            if (itemType === "Switch") {
                return state === "ON";
            } else if (itemType === "Dimmer") {
                return parseInt(state) > 0;
            } else if (itemType === "Color") {
                return parseInt(state.split(",")[2]) > 0;
            } else {
                return new Error(`Unable to parse binary state: ${state}`);
            }
        case "hue": // expects number and only called by color types
            if (itemType === "Color") {
                return parseInt(state.split(",")[0]);
            } else {
                return new Error(`Unable to parse hue state: ${state}`);
            }
        case "saturation": // expects number and only called by color types
            if (itemType === "Color") {
                return parseInt(state.split(",")[1]);
            } else {
                return new Error(`Unable to parse saturation state: ${state}`);
            }
        case "brightness": // expects number and only called by dimmer or color types
            if (itemType === "Dimmer") {
                return parseInt(state) === 99 ? 100 : state;                                              // For some reasons openHAB does not report 100
            } else if (itemType === "Color") {
                return parseInt(state.split(",")[2]) === 99 ? 100 : parseInt(state.split(",")[2]);        // For some reasons openHAB does not report 100
            } else {
                return new Error(`Unable to parse brightness state: ${state}`);
            }
        default:
            return new Error(`${stateType} unknown`);
    }
}

module.exports = {addLightOnCharacteristic, addHueCharacteristic, addSaturationCharacteristic, addBrightnessCharacteristic};