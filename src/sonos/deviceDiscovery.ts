import dgram, { Socket } from 'node:dgram';
import { ApiDeviceModel } from './models/apiDeviceModel';
import axios from 'axios';
import { SONOS_API_HEADERS } from '../models/constants';

export class DeviceDiscovery {
    multicastIpRange: string[];
    PLAYER_SEARCH: Buffer;
    socket: Socket;
    foundDeviceIps: string[] = [];

    constructor() {
        this.multicastIpRange = ['239.255.255.250', '255.255.255.255'];
        this.PLAYER_SEARCH = Buffer.from(
            ['M-SEARCH * HTTP/1.1', 'HOST: 239.255.255.250:1900', 'MAN: ssdp:discover', 'MX: 1', 'ST: urn:schemas-upnp-org:device:ZonePlayer:1'].join(
                '\r\n'
            )
        );
        this.socket = dgram.createSocket('udp4', (buffer, rinfo) => {
            var stringBuff = buffer.toString();
            if (stringBuff.match(/.+Sonos.+/)) {
                var addr = rinfo.address;
                this.foundDeviceIps.push(addr);
            }
        });
    }

    //TODO: Fix logging
    async discoverAllDevices(): Promise<ApiDeviceModel[]> {
        console.log('Getting device Ips');

        for (let ip of this.multicastIpRange) {
            this.socket.send(this.PLAYER_SEARCH, 0, this.PLAYER_SEARCH.length, 1900, ip, (error) => {
                if (error !== null) console.error(JSON.stringify(error));
            });
        }

        return new Promise((resolve, reject) => {
            setTimeout(async () => {
                this.socket.close();

                if (this.foundDeviceIps.length > 0) {
                    var devices: ApiDeviceModel[] = [];

                    for (let ip of this.foundDeviceIps) {
                        try {
                            var response = await axios.get<ApiDeviceModel>(`https:${ip}:1443/api/v1/players/local/info`, SONOS_API_HEADERS);
                            //TODO: Can you just edit the response.data obj directly?
                            var model = response.data;
                            model.device.ip = ip;
                            devices.push(model);
                        } catch (error: any) {
                            console.error(error.message);
                        }
                    }

                    resolve(devices);
                } else {
                    reject(new Error('No devices found'));
                }
            }, 5000);
        });
    }
}
