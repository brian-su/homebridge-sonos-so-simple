import { SonosDeviceManager } from '../helpers/sonosDeviceManager';
import { Express, Request, Response } from 'express';
import { SonosLogger } from '../helpers/sonosLogger';
import { DEFAULT_VOLUME_CHANGE } from '../models/constants';
import { DeviceDetails } from '../models/models';

export class ApiControlService {
    private app: Express;
    private modelName: string;
    private roomName: string;
    private device: SonosDeviceManager;
    private logger: SonosLogger;
    private defaultChange: number = DEFAULT_VOLUME_CHANGE;
    private port: number;

    private upUri: string;
    private downUri: string;
    private toggleMuteUri: string;
    private toggleSpeechEnhancementUri: string;
    private toggleNightModeUri: string;

    constructor(expressApp: Express, deviceDetails: DeviceDetails, sonosDevice: SonosDeviceManager, logger: SonosLogger) {
        this.app = expressApp;

        //Make the string URL compliant as per https://stackoverflow.com/a/8485137
        this.roomName = deviceDetails.RoomName.replace(/[^a-z0-9]/gi, '-').toLowerCase();
        this.modelName = deviceDetails.DisplayName.replace(/[^a-z0-9]/gi, '-').toLowerCase();
        this.port = deviceDetails.ExpressAppPort;
        this.device = sonosDevice;
        this.logger = logger;

        const deviceUri = this.roomName === this.modelName ? `/${this.roomName}` : `/${this.roomName}/${this.modelName}`;
        this.upUri = `${deviceUri}/volume-up`;
        this.downUri = `${deviceUri}/volume-down`;
        this.toggleMuteUri = `${deviceUri}/toggle-mute`;
        this.toggleSpeechEnhancementUri = `${deviceUri}/toggle-speech-enhancement`;
        this.toggleNightModeUri = `${deviceUri}/toggle-night-mode`;

        this.setupEndpoints();
        this.logEndpointUris();
    }

    setupEndpoints() {
        // Listening to all http verbs to make it easier incase a user sets things up wrong.
        this.app.all(this.upUri, async (req: Request, res: Response) => {
            try {
                const increment = this.parseQueryParam(req.query.value as string);
                await this.device.volumeUp(increment);
                res.status(200).send(`Turning volume up by ${increment}`);
            } catch (error: any) {
                res.status(500).send(error.message);
            }
        });

        this.app.all(this.downUri, async (req: Request, res: Response) => {
            try {
                const decrement = this.parseQueryParam(req.query.value as string);
                await this.device.volumeDown(decrement);
                res.status(200).send(`Turning volume down by ${decrement}`);
            } catch (error: any) {
                res.status(500).send(error.message);
            }
        });

        this.app.all(this.toggleMuteUri, async (req: Request, res: Response) => {
            try {
                var currentStatus = await this.device.getMuted();
                await this.device.setMuted(!currentStatus);
            } catch (error: any) {
                res.status(500).send(error.message);
            }
        });

        this.app.all(this.toggleNightModeUri, async (req: Request, res: Response) => {
            try {
                var currentStatus = await this.device.getNightMode();
                await this.device.setNightMode(!currentStatus);
            } catch (error: any) {
                res.status(500).send(error.message);
            }
        });

        this.app.all(this.toggleSpeechEnhancementUri, async (req: Request, res: Response) => {
            try {
                var currentStatus = await this.device.getSpeechEnhancement();
                await this.device.setSpeechEnhancement(!currentStatus);
            } catch (error: any) {
                res.status(500).send(error.message);
            }
        });
    }

    private logEndpointUris() {
        // Need this to tell the user where to point their buttons/shortcuts
        this.logger.logInfo(`Volume Up endpoint listening on - {{YOUR_HOMEBRIDGE_ADDRESS}}:${this.port}${this.upUri}`);
        this.logger.logInfo(`Volume Down endpoint listening on - {{YOUR_HOMEBRIDGE_ADDRESS}}:${this.port}${this.downUri}`);
        this.logger.logInfo(`Toggle Mute endpoint listening on - {{YOUR_HOMEBRIDGE_ADDRESS}}:${this.port}${this.toggleMuteUri}`);
        this.logger.logInfo(`Toggle Night Mode endpoint listening on - {{YOUR_HOMEBRIDGE_ADDRESS}}:${this.port}${this.toggleNightModeUri}`);
        this.logger.logInfo(
            `Toggle Speech Enhancement endpoint listening on - {{YOUR_HOMEBRIDGE_ADDRESS}}:${this.port}${this.toggleSpeechEnhancementUri}`
        );
    }

    private parseQueryParam(param: string | undefined): number {
        if (param === undefined) return this.defaultChange;

        var toReturn = Number(param);

        if (Number.isNaN(toReturn)) throw Error('Please only pass numbers to the endpoint');

        if (toReturn < 1 || toReturn > 100) throw Error('Please only provide values between 1 & 100');

        return toReturn;
    }
}
