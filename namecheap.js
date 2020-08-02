var parser = require('xml2json');
var axios = require('axios');
var dotenv = require('dotenv');
dotenv.config();

//  GetHosts constructs an API call for host data and returns an array of JSON objects
function getHosts (next) {
    axios.get('https://api.namecheap.com/xml.response', {
        params: {
            ApiUser: process.env.NAMECHEAP_API_USER,
            ApiKey: process.env.NAMECHEAP_API_KEY,
            UserName: process.env.NAMECHEAP_API_USER,
            ClientIp: process.env.APP_IP,
            Command: 'namecheap.domains.dns.getHosts',
            SLD: process.env.APP_URL_SLD,
            TLD: process.env.APP_URL_TLD
        }
    })
        .then(function (response) {
            // handle success
            //console.log(response);
            var parsed = parser.toJson(response.data);
            parsed = JSON.parse(parsed);
            parsed = parsed.ApiResponse.CommandResponse.DomainDNSGetHostsResult.host;
            var output = [];
            for (var i = 0; i < parsed.length; i++) {
                var loop_out = {};
                loop_out.HostName = parsed[i].Name;
                loop_out.RecordType = parsed[i].Type;
                loop_out.Address = parsed[i].Address;
                loop_out.MXPref = parsed[i].MXPref;
                loop_out.TTL = parsed[i].TTL;
                output.push(loop_out);
            }
            next(null, output);
        })
        .catch(function (error) {
            // handle error
            console.log(error);
            next(error);
        })
        .then(function () {
            // always executed
        });
}

// addHost takes data from getHosts, adds a new host, builds a request, and sends it
function addHost (hostname, address, next) {
    getHosts(function (err, data) {
        var addon = {
            HostName: hostname,
            RecordType: 'A',
            Address: address,
            MXPref: '10',
            TTL: '60'
        };
    
        data.push(addon);
        
        var parameters = {
            ApiUser: process.env.NAMECHEAP_API_USER,
            ApiKey: process.env.NAMECHEAP_API_KEY,
            UserName: process.env.NAMECHEAP_API_USER,
            ClientIp: process.env.NAMECHEAP_CLIENT_IP,
            Command: 'namecheap.domains.dns.setHosts',
            SLD: process.env.NAMECHEAP_URL_SLD,
            TLD: process.env.NAMECHEAP_URL_TLD
        };

        for (var i = 0; i < data.length; i++) {
            parameters[['HostName',i].join('')] = data[i].HostName;
            parameters[['RecordType',i].join('')] = data[i].RecordType;
            parameters[['Address',i].join('')] = data[i].Address;
            parameters[['MXPref',i].join('')] = data[i].MXPref;
            parameters[['TTL',i].join('')] = data[i].TTL;    
        }
       
        axios.post('https://api.namecheap.com/xml.response', null, { params: parameters })
        .then(function (response) {
            var parsed = parser.toJson(response.data);
            parsed = JSON.parse(parsed);
            // console.log(parsed);
            return next(null, parsed);
        })
        .catch(function (error) {
            console.log(error)
            return next(err);
        });
    });
}
module.exports.getHosts = getHosts;
module.exports.addHost = addHost;
