// Load the AWS SDK for Node.js
var AWS = require('aws-sdk');
// Load credentials and set region from JSON file
AWS.config.update({region: 'us-west-1'});
AWS.config.getCredentials(function(err) {
    if (err) console.log(err.stack);
    // credentials not loaded
    else {
        console.log("Access key:", AWS.config.credentials.accessKeyId);
    }
});
// // Sample call
// newEC2('zap', function(err,data) {
//     getIP(data, function(err,data) {
//         console.log("stack final output: ", data);
//     });
// });

function newEC2(subnet_name, callback) {

    // Create EC2 service object
    var ec2 = new AWS.EC2({apiVersion: '2016-11-15'});

    // ami-0b606d7d59c68a5e0 is Ubuntu 20.04 x64
    var instanceParams = {
        ImageId: 'ami-0b606d7d59c68a5e0',
        InstanceType: 't3a.nano',
        KeyName: 'rk-client',
        MinCount: 1,
        MaxCount: 1,
        NetworkInterfaces: [{
            DeviceIndex: 0,
            SubnetId: 'subnet-a28465f8',
            AssociatePublicIpAddress: true
        }],
        TagSpecifications: [
            {
                ResourceType: "instance",
                Tags: [
                    {
                        Key: "Name",
                        Value: subnet_name
                    }
                ]
            }
        ]
    };

    // Create a promise on an EC2 service object
    var instancePromise = new AWS.EC2({apiVersion: '2016-11-15'}).runInstances(instanceParams).promise();

    // Handle promise's fulfilled/rejected states
    instancePromise.then(
        function(data) {
            console.log(data);
            var instanceId = data.Instances[0].InstanceId;
            console.log("Created instance", instanceId);
            return callback(null, instanceId);
        }).catch(
        function(err) {
            console.error(err, err.stack);
            return callback(err);
        });
}

function getIP(instance_id, callback) {
    // Create EC2 service object
    var ec2 = new AWS.EC2({apiVersion: '2016-11-15'});
    var requestParams = {
        InstanceIds: [instance_id]
    };

    // Create a promise on an EC2 service object
    var instancePromise = new AWS.EC2({apiVersion: '2016-11-15'}).describeInstances(requestParams).promise();

    // Handle promise's fulfilled/rejected states
    instancePromise.then(
        function(data) {
            var ipAddress = data.Reservations[0].Instances[0].PublicIpAddress;
            if (ipAddress) {
                return callback(null, ipAddress);
            } else {
                console.log("no ip detected, waiting");
                setTimeout(() => {
                    getIP(instance_id, callback);
                }, 1000);
                //setTimeout(getIP(instance_id, callback()), 300);
            }

        }).catch(
        function(err) {
            console.error(err, err.stack);
            return callback(err);
        });
}