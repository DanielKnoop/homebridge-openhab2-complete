'use strict';

const {getState} = require('../../util/Util');
const {addNumericSensorCharacteristic} = require('./Numeric');
const {addBinarySensorCharacteristicWithTransformation} = require('./Binary');

const BATTERY_CONFIG = {
    batteryItem: "batteryItem",
    batteryItemThreshold: "batteryItemThreshold",
    batteryItemInverted: "batteryItemInverted",
    batteryItemChargingState: "batteryItemChargingState",
    batteryItemChargingStateInverted: "batteryItemChargingStateInverted"
};

// This function will try and add a battery warning characteristic to the provided service
function addBatteryWarningCharacteristic(service, optional) {
    try {
        let [batteryItem, batteryItemType] = this._getAndCheckItemType(BATTERY_CONFIG.batteryItem, ['Switch', 'Contact', 'Number']);
        let batteryTransformation;

        if(batteryItemType === "Number") {
            if(!(this._config[BATTERY_CONFIG.batteryItemThreshold])) {
                throw new Error(`Required ${BATTERY_CONFIG.batteryItemThreshold} for ${this.name} not defined: ${JSON.stringify(this._config)}`)
            } else {
                let threshold = parseInt(this._config[BATTERY_CONFIG.batteryItemThreshold]);
                this._log.debug(`Creating battery warning characteristic for ${this.name} with item ${batteryItem} and threshold set to ${threshold}`);

               batteryTransformation = function(val) {
                   return val < threshold ? 1 : 0;
               }
           }
        } else {
            let inverted = this._checkInvertedConf(BATTERY_CONFIG.batteryItemInverted);

            this._log.debug(`Creating battery warning characteristic for ${this.name} with item ${batteryItem} and inverted set to ${inverted}`);

            batteryTransformation = inverted ? {
                "OFF": 1,
                "ON": 0,
                "CLOSED": 1,
                "OPEN": 0
            } : {
                "OFF": 0,
                "ON": 1,
                "CLOSED": 0,
                "OPEN": 1
            };
        }

        service.getCharacteristic(this.Characteristic.StatusLowBattery)
            .on('get', getState.bind(this, batteryItem, batteryTransformation));

        this._subscribeCharacteristic(service.getCharacteristic(this.Characteristic.StatusLowBattery),
            batteryItem,
            batteryTransformation
        );
    } catch (e) {
        let msg = `Not configuring battery warning characteristic for ${this.name}: ${e.message}`;
        service.removeCharacteristic(this.Characteristic.StatusLowBattery);
        if(optional) {
            this._log.debug(msg);
        } else {
            throw new Error(msg);
        }
    }
}

function addBatteryLevelCharacteristic(service) {
    let batteryLevelCharacteristic = service.getCharacteristic(this.Characteristic.BatteryLevel);

    try {
        this._getAndCheckItemType(BATTERY_CONFIG.batteryItem, ['Number']);
        addNumericSensorCharacteristic.bind(this)(service,
            batteryLevelCharacteristic,
            {item: BATTERY_CONFIG.batteryItem}
        );
    } catch (e) {
        this._log.debug(`Not adding numeric battery level characteristic, adding default behaviour: ${e}`);

        batteryLevelCharacteristic.setProps({
            format: 'string'
        });
        batteryLevelCharacteristic.setValue("NA");
    }
}

function addChargingStateCharacteristic(service) {
    let NOT_CHARGING = 0;
    let CHARGING = 1;
    let NOT_CHARGEABLE = 2;

    let chargingStateCharacteristic = service.getCharacteristic(this.Characteristic.ChargingState);

    try {
        this._getAndCheckItemType(BATTERY_CONFIG.batteryItemChargingState, ['Contact', 'Switch']);
        let inverted = this._checkInvertedConf(BATTERY_CONFIG.batteryItemChargingStateInverted);
        let transformation = {
            "OFF": inverted ? CHARGING : NOT_CHARGING,
            "ON": inverted ? NOT_CHARGING : CHARGING,
            "CLOSED": inverted ? CHARGING : NOT_CHARGING,
            "OPEN": inverted ? NOT_CHARGING : CHARGING
        };
        addBinarySensorCharacteristicWithTransformation.bind(this)(service,
            chargingStateCharacteristic,
            {item: BATTERY_CONFIG.batteryItemChargingState, inverted: BATTERY_CONFIG.batteryItemChargingStateInverted},
            transformation
        );
    } catch (e) {
        this._log.debug(`Not adding charging state characteristic, adding default behaviour: ${e}`);
        chargingStateCharacteristic.setValue(NOT_CHARGEABLE);
    }
}

module.exports = {
    addBatteryWarningCharacteristic,
    addChargingStateCharacteristic,
    addBatteryLevelCharacteristic
};
