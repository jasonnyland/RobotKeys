const xmlParser = require('xml2json');
const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();

/*
Notes:
 - Namecheap API returns XML
 - Namecheap API does not have functionality to add a single DNS entry
    - To add an entry, we need to get a list of existing entries and reconstruct it while adding the new entry
*/

//  GetHosts constructs an API call for host data and returns an array of JSON objects
function getHosts (next) {
    const params = {
        ApiUser: process.env.NAMECHEAP_API_USER,
        ApiKey: process.env.NAMECHEAP_API_KEY,
        UserName: process.env.NAMECHEAP_API_USER,
        ClientIp: process.env.APP_IP,
        Command: 'namecheap.domains.dns.getHosts',
        SLD: process.env.APP_URL_SLD,
        TLD: process.env.APP_URL_TLD
    }
    axios.post('https://api.namecheap.com/xml.response', null, { params: params })
        .then((res) => {
            let parsed = xmlParser.toJson(res.data);
            parsed = JSON.parse(parsed);
            if (parsed.ApiResponse.Status === 'ERROR') {
                console.log('[Namecheap API] getHosts Error:', parsed.ApiResponse.Errors.Error.$t);

            } else {
                console.log('[Namecheap API] getHosts:', parsed.ApiResponse.Status);
                const list = parsed.ApiResponse.CommandResponse.DomainDNSGetHostsResult.host;
                let output = [];
                for (let i = 0; i < list.length; i++) {
                    let loop_out = {};
                    loop_out.HostName = list[i].Name;
                    loop_out.RecordType = list[i].Type;
                    loop_out.Address = list[i].Address;
                    loop_out.MXPref = list[i].MXPref;
                    loop_out.TTL = list[i].TTL;
                    output.push(loop_out);
                }
                return next(null, output);
            }
        })
        .catch((err) => {
            console.log(err);
            return next(err);
        })
        .then(() => {
            // always executed
        });
}

// addHost takes data from getHosts, adds a new host, builds a request, and sends it
function addHost (hostname, address, next) {
    getHosts((err, data) => {
        if (err) return next(err);
        else {
            const addon = {
                HostName: hostname,
                RecordType: 'A',
                Address: address,
                MXPref: '10',
                TTL: '60'
            };

            data.push(addon);

            let parameters = {
                ApiUser: process.env.NAMECHEAP_API_USER,
                ApiKey: process.env.NAMECHEAP_API_KEY,
                UserName: process.env.NAMECHEAP_API_USER,
                ClientIp: process.env.APP_IP,
                Command: 'namecheap.domains.dns.setHosts',
                SLD: process.env.APP_URL_SLD,
                TLD: process.env.APP_URL_TLD
            };

            for (let i = 0; i < data.length; i++) {
                parameters[['HostName',i].join('')] = data[i].HostName;
                parameters[['RecordType',i].join('')] = data[i].RecordType;
                parameters[['Address',i].join('')] = data[i].Address;
                parameters[['MXPref',i].join('')] = data[i].MXPref;
                parameters[['TTL',i].join('')] = data[i].TTL;
            }

            axios.post('https://api.namecheap.com/xml.response', null, { params: parameters })
                .then((res) => {
                    let parsed = xmlParser.toJson(res.data);
                    parsed = JSON.parse(parsed);
                    if (parsed.ApiResponse.Status === 'ERROR') {
                        console.log('[Namecheap API] addHost Error:', parsed.ApiResponse.Errors.Error.$t);

                    } else {
                        console.log('[Namecheap API] addHost:', parsed.ApiResponse.Status);
                        // let parsed = xmlParser.toJson(res.data);
                        // parsed = JSON.parse(parsed);
                        return next(null, parsed);
                    }
                })
                .catch((err) => {
                    return next(err);
                });
        }});
}
module.exports.getHosts = getHosts;
module.exports.addHost = addHost;
