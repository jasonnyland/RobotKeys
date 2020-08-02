var path = require('path')
var NodeSSH = require('node-ssh')
var ping = require('ping')
var ssh = new NodeSSH()
const loc = '/home/ubuntu/rk-client/setup.sh'
const server_user = 'ubuntu'

// // Sample structure for call
// var data = {
//     domain: [name, SLD, TLD].join('.'),
//     dav_user: 'user',
//     dav_pass: 'pass'
// }

dnsWatchdog(data.domain, function(){
    console.log("Watchdog ended, triggering sshPayload")
    sshPayload(data, function(){
        console.log("sshPayload has ended and triggered its callback")
    });
});

function sshPayload(data, next) {
    ssh.connect({
        host: data.domain,
        username: server_user,
        //update private keys location
        privateKey: path.normalize('./rk-client.pem')
    }).then(function(){
        ssh.putDirectory(path.normalize('./rk-client'), 'rk-client', {
            recursive: true,
            concurrency: 10
        })
        .then(function(){
            console.log("[SSH_PAYLOAD] Copied rk-client directory");
            ssh.exec('sudo', ['chmod', '+x', loc])
            .then(function(result){
                console.log("[SSH_PAYLOAD] chmod-ed the setup script");
                ssh.exec('sudo', ['bash', loc, data.domain, data.dav_user, data.dav_pass])
                .then(function(result){
                    console.log("[SSH_PAYLOAD] Bash script ended");
                    ssh.end();
                    next();
                }).catch(function(error){
                    console.log(error);
                });
            }).catch(function(error){
                console.log(error);
            });
        }).catch(function(error){
            console.log(error);
        });
    }).catch(function(error) {
        console.log(error);
    });
}



function dnsWatchdog(domain, next) {
    var host = domain;
    ping.sys.probe(host, function(isAlive) {
        if (isAlive) {
            console.log('[DNS_WATCHDOG]',domain,'is up.  Resuming next function.')
            next();
        } else {
            console.log('[DNS_WATCHDOG]',domain,'is down.  Checking again in 60 seconds.')
            setTimeout(() => {
                dnsWatchdog(domain, next);
            }, 60000);
        }
    });
}
module.exports.dnsWatchdog = dnsWatchdog;
module.exports.sshPayload = sshPayload;
