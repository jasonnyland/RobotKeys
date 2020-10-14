const User = require('../models/Users');
const ec2 = require('./ec2');
const namecheap = require('./namecheap');
const sshscript = require('./sshscript');

const requestSubdomain = (user, subdomain) => {
    return new Promise( async (resolve, reject) => {
        if (!user.instance) reject('User has no instance');
        if (await User.findOne({ subdomain })) reject('Subdomain is taken');
        const userEntry = await User.findOne({ _id: user._id });
        userEntry.subdomain = subdomain;
        userEntry.save();
        resolve(user.instance);
    })
}

const resolveUserInstanceIp = (user) => {
    return new Promise( async (resolve, reject) => {
        try {
            const userEntry = await User.findOne({ _id: user._id });
            userEntry.ip = await ec2.getIP(user.instance);
            userEntry.save();
            resolve(userEntry.ip);
        } catch (err) {
            reject(err);
        }
    })
}

module.exports.requestSubdomain = requestSubdomain;
module.exports.resolveUserInstanceIp = resolveUserInstanceIp;