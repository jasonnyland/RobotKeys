var parser = require('xml2json');
var axios = require('axios');
var dotenv = require('dotenv');
dotenv.config();

// addHost('bort','54.176.141.143',function (err, data){
// if (err) console.log('Call err: ', err);
// else console.log('Call data: ', data);
// });


//  GetHosts constructs an API call for host data and returns an array of JSON objects
function getHosts (next) {
    var params = {
        ApiUser: process.env.NAMECHEAP_API_USER,
        ApiKey: process.env.NAMECHEAP_API_KEY,
        UserName: process.env.NAMECHEAP_API_USER,
        ClientIp: process.env.APP_IP,
        Command: 'namecheap.domains.dns.getHosts',
        SLD: process.env.APP_URL_SLD,
        TLD: process.env.APP_URL_TLD
    }
    axios.post('https://api.namecheap.com/xml.response', null, { params: params })
        .then(function (response) {
            var parsed = parser.toJson(response.data);
            parsed = JSON.parse(parsed);
            //console.log(parsed.ApiResponse);
            if (parsed.ApiResponse.Status == 'ERROR') {
                // handle error
                console.log('[Namecheap API] getHosts Error:', parsed.ApiResponse.Errors.Error.$t);

            } else {
                console.log('[Namecheap API] getHosts:', parsed.ApiResponse.Status);
                // parse a good response
                var list = parsed.ApiResponse.CommandResponse.DomainDNSGetHostsResult.host;
                var output = [];
                for (var i = 0; i < list.length; i++) {
                    var loop_out = {};
                    loop_out.HostName = list[i].Name;
                    loop_out.RecordType = list[i].Type;
                    loop_out.Address = list[i].Address;
                    loop_out.MXPref = list[i].MXPref;
                    loop_out.TTL = list[i].TTL;
                    output.push(loop_out);
                }
                //console.log('[getHosts output]', output);
                return next(null, output);
            }
        })
        .catch(function (error) {
            // handle error
            console.log(error);
            return next(error);
        })
        .then(function () {
            // always executed
        });
}

// addHost takes data from getHosts, adds a new host, builds a request, and sends it
function addHost (hostname, address, next) {
    getHosts(function (err, data) {
        if (err) return next(err);
        else {
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
                ClientIp: process.env.APP_IP,
                Command: 'namecheap.domains.dns.setHosts',
                SLD: process.env.APP_URL_SLD,
                TLD: process.env.APP_URL_TLD
            };

            for (var i = 0; i < data.length; i++) {
                parameters[['HostName',i].join('')] = data[i].HostName;
                parameters[['RecordType',i].join('')] = data[i].RecordType;
                parameters[['Address',i].join('')] = data[i].Address;
                parameters[['MXPref',i].join('')] = data[i].MXPref;
                parameters[['TTL',i].join('')] = data[i].TTL;
            }
            //console.log('[addHost Request]', parameters)
            axios.post('https://api.namecheap.com/xml.response', null, { params: parameters })
                .then(function (response) {
                    var parsed = parser.toJson(response.data);
                    parsed = JSON.parse(parsed);
                    if (parsed.ApiResponse.Status == 'ERROR') {
                        // handle error
                        console.log('[Namecheap API] addHost Error:', parsed.ApiResponse.Errors.Error.$t);

                    } else {
                        console.log('[Namecheap API] addHost:', parsed.ApiResponse.Status);
                        var parsed = parser.toJson(response.data);
                        parsed = JSON.parse(parsed);
                        // console.log(parsed);
                        return next(null, parsed);
                    }
                })
                .catch(function (error) {
                    //console.log(error)
                    return next(err);
                });
        }});
}
module.exports.getHosts = getHosts;
module.exports.addHost = addHost;
