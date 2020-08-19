const path = require('path')
const NodeSSH = require('node-ssh')
const ping = require('ping')
const ssh = new NodeSSH()
const loc = '/home/ubuntu/rk-client/setup.sh'
const server_user = 'ubuntu'

// // Sample structure for call
// var data = {
//     domain: [name, SLD, TLD].join('.'),
//     dav_user: 'user',
//     dav_pass: 'pass'
// }
// // Sample call
// dnsWatchdog(data.domain, function(){
//     console.log("Watchdog ended, triggering sshPayload")
//     sshPayload(data, function(){
//         console.log("sshPayload has ended and triggered its callback")
//     });
// });

function sshPayload(data, next) {
    ssh.connect({
        host: data.domain,
        username: server_user,
        privateKey: path.normalize(process.env.SSH_CLIENT_KEY)
    }).then(() => {
        ssh.putDirectory(path.normalize('./rk-client'), 'rk-client', {
            recursive: true,
            concurrency: 10
        })
        .then(() => {
            console.log("[SSH] Copied install files");
            ssh.exec('sudo', ['chmod', '+x', loc])
            .then(() => {
                console.log("[SSH] chmod setup script");
                ssh.exec('sudo', ['bash', loc, data.domain, data.dav_user, data.dav_pass])
                .then(() => {
                    console.log("[SSH_PAYLOAD] Bash script ended OMFGGGGGGGGGGGGG!!!!!!!!!!!!");
                    ssh.end();
                    next();
                }).catch((err) => {
                    console.log(err);
                });
            }).catch((err) => {
                console.log(err);
            });
        }).catch((err) => {
            console.log(err);
        });
    }).catch((err) => {
        console.log(err);
    });
}

function dnsWatchdog(domain, mins, next) {
    ping.sys.probe(domain, (isAlive) => {
        if (isAlive) {
            console.log('[DNS_WATCHDOG]',domain,'is up.')
            return next();
        } else {
            console.log('[DNS_WATCHDOG]',domain,'is down',mins,'minutes')
            setTimeout(() => {
                dnsWatchdog(domain, (mins + 1), next);
            }, 60000);
        }
    });
}

module.exports.dnsWatchdog = dnsWatchdog;
module.exports.sshPayload = sshPayload;
