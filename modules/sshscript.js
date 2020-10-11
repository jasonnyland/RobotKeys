const path = require('path')
const NodeSSH = require('node-ssh')
const ping = require('ping')
const ssh = new NodeSSH()
const loc = '/home/ubuntu/rk-client/setup.sh'

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

async function sshPayload(data, next) {  
    try {
        console.log("SSH connecting to",data.domain);
        await ssh.connect({
            host: data.domain,
            username: 'ubuntu',
            privateKey: path.normalize(process.env.SSH_CLIENT_KEY)
        });
        await ssh.putDirectory(path.normalize('./modules/rk-client'), 'rk-client', {
                recursive: true,
                concurrency: 10
            });
        console.log("[SSH] Copied install files");
        await ssh.exec('sudo', ['chmod', '+x', loc]);
        console.log("[SSH] chmod setup script");
        await ssh.exec('sudo', ['bash', loc, data.domain, data.dav_user, data.dav_pass]);
        console.log("[SSH_PAYLOAD] Bash script end");
        return next();
    } catch (err) {
        console.log(err);
    }
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
