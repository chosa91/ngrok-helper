"use strict"

const _ = require('lodash')
const http = require('http')
const EventEmitter = require('events');

let defaultConfig = {
    host : 'localhost',
    path : '/api/tunnels'
}

class NGrokURLFinder {
    constructor (host = defaultConfig.host, path = defaultConfig.path) {
        this.host = host
        this.path = path
        this.emitter = new EventEmitter()
    }

    findUrlForPortInRange (port = 0, startPort = 4040, endPort = 4050) {
        let range = _.range(startPort, endPort, 1)

        this.emitter.once('done', (data) => {
            this.emitter.emit('result', data)
        })
        this._findPortInRange(port, range)
        return this.emitter
    }
    
    _findPortInRange (port = 0, portRange = []) {
        if (_.isEmpty(portRange)) {
            return this.emitter.emit('done', {
                success : false,
                data : null,
                description: 'out of range'
            })
        }

        this._gatherInfoUnderPort(portRange[0])
        .then(data => {
            if (data && data.config && data.config.addr && _.endsWith(data.config.addr, String(port))) {
                return this.emitter.emit('done', {
                    success : true,
                    data : data
                })
            } else {
                portRange.shift()
                this._findPortInRange(port, portRange)
            }
        })
        .catch(err => {
            portRange.shift()
            this._findPortInRange(port, portRange)
        })
    }

    _gatherInfoUnderPort (port) {
       return new Promise((resolve, reject) => {
            this._getJSON(port)
            .then((json) => {
                if (json && json.tunnels) {
                    let tunnel = json.tunnels[0]
                    return resolve(tunnel)
                }
                return reject()
            })
            .catch(reject)
        })
    }

    _getJSON(port) {
        let options = {
            host: this.host,
            port: port,
            path: this.path,
            headers: {
                'Content-Type' : 'application/json'
            }
        }

        return new Promise((resolve, reject) => {
            http.get(options, (res) => {
                var bodyChunks = []
                res.on('data', chunk => {
                    bodyChunks.push(chunk)
                }).on('end', () => {
                    let buff = Buffer.concat(bodyChunks)
                    let body = JSON.parse(buff.toString())
                    resolve(body)
                })
            }).on('error', reject)
        })
    }

}

// finder.findUrlForPortInRange(3003, 4040, 4050).on('result', (data) => {
//     console.log("res", data)
// })

module.exports = NGrokURLFinder
