'use strict';

const url = require('url');
const request = require('request');

class HTTPHandler {

    constructor(hostname, port, log) {
        this._log = log;
        this._url = new URL(hostname);
        if(port === undefined) {
            this._log(`Using non-standart port ${port}`);
            this._url.port = port
        }
    }

    getRequest(habItem, callback) {
        this._url.pathname = '/rest/items/' + habItem + '/state';
        request({
                url: this._url.href,
                method: 'GET'
            },
            function (error, response, body) {
                callback(error, response, body)
        })
    }

}

module.exports = HTTPHandler;