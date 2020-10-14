const AWS = require('aws-sdk');
const { resolve } = require('path');
const { promise } = require('ping');
// Load credentials and set region from JSON file
// AWS.config.update({region: 'us-west-1'});
AWS.config.getCredentials((err) => {
    if (err) console.log(err.stack);
    // credentials not loaded
    else {
        console.log("Access key:", AWS.config.credentials.accessKeyId);
    }
});


function newEC2(callback) {

    // ami-0b606d7d59c68a5e0 is Ubuntu 20.04 x64
    const instanceParams = {
        ImageId: 'ami-0b606d7d59c68a5e0',
        InstanceType: 't3a.nano',
        KeyName: 'rk-client',
        SecurityGroups: [
            'rk-client'
        ],
        MinCount: 1,
        MaxCount: 1,

        TagSpecifications: [
            {
                ResourceType: "instance",
                Tags: [
                    {
                        Key: "Name",
                        Value: "rk_client"
                    }
                ]
            }
        ]
    };

    const instancePromise = new AWS.EC2({apiVersion: '2016-11-15'}).runInstances(instanceParams).promise();
    instancePromise.then((data) => {
            const instanceId = data.Instances[0].InstanceId;
            return callback(null, instanceId);
        }).catch((err) => {
            console.error(err, err.stack);
            return callback(err);
        });
}

const getIP = (instance_id) => {
    return new Promise( async (resolve, reject) => {
        try {
            const requestParams = {
                InstanceIds: [instance_id]
            };    
            const instancePromise = new AWS.EC2({apiVersion: '2016-11-15'}).describeInstances(requestParams).promise();
            let ipAddress;
            const ret = await instancePromise();
            ipAddress = ret.Reservations[0].Instances[0].PublicIpAddress;
            while (!ipAddress) {
                setTimeout(async () => {
                        const ret = await instancePromise();
                        ipAddress = ret.Reservations[0].Instances[0].PublicIpAddress;
                    }, 1000);
            }
            resolve(ipAddress);
        } catch (err) {
            reject(err);
        }
    })
}
    

const tagInstance = (instanceId, key, value) => {
    return new Promise((resolve, reject) => {
        tagParams = {Resources: [instanceId], Tags: [
            {
                Key: key,
                Value: value
            }
        ]};
        const tagPromise = new AWS.EC2({apiVersion: '2016-11-15'}).createTags(tagParams).promise();
        tagPromise
        .then(() => { resolve(); })
        .catch((err) => { reject(err); });
    })

}

module.exports.newEC2 = newEC2;
module.exports.getIP = getIP;
module.exports.tagInstance = tagInstance;