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
        console.log("[SSH] Connecting to",data.domain);
        await ssh.connect({
            host: data.domain,
            username: 'ubuntu',
            privateKey: path.normalize(process.env.SSH_CLIENT_KEY)
        });
        console.log("[SSH] Copying install files");
        await ssh.putDirectory(path.normalize('./modules/rk-client'), 'rk-client', {
                recursive: true,
                concurrency: 10
            });
        await ssh.exec('sudo', ['chmod', '+x', loc]);
        console.log("[SSH] Running the setup script");
        await ssh.exec('sudo', ['bash', loc, data.domain, data.dav_user, data.dav_pass]);
        console.log("[SSH] Rebooting");
        await ssh.exec('sudo', ['shutdown', '--reboot', 'now']);
        const reconnectLoop = async function (count, next) {
            try {
                console.log(`[SSH] Reconnecting: ${count} minutes`);
                await ssh.connect({
                    host: data.domain,
                    username: 'ubuntu',
                    privateKey: path.normalize(process.env.SSH_CLIENT_KEY)
                });
                next();
            } catch {
                setTimeout(() => {
                    reconnectLoop((count + 1),next);
                },60*1000);
            }
        }
        reconnectLoop(0, async () => {
            try {
                console.log("[SSH] Running docker-compose");
                await ssh.exec('sudo', ['docker-compose','-f','/home/ubuntu/rk-client/docker-compose.yml','up', '-d']);
            } catch (err) {
                console.log(err, err.stack);
            }
            
        })
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
