import { SonosDeviceManager } from '../helpers/sonosDeviceManager';
import { Express, Request, Response } from 'express';
import { SonosLogger } from '../helpers/sonosLogger';
import { DEFAULT_VOLUME_CHANGE } from '../models/constants';
import { DeviceDetails } from '../models/models';

export class VolumeEndpointsService {
    private app: Express;
    private modelName: string;
    private roomName: string;
    private device: SonosDeviceManager;
    private logger: SonosLogger;
    private defaultChange: number = DEFAULT_VOLUME_CHANGE;
    private port: number;

    constructor(expressApp: Express, deviceDetails: DeviceDetails, sonosDevice: SonosDeviceManager, logger: SonosLogger) {
        this.app = expressApp;
        this.roomName = deviceDetails.RoomName.replace(' ', '');
        this.modelName = deviceDetails.DisplayName.replace(' ', '');
        this.port = deviceDetails.VolumeExpressPort;
        this.device = sonosDevice;
        this.logger = logger;

        this.setupEndpoints();
    }

    setupEndpoints() {
        const deviceUri = this.roomName === this.modelName ? `/${this.roomName}` : `/${this.roomName}/${this.modelName}`;
        const upUri = `${deviceUri}/volume-up`;
        const downUri = `${deviceUri}/volume-down`;

        //Need this to tell the user where to point their buttons/shortcuts
        this.logger.logInfo(`Volume Endpoint listening on - {{YOUR_HOMEBRIDGE_ADDRESS}}:${this.port}${upUri}`);
        this.logger.logInfo(`Volume Endpoint listening on - {{YOUR_HOMEBRIDGE_ADDRESS}}:${this.port}${downUri}`);

        this.app.all(upUri, async (req: Request, res: Response) => {
            try {
                const increment = this.parseQueryParam(req.query.value as string);
                await this.device.volumeUp(increment);
                res.status(200).send(`Turning volume up by ${increment}`);
            } catch (error: any) {
                res.status(500).send(error.message);
            }
        });

        this.app.all(downUri, async (req: Request, res: Response) => {
            try {
                const decrement = this.parseQueryParam(req.query.value as string);
                await this.device.volumeDown(decrement);
                res.status(200).send(`Turning volume down by ${decrement}`);
            } catch (error: any) {
                res.status(500).send(error.message);
            }
        });
    }

    private parseQueryParam(param: string | undefined): number {
        if (param === undefined) return this.defaultChange;

        var toReturn = Number(param);

        if (Number.isNaN(toReturn)) throw Error('Please only pass numbers to the endpoint');

        if (toReturn < 1 || toReturn > 100) throw Error('Please only provide values between 1 & 100');

        return toReturn;
    }
}
